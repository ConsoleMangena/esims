import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { approveSurvey, listSurveys, rejectSurvey, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";
import { listTransactions } from "../../lib/transactions";
import { useToast } from "../../context/ToastContext";

export default function VerifySubmissions() {
  const [items, setItems] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<null | "approve" | "reject" | "record" | "anchor">(null);
  const { success, error: toastError, info: toastInfo } = useToast();

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
    setPendingAction("approve");
    setError(null);
    try {
      const updated = await approveSurvey(id, { silent: true });
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
      success("Submission approved");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Approve failed";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }


  async function onReject(id: number) {
    setBusyId(id);
    setPendingAction("reject");
    setError(null);
    try {
      const updated = await rejectSurvey(id, { silent: true });
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
      success("Submission rejected");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Reject failed";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  async function onRecordChain(id: number) {
    const s = items.find((x) => x.id === id);
    if (s && (s.has_onchain_record || s.has_onchain_file)) {
      toastInfo("Already recorded on-chain.");
      return;
    }
    setBusyId(id);
    setPendingAction("record");
    setError(null);
    setInfo(null);
    try {
      const { recordOnChain, listSurveys: reload } = await import("../../lib/surveys");
      const res = await recordOnChain(id, { silent: true });
      const n = (res?.transactions || []).length;
      const msg = `Recorded submission on private chain (${n} tx).`;
      setInfo(msg);
      toastInfo(msg);
      // Reload to reflect has_onchain_* flags
      const fresh = await reload();
      setItems(fresh);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Record failed";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  async function onAnchorFull(id: number) {
    const s = items.find((x) => x.id === id);
    if (s && s.has_onchain_file) {
      toastInfo("Full file already anchored on-chain.");
      return;
    }
    if (s && !s.file) {
      toastError("No uploaded file available to anchor.");
      return;
    }
    setBusyId(id);
    setPendingAction("anchor");
    setError(null);
    setInfo(null);
    try {
      const { anchorFullFile, listSurveys: reload } = await import("../../lib/surveys");
      const res = await anchorFullFile(id, { silent: true });
      const chunks = (res as any)?.anchored_chunks ?? 0;
      const msg = `Anchored ${chunks} raw chunk(s) on your private chain.`;
      setInfo(msg);
      success(msg);
      const fresh = await reload();
      setItems(fresh);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Anchor failed";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
      setPendingAction(null);
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">IPFS CID</th>
                <th className="py-2 pr-4">On-chain</th>
                <th className="py-2 pr-4">Original</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded"></div>
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3"></div>
                    </div>
                  </td>
                </tr>
              )}
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
                    {s.file ? (
                      <a href={s.file} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">Download</a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {s.status !== "approved" && (
                        <button
                          disabled={busyId === s.id}
                          aria-busy={busyId === s.id && pendingAction === "approve"}
                          onClick={() => onApprove(s.id)}
                          className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                        >{busyId === s.id && pendingAction === "approve" ? "Approving…" : "Approve"}</button>
                      )}
                      {s.status !== "rejected" && (
                        <button
                          disabled={busyId === s.id}
                          aria-busy={busyId === s.id && pendingAction === "reject"}
                          onClick={() => onReject(s.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                        >{busyId === s.id && pendingAction === "reject" ? "Rejecting…" : "Reject"}</button>
                      )}
                      {!s.has_onchain_record && !s.has_onchain_file && (
                        <button
                          disabled={busyId === s.id}
                          aria-busy={busyId === s.id && pendingAction === "record"}
                          onClick={() => onRecordChain(s.id)}
                          className="px-3 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
                          title="Record header on private chain (projectId, CID, checksum)"
                        >{busyId === s.id && pendingAction === "record" ? "Recording…" : "Record on chain"}</button>
                      )}
                      {s.file && !s.has_onchain_file && (
                        <button
                          disabled={busyId === s.id}
                          aria-busy={busyId === s.id && pendingAction === "anchor"}
                          onClick={() => onAnchorFull(s.id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                          title="Store the full file on private chain in raw chunks"
                        >{busyId === s.id && pendingAction === "anchor" ? "Anchoring…" : "Anchor full file"}</button>
                      )}
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
        {pendingAction === "anchor" && busyId !== null && (
          <div className="mt-4">
            <div className="h-2 w-full rounded bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full w-1/3 bg-blue-600 animate-pulse" />
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Anchoring file to private chain…</p>
          </div>
        )}
        {info && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{info}</p>}
        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
