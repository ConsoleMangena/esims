import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { listSurveys, type Survey } from "../../lib/surveys";
import { useToast } from "../../context/ToastContext";
import { useDropzone } from "react-dropzone";

export default function VerifyOriginal() {
  const [surveyId, setSurveyId] = useState<string>("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [hashHex, setHashHex] = useState<string>("");
  const [record, setRecord] = useState<any | null>(null);
  const [result, setResult] = useState<"idle" | "match" | "mismatch">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const { success, error: toastError, info: toastInfo } = useToast();

  // Chunk verification state
  const [verifyingChunks, setVerifyingChunks] = useState<boolean>(false);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [checkedChunks, setCheckedChunks] = useState<number>(0);
  const [chunkMismatches, setChunkMismatches] = useState<number>(0);
  const [leftoverBytes, setLeftoverBytes] = useState<number>(0);

  async function sha256Hex(f: File): Promise<string> {
    const buf = await f.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleFileSelected(f: File | null) {
    setFile(f);
    setHashHex("");
    setResult("idle");
    if (f) {
      setBusy(true);
      setError(null);
      try {
        const h = await sha256Hex(f);
        setHashHex(h);
        toastInfo("Computed SHA-256 for selected file");
      } catch (err: any) {
        const msg = "Failed to hash file";
        setError(msg);
        toastError(msg);
      } finally {
        setBusy(false);
      }
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    await handleFileSelected(f);
  }

  async function fetchRecord(id?: number) {
    const sid = typeof id === 'number' ? id : Number(surveyId);
    if (!sid) {
      setError("Select a survey with on-chain record");
      return;
    }
    setBusy(true);
    setError(null);
    setRecord(null);
    setResult("idle");
    try {
      const { data } = await api.get(`surveys/${sid}/onchain-record/`);
      setRecord(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to fetch on-chain record");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoadingSurveys(true);
        const all = await listSurveys();
        setSurveys((all || []).filter((s) => !!(s as any).has_onchain_record));
      } catch (e) {
        // ignore
      } finally {
        setLoadingSurveys(false);
      }
    })();
  }, []);

  function compareNow() {
    if (!record || !hashHex) {
      const msg = "Select a file and load on-chain record first";
      setError(msg);
      toastError(msg);
      return;
    }
    const onchain = String(record?.checksum || "").toLowerCase();
    const ours = hashHex.toLowerCase();
    const ok = onchain && ours && onchain === ours;
    setResult(ok ? "match" : "mismatch");
    if (ok) success("Checksum matches on-chain record");
    else toastError("Checksum mismatch");
  }

  async function verifyChunks() {
    if (!file || !surveyId) {
      const msg = "Select a file and enter survey ID";
      setError(msg);
      toastError(msg);
      return;
    }
    setError(null);
    setVerifyingChunks(true);
    setCheckedChunks(0);
    setChunkMismatches(0);
    setLeftoverBytes(0);
    try {
      const resp = await api.get(`surveys/${Number(surveyId)}/chunks/`, { silent: true } as any);
      const total = parseInt(String(resp?.data?.count || 0), 10) || 0;
      setChunkCount(total);
      let offset = 0;
      for (let i = 0; i < total; i++) {
        const c = await api.get(`surveys/${Number(surveyId)}/chunks/${i}/download/`, { responseType: 'blob', silent: true } as any);
        const chainBytes = new Uint8Array(await (c.data as Blob).arrayBuffer());
        const localSlice = file.slice(offset, offset + chainBytes.length);
        const localBytes = new Uint8Array(await localSlice.arrayBuffer());
        let mismatch = false;
        if (localBytes.length !== chainBytes.length) mismatch = true;
        else {
          for (let j = 0; j < chainBytes.length; j++) {
            if (chainBytes[j] !== localBytes[j]) { mismatch = true; break; }
          }
        }
        if (mismatch) setChunkMismatches((x) => x + 1);
        offset += chainBytes.length;
        setCheckedChunks(i + 1);
      }
      const leftover = Math.max(0, file.size - (await totalChunkBytes(Number(surveyId))));
      setLeftoverBytes(leftover);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Chunk verification failed";
      setError(msg);
      toastError(msg);
    } finally {
      setVerifyingChunks(false);
      if (chunkCount > 0 && checkedChunks === chunkCount && chunkMismatches === 0 && leftoverBytes === 0) {
        success("All chunks verified against on-chain data");
      }
    }
  }

  async function totalChunkBytes(id: number): Promise<number> {
    let total = 0;
    const resp = await api.get(`surveys/${id}/chunks/`, { silent: true } as any);
    const count = parseInt(String(resp?.data?.count || 0), 10) || 0;
    for (let i = 0; i < count; i++) {
      const c = await api.get(`surveys/${id}/chunks/${i}/download/`, { responseType: 'blob', silent: true } as any);
      total += (c.data as Blob).size;
    }
    return total;
  }

  const verdict = result === "match" ? "✅ Match" : result === "mismatch" ? "❌ Mismatch" : "";
  const chunksPassed = !verifyingChunks && chunkCount > 0 && checkedChunks === chunkCount && chunkMismatches === 0 && leftoverBytes === 0;
  const finalVerdict = result === "match" && chunksPassed ? "✅ Verified original (both methods)" : result === "mismatch" || (checkedChunks === chunkCount && chunkMismatches > 0) ? "❌ Not original" : "";

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0] || null;
    await handleFileSelected(f);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  return (
    <>
      <PageMeta title="ESIMS - Verify Original File" description="Verify a file against on-chain checksum and raw chunks." />
      <PageBreadcrumb pageTitle="Verify Original File" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-3xl">
        <div>
          <Label>Select on-chain record (survey)</Label>
          <div className="mt-2 max-w-xl">
            <Select
              options={(surveys || []).map((s) => ({ value: String(s.id), label: `${s.title} (#${s.id})` }))}
              value={surveyId}
              onChange={(v: string) => {
                setSurveyId(v);
                const num = parseInt(v || "0", 10) || 0;
                if (num) fetchRecord(num);
              }}
              placeholder={loadingSurveys ? "Loading…" : "Select a survey"}
            />
          </div>
        </div>

        <div className="mt-6">
          <Label>Select file to verify</Label>
          <div
            {...getRootProps()}
            className={`mt-2 flex items-center justify-center rounded-lg border border-dashed p-6 text-sm cursor-pointer transition-colors
              ${isDragActive ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800" : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"}`}
            aria-label="File drop area"
          >
            <input {...getInputProps()} accept="*/*" />
            {file ? (
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs opacity-70">{(file.size / 1024).toFixed(1)} KiB</p>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">Drag & drop a file here, or click to select</p>
            )}
          </div>
          <div className="mt-2">
            <input
              type="file"
              onChange={onPickFile}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-white/5 dark:file:text-white/90"
              accept="*/*"
            />
          </div>
          {busy && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full w-1/3 bg-brand-500 animate-pulse" />
              </div>
              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">Hashing file…</p>
            </div>
          )}
          {hashHex && (
            <p className="mt-2 text-xs text-gray-500">Computed SHA-256: <span className="font-mono break-all">{hashHex}</span></p>
          )}
        </div>

        <div className="mt-6">
          <Label>Method 1: Compare SHA-256 against on-chain checksum</Label>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500 break-all font-mono">{record?.checksum || "—"}</p>
            </div>
            <div>
              <button
                className="px-3 py-2 rounded bg-brand-500 text-white text-sm hover:bg-brand-600 disabled:opacity-50"
                onClick={compareNow}
                disabled={!record || !hashHex || busy}
              >Compare</button>
              {verdict && <span className="ml-3 text-sm">{verdict}</span>}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Label>Method 2: Verify raw on-chain chunks</Label>
          <div className="mt-2 flex items-center gap-3">
            <button
              className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
              onClick={verifyChunks}
              disabled={!file || !surveyId || verifyingChunks}
              aria-busy={verifyingChunks}
            >{verifyingChunks ? "Verifying…" : "Verify chunks"}</button>
            <div className="flex-1">
              {chunkCount > 0 && (
                <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600"
                    style={{ width: `${chunkCount ? Math.min(100, Math.round((checkedChunks / chunkCount) * 100)) : 0}%` }}
                  />
                </div>
              )}
            </div>
            {verifyingChunks && (
              <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{checkedChunks}/{chunkCount}</span>
            )}
          </div>
          {(checkedChunks > 0 || chunkMismatches > 0) && (
            <div className="mt-2 text-sm">
              <p>Chunks checked: {checkedChunks} / {chunkCount}</p>
              <p className={chunkMismatches ? "text-error-500" : "text-success-500"}>Chunk mismatches: {chunkMismatches}</p>
              {leftoverBytes > 0 && (
                <p className="text-error-500">Local file has {leftoverBytes} extra byte(s) beyond on-chain content.</p>
              )}
            </div>
          )}
        </div>

        {finalVerdict && (
          <div className="mt-6 text-sm">
            <p className={finalVerdict.startsWith("✅") ? "text-success-500" : "text-error-500"}>{finalVerdict}</p>
          </div>
        )}

        {!loadingSurveys && surveys.length === 0 && (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">No on-chain records available yet.</p>
        )}

        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
