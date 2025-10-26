from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import mimetypes
from pathlib import Path
from rest_framework.parsers import MultiPartParser, FormParser
import hashlib
import os
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

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
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

    @action(detail=True, methods=["post"], url_path="anchor-file")
    def anchor_file(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        if not getattr(survey, "file", None):
            return Response({"detail": "No file uploaded for this survey"}, status=status.HTTP_400_BAD_REQUEST)
        # Read file bytes and chunk
        try:
            f = survey.file
            path = getattr(f, "path", None)
            CHUNK = 24 * 1024  # 24KB per chunk
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

        # Encrypt per-chunk with AES-256-GCM (nonce||ciphertext+tag) and manage keys via envelope or KDF
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
            from cryptography.hazmat.primitives.keywrap import aes_key_wrap  # type: ignore
            from cryptography.hazmat.primitives.kdf.hkdf import HKDF  # type: ignore
            from cryptography.hazmat.primitives import hashes  # type: ignore
            import os as _os
            import base64 as _b64
        except Exception:
            return Response({"detail": "Encryption module not available"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        scheme = os.getenv("ENC_SCHEME", "envelope-aeskw-v1").strip() or "envelope-aeskw-v1"
        key_version = int(os.getenv("DATA_KEK_VERSION", "1") or 1)
        wrapped_dek_b64: str | None = None
        kdf_salt_b64: str | None = None
        try:
            if scheme == "envelope-aeskw-v1":
                # Require KEK from env
                kek_b64 = os.getenv("DATA_KEK_B64", "").strip()
                if not kek_b64:
                    return Response({"detail": "KEK not configured (DATA_KEK_B64)"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                kek = _b64.b64decode(kek_b64)
                if len(kek) not in (16, 24, 32):
                    return Response({"detail": "Invalid KEK length for AES key wrap"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                dek = AESGCM.generate_key(bit_length=256)
                aead = AESGCM(dek)
                payloads: list[bytes] = []
                for pt in chunks:
                    nonce = _os.urandom(12)
                    ct = aead.encrypt(nonce, pt, None)  # ciphertext||tag
                    payloads.append(nonce + ct)
                wrapped = aes_key_wrap(kek, dek)
                wrapped_dek_b64 = _b64.b64encode(wrapped).decode()
            elif scheme == "kdf-hkdf-v1":
                kek_b64 = os.getenv("DATA_KEK_B64", "").strip()
                if not kek_b64:
                    return Response({"detail": "KEK not configured (DATA_KEK_B64)"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                kek = _b64.b64decode(kek_b64)
                salt = _os.urandom(16)
                kdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b"esims-v1")
                dek = kdf.derive(kek)
                aead = AESGCM(dek)
                payloads = []
                for pt in chunks:
                    nonce = _os.urandom(12)
                    ct = aead.encrypt(nonce, pt, None)
                    payloads.append(nonce + ct)
                kdf_salt_b64 = _b64.b64encode(salt).decode()
            else:
                return Response({"detail": "Unsupported encryption scheme"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "Encryption failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Submit encrypted payloads via SSTORE2 pointers
        try:
            from smartcontracts.eth import add_encrypted_chunks as eth_add_encrypted_chunks
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        tx_hashes = []
        try:
            if payloads:
                txh, blk = eth_add_encrypted_chunks(survey.id, payloads)
                tx_hashes.append(txh)
                Transaction.objects.create(
                    survey=survey,
                    public_anchor_tx_hash=txh,
                    public_block_number=blk,
                    private_tx_hash=txh,
                )
        except Exception:
            return Response({"detail": "On-chain storage failed"}, status=status.HTTP_502_BAD_GATEWAY)

        # Save encryption metadata on the survey
        try:
            survey.enc_scheme = scheme
            survey.key_version = key_version
            survey.wrapped_dek_b64 = wrapped_dek_b64
            survey.kdf_salt_b64 = kdf_salt_b64
            survey.enc_chunk_size = CHUNK
            survey.save(update_fields=[
                "enc_scheme",
                "key_version",
                "wrapped_dek_b64",
                "kdf_salt_b64",
                "enc_chunk_size",
                "updated_at",
            ])
        except Exception:
            pass

        return Response({
            "anchored_chunks": len(payloads),
            "transactions": tx_hashes,
            "enc_scheme": scheme,
            "key_version": key_version,
            "chunk_format": "nonce(12 bytes) || ciphertext||tag(16 bytes tag at end)",
        })

    @action(detail=True, methods=["post"], url_path="recover-file")
    def recover_file(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        if not survey.enc_scheme:
            return Response({"detail": "No encrypted on-chain data for this survey"}, status=status.HTTP_400_BAD_REQUEST)
        # Load manager KEK from their profile
        prof = getattr(user, "profile", None)
        body_kek_b64 = request.data.get("data_kek_b64") if isinstance(getattr(request, "data", {}), dict) else None
        body_kek_version = request.data.get("data_kek_version") if isinstance(getattr(request, "data", {}), dict) else None
        kek_b64_to_use = (body_kek_b64 or "").strip() or (getattr(prof, "data_kek_b64", None) if prof else None)
        if not kek_b64_to_use:
            return Response({"detail": "Manager key not provided and not set in profile"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            kv = int(body_kek_version) if body_kek_version is not None else int(getattr(prof, "data_kek_version", 1))
        except Exception:
            kv = int(getattr(prof, "data_kek_version", 1))
        if kv != getattr(survey, "key_version", 1):
            return Response({"detail": "Provided/Stored key version does not match survey key_version"}, status=status.HTTP_400_BAD_REQUEST)
        # Read encrypted chunks from chain
        try:
            from smartcontracts.eth import get_encrypted_chunk_count as eth_get_count, read_encrypted_chunk as eth_read_chunk
        except Exception:
            return Response({"detail": "Blockchain integration not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            total = eth_get_count(survey.id)
        except Exception as e:
            return Response({"detail": f"Failed to read chunk count: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
        if total <= 0:
            return Response({"detail": "No encrypted chunks found on-chain"}, status=status.HTTP_400_BAD_REQUEST)
        # Derive/unwrap DEK
        try:
            import base64 as _b64
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore
            from cryptography.hazmat.primitives.kdf.hkdf import HKDF  # type: ignore
            from cryptography.hazmat.primitives import hashes  # type: ignore
            from cryptography.hazmat.primitives.keywrap import aes_key_unwrap  # type: ignore
        except Exception:
            return Response({"detail": "Crypto module not available"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            kek = _b64.b64decode(kek_b64_to_use)
            if survey.enc_scheme == "envelope-aeskw-v1":
                if not survey.wrapped_dek_b64:
                    return Response({"detail": "Missing wrapped key on survey"}, status=status.HTTP_400_BAD_REQUEST)
                wrapped = _b64.b64decode(survey.wrapped_dek_b64)
                dek = aes_key_unwrap(kek, wrapped)
            elif survey.enc_scheme == "kdf-hkdf-v1":
                if not survey.kdf_salt_b64:
                    return Response({"detail": "Missing KDF salt on survey"}, status=status.HTTP_400_BAD_REQUEST)
                salt = _b64.b64decode(survey.kdf_salt_b64)
                kdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b"esims-v1")
                dek = kdf.derive(kek)
            else:
                return Response({"detail": "Unsupported enc_scheme"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Key derivation failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Decrypt all chunks and store to recovered_file
        try:
            from django.core.files.base import ContentFile
        except Exception:
            return Response({"detail": "Django file system unavailable"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            aead = AESGCM(dek)
            parts: list[bytes] = []
            for i in range(total):
                payload = eth_read_chunk(survey.id, i)
                if not payload or len(payload) < 12 + 16:
                    return Response({"detail": f"Invalid payload at chunk {i}"}, status=status.HTTP_502_BAD_GATEWAY)
                nonce = payload[:12]
                ct = payload[12:]
                pt = aead.decrypt(nonce, ct, None)
                parts.append(pt)
            data = b"".join(parts)
            ext = survey.file_ext or "bin"
            name = f"recovered_{survey.id}.{ext}"
            survey.recovered_file.save(name, ContentFile(data), save=True)
            return Response({"recovered_bytes": len(data), "stored": True})
        except Exception as e:
            return Response({"detail": f"Recovery failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
