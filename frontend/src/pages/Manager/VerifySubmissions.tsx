import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { approveSurvey, listSurveys, rejectSurvey, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";
import { listTransactions, createTransaction } from "../../lib/transactions";
import { markApprovedMM, markRejectedMM } from "../../lib/eth";

export default function VerifySubmissions() {
  const [items, setItems] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [useMM, setUseMM] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [surveys, projs] = await Promise.all([listSurveys(), listProjects()]);
        setItems(surveys);
        setProjects(projs);
      } catch (e: any) {
        setError("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const projectName = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return (id: number) => map.get(id) || `#${id}`;
  }, [projects]);

  const queue = items.filter((s) => s.status === "submitted");

  function TxLink({ surveyId }: { surveyId: number }) {
    const [url, setUrl] = useState<string>("");
    const [hash, setHash] = useState<string>("");
    useEffect(() => {
      (async () => {
        try {
          const txs = await listTransactions({ survey: surveyId, silent: true });
          const latest = (txs || [])[0];
          setUrl(latest?.etherscan_url || "");
          setHash(latest?.public_anchor_tx_hash || latest?.private_tx_hash || "");
        } catch { void 0; }
      })();
    }, [surveyId]);
    if (!url) return null;
    const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "View";
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-brand-600 hover:underline"
        title={hash || undefined}
      >{short}</a>
    );
  }

  async function onApprove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await approveSurvey(id, { skipChain: useMM, silent: true });
      if (useMM) {
        try {
          const { hash } = await markApprovedMM(id);
          try { await createTransaction({ survey: id, public_anchor_tx_hash: hash }); } catch {}
        } catch (e: any) {
          setError(e?.message || "MetaMask transaction failed");
        }
      }
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onAnchorFull(id: number) {
    setBusyId(id);
    setError(null);
    setInfo(null);
    try {
      const res = await (await import("../../lib/surveys")).anchorFullFile(id, { silent: true });
      const chunks = (res as any)?.anchored_chunks ?? 0;
      setInfo(`Anchored ${chunks} encrypted chunk(s). Keys stored securely by server (no raw key returned).`);
      // Optionally refresh transactions link by no-op state change
      setItems((arr) => arr.slice());
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Anchor failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await rejectSurvey(id, { skipChain: useMM, silent: true });
      if (useMM) {
        try {
          const { hash } = await markRejectedMM(id);
          try { await createTransaction({ survey: id, public_anchor_tx_hash: hash }); } catch {}
        } catch (e: any) {
          setError(e?.message || "MetaMask transaction failed");
        }
      }
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onRecover(id: number) {
    setBusyId(id);
    setError(null);
    setInfo(null);
    try {
      const kek = window.prompt("Enter base64 master key (leave blank to use your stored profile key):", "");
      let body: any = undefined;
      if (kek && kek.trim()) {
        const verInput = window.prompt("Enter key version (defaults to your profile version):", "");
        const ver = verInput && verInput.trim() ? parseInt(verInput.trim(), 10) : undefined;
        body = { data_kek_b64: kek.trim(), ...(ver ? { data_kek_version: ver } : {}) };
      }
      const { recoverFullFile } = await import("../../lib/surveys");
      const res = await recoverFullFile(id, body, { silent: true });
      setInfo(`Recovered ${res?.recovered_bytes || 0} bytes and stored file in server.`);
      // Optionally refresh to pick up recovered_file field
      const fresh = await listSurveys();
      setItems(fresh);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Recovery failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Survey Data Verification"
        description="Review, verify, and approve survey data submissions."
      />
      <PageBreadcrumb pageTitle="Survey Data Verification" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={useMM} onChange={(e)=>setUseMM(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-700" />
            Use MetaMask for on-chain record
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">IPFS CID</th>
                <th className="py-2 pr-4">On-chain</th>
                <th className="py-2 pr-4">Recovered</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(queue || []).map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                  <td className="py-2 pr-4">{projectName(s.project)}</td>
                  <td className="py-2 pr-4 text-gray-500 truncate max-w-[240px]" title={s.ipfs_cid}>
                    <a className="text-brand-600 hover:underline" href={`https://ipfs.io/ipfs/${s.ipfs_cid}`} target="_blank" rel="noreferrer">{s.ipfs_cid}</a>
                  </td>
                  <td className="py-2 pr-4">
                    <TxLink surveyId={s.id} />
                  </td>
                  <td className="py-2 pr-4 text-gray-500 truncate max-w-[200px]">
                    {s.recovered_file ? (
                      <a href={s.recovered_file} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">Download</a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busyId === s.id}
                        onClick={() => onApprove(s.id)}
                        className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                      >Approve</button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => onReject(s.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                      >Reject</button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => onAnchorFull(s.id)}
                        className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                        title="Store the entire file content on-chain in chunks"
                      >Anchor full file</button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => onRecover(s.id)}
                        className="px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                        title="Recover encrypted chunks from chain using your KEK and store file on server"
                      >Recover</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-gray-500">No pending submissions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {info && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{info}</p>}
        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
