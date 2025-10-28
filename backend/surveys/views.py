from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import mimetypes
from pathlib import Path
from rest_framework.parsers import MultiPartParser, FormParser
import hashlib
import os
from django.http import HttpResponse
try:
    import ipfshttpclient  # type: ignore
except Exception:  # pragma: no cover
    ipfshttpclient = None  # type: ignore

from .models import Survey
from .serializers import SurveySerializer
from users.models import Profile
from transactions.models import Transaction
try:
    from smartcontracts.eth import record_submission as eth_record_submission, mark_approved as eth_mark_approved, mark_rejected as eth_mark_rejected
except Exception:  # pragma: no cover - optional integration
    eth_record_submission = eth_mark_approved = eth_mark_rejected = None


class SurveyViewSet(viewsets.ModelViewSet):
    queryset = Survey.objects.select_related("project", "submitted_by").all()
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        try:
            role = user.profile.role  # type: ignore[attr-defined]
        except Profile.DoesNotExist:
            role = None

        base = Survey.objects.select_related("project", "submitted_by")
        if user.is_superuser or user.is_staff or role in ("admin", "manager"):
            return base
        if role == "client":
            return base.filter(status="approved")
        # default: surveyor sees own submissions only
        return base.filter(submitted_by=user)

    def perform_create(self, serializer):
        upload = self.request.FILES.get("file")
        file_mime = None
        file_ext = None
        computed_checksum = None
        if upload is not None:
            # Guess using filename; browsers may include content_type but rely on path for consistency
            guessed, _ = mimetypes.guess_type(upload.name)
            file_mime = guessed or getattr(upload, "content_type", "") or ""
            file_ext = Path(upload.name).suffix.lstrip(".").lower()
            # Compute SHA-256 of the uploaded file contents
            sha = hashlib.sha256()
            try:
                for chunk in upload.chunks():  # type: ignore[attr-defined]
                    if chunk:
                        sha.update(chunk)
                computed_checksum = sha.hexdigest()
            except Exception:
                try:
                    data = upload.read()
                    if data:
                        sha.update(data)
                    computed_checksum = sha.hexdigest()
                except Exception:
                    computed_checksum = None
        survey = serializer.save(
            submitted_by=self.request.user,
            file_mime_type=file_mime or "",
            file_ext=file_ext or "",
            **({"checksum_sha256": computed_checksum} if computed_checksum else {}),
        )
        # Try to upload to IPFS and set CID
        if ipfshttpclient is not None and getattr(survey, "file", None):
            try:
                api_url = os.getenv("IPFS_API_URL", "/dns/127.0.0.1/tcp/5001/http")
                client = ipfshttpclient.connect(api_url)  # type: ignore[attr-defined]
                f = survey.file
                path = getattr(f, "path", None)
                if path:
                    res = client.add(path, cid_version=1)  # type: ignore[call-arg]
                else:
                    data = f.read()
                    res = client.add_bytes(data)  # type: ignore[assignment]
                    # add_bytes returns CID string directly in some versions
                    if isinstance(res, (bytes, str)):
                        survey.ipfs_cid = res.decode() if isinstance(res, bytes) else str(res)
                        survey.save(update_fields=["ipfs_cid", "updated_at"])
                        res = None
                if isinstance(res, dict) and res.get("Hash"):
                    survey.ipfs_cid = res["Hash"]
                    survey.save(update_fields=["ipfs_cid", "updated_at"])
            except Exception:
                pass
        # Optional: write to Ethereum and store tx (unless skip_chain requested)
        # Only managers/admins can submit to chain from backend
        user = self.request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        is_manager = bool(user.is_staff or user.is_superuser or role in ("admin", "manager"))
        # Collect any extra files for per-file hashing
        extra_files = []
        try:
            extra_files = list(self.request.FILES.getlist("extra_files")) + list(self.request.FILES.getlist("extra_files[]"))
        except Exception:
            extra_files = []
        extra_hashes = []
        for ef in extra_files:
            try:
                sha_e = hashlib.sha256()
                for chunk in ef.chunks():  # type: ignore[attr-defined]
                    if chunk:
                        sha_e.update(chunk)
                extra_hashes.append(sha_e.hexdigest())
            except Exception:
                try:
                    data = ef.read()
                    if data:
                        sha_e = hashlib.sha256()
                        sha_e.update(data)
                        extra_hashes.append(sha_e.hexdigest())
                except Exception:
                    pass

        skip_chain = False
        try:
            q = self.request.query_params
            h = self.request.headers
            skip_chain = (str(q.get("skip_chain", "")).lower() in ("1", "true", "yes")) or (
                str(h.get("X-Skip-Chain", "")).lower() in ("1", "true", "yes")
            )
        except Exception:
            skip_chain = False
        if eth_record_submission is not None and is_manager and not skip_chain:
            try:
                txh, blk = eth_record_submission(survey.id, survey.project_id, survey.ipfs_cid, survey.checksum_sha256)
                Transaction.objects.create(
                    survey=survey,
                    public_anchor_tx_hash=txh,
                    public_block_number=blk,
                    private_tx_hash=txh,  # fallback for compatibility
                )
                # Also attach the file hash(es) to the per-survey list (best-effort)
                try:
                    from smartcontracts.eth import add_file_hash as eth_add_file_hash  # local import to avoid optionality issues
                    if survey.checksum_sha256:
                        txh2, blk2 = eth_add_file_hash(survey.id, survey.checksum_sha256)
                        Transaction.objects.create(
                            survey=survey,
                            public_anchor_tx_hash=txh2,
                            public_block_number=blk2,
                            private_tx_hash=txh2,
                        )
                    for hx in extra_hashes:
                        try:
                            txh3, blk3 = eth_add_file_hash(survey.id, hx)
                            Transaction.objects.create(
                                survey=survey,
                                public_anchor_tx_hash=txh3,
                                public_block_number=blk3,
                                private_tx_hash=txh3,
                            )
                        except Exception:
                            pass
                except Exception:
                    pass
            except Exception:
                # Do not block normal flow if chain is misconfigured
                pass

    @action(detail=True, methods=["post"], url_path="record-chain")
    def record_chain(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        if eth_record_submission is None:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        # Guard: disallow if already anchored or recorded
        try:
            from smartcontracts.eth import get_file_chunk_count as eth_get_count
            cnt = eth_get_count(survey.id)
            if cnt and int(cnt) > 0:
                return Response({"detail": "Full file already anchored on-chain"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass
        try:
            from smartcontracts.eth import get_onchain_record as eth_get_onchain_record
            rec = eth_get_onchain_record(survey.id)
            if rec and rec.get("submitter") and str(rec.get("submitter")).lower() != "0x0000000000000000000000000000000000000000":
                return Response({"detail": "Submission already recorded on-chain"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass
        tx_hashes = []
        try:
            txh, blk = eth_record_submission(survey.id, survey.project_id, survey.ipfs_cid or "", survey.checksum_sha256 or "")
            tx_hashes.append(txh)
            Transaction.objects.create(
                survey=survey,
                public_anchor_tx_hash=txh,
                public_block_number=blk,
                private_tx_hash=txh,
            )
            # Best-effort: also attach primary file hash if present
            try:
                from smartcontracts.eth import add_file_hash as eth_add_file_hash
                if survey.checksum_sha256:
                    txh2, blk2 = eth_add_file_hash(survey.id, survey.checksum_sha256)
                    tx_hashes.append(txh2)
                    Transaction.objects.create(
                        survey=survey,
                        public_anchor_tx_hash=txh2,
                        public_block_number=blk2,
                        private_tx_hash=txh2,
                    )
            except Exception:
                pass
        except Exception as e:
            return Response({"detail": f"On-chain submit failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"transactions": tx_hashes})

    @action(detail=True, methods=["post"], url_path="anchor-file")
    def anchor_file(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        # Guard: disallow if already anchored
        try:
            from smartcontracts.eth import get_file_chunk_count as eth_get_count
            cnt = eth_get_count(survey.id)
            if cnt and int(cnt) > 0:
                return Response({"detail": "Full file already anchored on-chain"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass
        if not getattr(survey, "file", None):
            return Response({"detail": "No file uploaded for this survey"}, status=status.HTTP_400_BAD_REQUEST)
        # Read file bytes and chunk (raw)
        try:
            f = survey.file
            path = getattr(f, "path", None)
            try:
                CHUNK = int(os.getenv("RAW_CHUNK_KB", "24")) * 1024
            except Exception:
                CHUNK = 24 * 1024
            chunks: list[bytes] = []
            if path:
                with open(path, "rb") as fh:
                    while True:
                        b = fh.read(CHUNK)
                        if not b:
                            break
                        chunks.append(b)
            else:
                data = f.read()
                for i in range(0, len(data), CHUNK):
                    chunks.append(data[i:i+CHUNK])
        except Exception:
            return Response({"detail": "Failed to read file"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Submit raw chunks on-chain (private chain)
        try:
            from smartcontracts.eth import add_file_chunks as eth_add_file_chunks
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        tx_hashes = []
        # Ensure the survey exists on-chain first
        try:
            if eth_record_submission is not None:
                try:
                    tx0, blk0 = eth_record_submission(survey.id, survey.project_id, survey.ipfs_cid or "", survey.checksum_sha256 or "")
                    Transaction.objects.create(
                        survey=survey,
                        public_anchor_tx_hash=tx0,
                        public_block_number=blk0,
                        private_tx_hash=tx0,
                    )
                except Exception:
                    pass
        except Exception:
            pass
        # Batch writes
        try:
            MAX_PER_TX = int(os.getenv("MAX_PAYLOADS_PER_TX", "1") or 1)
            if MAX_PER_TX <= 0:
                MAX_PER_TX = 1
        except Exception:
            MAX_PER_TX = 1
        try:
            if chunks:
                for i in range(0, len(chunks), MAX_PER_TX):
                    batch = chunks[i:i+MAX_PER_TX]
                    txh, blk = eth_add_file_chunks(survey.id, batch)
                    tx_hashes.append(txh)
                    Transaction.objects.create(
                        survey=survey,
                        public_anchor_tx_hash=txh,
                        public_block_number=blk,
                        private_tx_hash=txh,
                    )
        except Exception as e:
            return Response({"detail": f"On-chain storage failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "anchored_chunks": len(chunks),
            "transactions": tx_hashes,
            "mode": "raw",
            "chunk_size": CHUNK,
        })

    @action(detail=True, methods=["get"], url_path="chunks")
    def list_chunks(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        try:
            from smartcontracts.eth import get_file_chunk_count as eth_get_count
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            total = eth_get_count(survey.id)
        except Exception as e:
            return Response({"detail": f"Failed to read chunk count: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"count": int(total)})

    @action(detail=True, methods=["get"], url_path=r"chunks/(?P<index>\d+)/download")
    def download_chunk(self, request, pk=None, index: str = "0"):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        try:
            idx = int(index)
        except Exception:
            return Response({"detail": "Invalid chunk index"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from smartcontracts.eth import get_file_chunk_count as eth_get_count, read_file_chunk as eth_get_chunk
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            total = eth_get_count(survey.id)
            if idx < 0 or idx >= int(total):
                return Response({"detail": "Chunk index out of range"}, status=status.HTTP_400_BAD_REQUEST)
            payload = eth_get_chunk(survey.id, idx)
            if not payload:
                return Response({"detail": "Empty chunk"}, status=status.HTTP_502_BAD_GATEWAY)
            resp = HttpResponse(payload, content_type="application/octet-stream")
            resp["Content-Disposition"] = f"attachment; filename=chunk_{survey.id}_{idx}.bin"
            return resp
        except Exception as e:
            return Response({"detail": f"Failed to read chunk: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path="onchain-record")
    def onchain_record(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        try:
            from smartcontracts.eth import get_onchain_record as eth_get_onchain_record
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            rec = eth_get_onchain_record(survey.id)
        except Exception as e:
            return Response({"detail": f"Failed to read on-chain record: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        if not rec or not rec.get("submitter") or str(rec.get("submitter")).lower() == "0x0000000000000000000000000000000000000000":
            return Response({"detail": "No on-chain record for this survey"}, status=status.HTTP_404_NOT_FOUND)
        # Map status code to name
        status_map = {0: "None", 1: "Submitted", 2: "Approved", 3: "Rejected"}
        try:
            code = int(rec.get("status"))
        except Exception:
            code = None
        rec["status_name"] = status_map.get(code, None)
        # Optionally force download
        download = str(request.query_params.get("download", "")).lower() in ("1", "true", "yes")
        resp = Response(rec)
        if download:
            resp["Content-Disposition"] = f"attachment; filename=onchain_record_{survey.id}.json"
        return resp

    @action(detail=True, methods=["post"], url_path="recover-file")
    def recover_file(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        # Read raw chunks from chain and reassemble
        try:
            from smartcontracts.eth import get_file_chunk_count as eth_get_count, read_file_chunk as eth_get_chunk
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            total = eth_get_count(survey.id)
        except Exception as e:
            return Response({"detail": f"Failed to read chunk count: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        if total <= 0:
            return Response({"detail": "No on-chain chunks found for this survey"}, status=status.HTTP_400_BAD_REQUEST)
        # Reassemble
        try:
            from django.core.files.base import ContentFile
        except Exception:
            return Response({"detail": "Django file system unavailable"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            parts: list[bytes] = []
            for i in range(total):
                payload = eth_get_chunk(survey.id, i)
                if not payload:
                    return Response({"detail": f"Invalid payload at chunk {i}"}, status=status.HTTP_502_BAD_GATEWAY)
                parts.append(payload)
            data = b"".join(parts)
            ext = survey.file_ext or "bin"
            name = f"recovered_{survey.id}.{ext}"
            survey.recovered_file.save(name, ContentFile(data), save=True)
            return Response({"recovered_bytes": len(data), "stored": True, "download_url": survey.recovered_file.url if getattr(survey.recovered_file, "url", None) else None})
        except Exception as e:
            return Response({"detail": f"Recovery failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        if survey.status != "submitted":
            return Response({"detail": f"Cannot approve a survey in '{survey.status}' state"}, status=status.HTTP_400_BAD_REQUEST)
        survey.status = "approved"
        survey.save(update_fields=["status", "updated_at"])
        # Optional: write to Ethereum and store tx (unless skip_chain requested)
        skip_chain = False
        try:
            q = request.query_params
            h = request.headers
            skip_chain = (str(q.get("skip_chain", "")).lower() in ("1", "true", "yes")) or (
                str(h.get("X-Skip-Chain", "")).lower() in ("1", "true", "yes")
            )
        except Exception:
            skip_chain = False
        if eth_mark_approved is not None and not skip_chain:
            try:
                txh, blk = eth_mark_approved(survey.id)
                Transaction.objects.create(
                    survey=survey,
                    public_anchor_tx_hash=txh,
                    public_block_number=blk,
                    private_tx_hash=txh,
                )
            except Exception:
                pass
        return Response(SurveySerializer(survey).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        if survey.status != "submitted":
            return Response({"detail": f"Cannot reject a survey in '{survey.status}' state"}, status=status.HTTP_400_BAD_REQUEST)
        survey.status = "rejected"
        survey.save(update_fields=["status", "updated_at"])
        # Optional: write to Ethereum and store tx (unless skip_chain requested)
        skip_chain = False
        try:
            q = request.query_params
            h = request.headers
            skip_chain = (str(q.get("skip_chain", "")).lower() in ("1", "true", "yes")) or (
                str(h.get("X-Skip-Chain", "")).lower() in ("1", "true", "yes")
            )
        except Exception:
            skip_chain = False
        if eth_mark_rejected is not None and not skip_chain:
            try:
                txh, blk = eth_mark_rejected(survey.id)
                Transaction.objects.create(
                    survey=survey,
                    public_anchor_tx_hash=txh,
                    public_block_number=blk,
                    private_tx_hash=txh,
                )
            except Exception:
                pass
        return Response(SurveySerializer(survey).data)

