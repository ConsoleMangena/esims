import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import { listProjects, type Project } from "../../lib/projects";
import { listSurveys, type Survey, recoverFullFile } from "../../lib/surveys";
import { getEtherscanTxUrl } from "../../lib/eth";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function ProjectTransactions() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { success, error: toastError, info: toastInfo } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [projs, survs, t] = await Promise.all([
          listProjects(),
          listSurveys(),
          listTransactions({ silent: true }),
        ]);
        setProjects(projs);
        setSurveys(survs);
        setTxs(t);
      } catch (e: any) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const surveyById = useMemo(() => {
    const m = new Map<number, Survey>();
    surveys.forEach((s) => m.set(s.id, s));
    return m;
  }, [surveys]);

  const projectName = useMemo(() => {
    const m = new Map<number, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return (id: number) => m.get(id) || `#${id}`;
  }, [projects]);

  const filtered = useMemo(() => {
    const pid = projectFilter ? Number(projectFilter) : null;
    return txs.filter((tx) => {
      const s = surveyById.get(tx.survey);
      if (!s) return false;
      if (pid && s.project !== pid) return false;
      return true;
    });
  }, [txs, projectFilter, surveyById]);

  // Group by survey: show only latest tx per survey to avoid long repeated rows
  const groupBySurvey = true;
  const displayed = useMemo(() => {
    if (!groupBySurvey) return filtered;
    const seen = new Set<number>();
    const arr: typeof filtered = [] as any;
    for (const tx of filtered) {
      if (!seen.has(tx.survey)) {
        seen.add(tx.survey);
        arr.push(tx);
      }
    }
    return arr;
  }, [filtered]);

  const [expandedSurveyId, setExpandedSurveyId] = useState<number | null>(null);
  const [chunkCounts, setChunkCounts] = useState<Map<number, number>>(new Map());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set()); // key: `${surveyId}:${groupIndex}`
  const [chunkSizes, setChunkSizes] = useState<Map<string, number>>(new Map()); // key: `${surveyId}:${index}` -> bytes
  const [loadingGroupKey, setLoadingGroupKey] = useState<string | null>(null);

  const GROUP_SIZE = 100;

  function groupsFor(surveyId: number) {
    const total = chunkCounts.get(surveyId) || 0;
    const groups: Array<{ start: number; end: number; index: number }> = [];
    const count = Math.ceil(total / GROUP_SIZE);
    for (let i = 0; i < count; i++) {
      const start = i * GROUP_SIZE;
      const end = Math.min(total - 1, (i + 1) * GROUP_SIZE - 1);
      groups.push({ start, end, index: i });
    }
    return groups;
  }

  async function toggleChunks(surveyId: number) {
    if (expandedSurveyId === surveyId) {
      setExpandedSurveyId(null);
      return;
    }
    setExpandedSurveyId(surveyId);
    if (!chunkCounts.has(surveyId)) {
      try {
        const resp = await api.get(`surveys/${surveyId}/chunks/`, { silent: true } as any);
        const c = parseInt(String(resp?.data?.count || 0), 10) || 0;
        setChunkCounts(new Map(chunkCounts.set(surveyId, c)));
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || "Failed to load chunks";
        setError(msg);
        toastError(msg);
      }
    }
  }

  async function onRecover(surveyId: number) {
    setBusyId(surveyId);
    setError(null);
    setInfo(null);
    try {
      const res = await recoverFullFile(surveyId, { silent: true });
      const bytes = res?.recovered_bytes || 0;
      const msg = `Recovered ${bytes} bytes and stored file on server.`;
      setInfo(msg);
      success(msg);
      const fresh = await listSurveys();
      setSurveys(fresh);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Recovery failed";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function onDownloadRecord(surveyId: number) {
    setError(null);
    try {
      const resp = await api.get(`surveys/${surveyId}/onchain-record/`, { silent: true } as any);
      const data = resp.data || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onchain_record_${surveyId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastInfo("Downloaded on-chain record JSON");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Download failed";
      setError(msg);
      toastError(msg);
    }
  }

  async function onDownloadChunk(surveyId: number, index: number) {
    setError(null);
    try {
      const resp = await api.get(`surveys/${surveyId}/chunks/${index}/download/`, { responseType: 'blob', silent: true } as any);
      const blob = resp.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chunk_${surveyId}_${index}.bin`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Chunk download failed";
      setError(msg);
      toastError(msg);
    }
  }

  async function fetchChunkSizeHead(surveyId: number, index: number): Promise<number | null> {
    const key = `${surveyId}:${index}`;
    if (chunkSizes.has(key)) return chunkSizes.get(key) || 0;
    try {
      const resp = await api.head(`surveys/${surveyId}/chunks/${index}/download/`, { silent: true } as any);
      const len = Number((resp.headers as any)["content-length"]) || 0;
      setChunkSizes((m) => new Map(m.set(key, len)));
      return len || null;
    } catch {
      // Fallback: try range request for 0 byte to read total length if server supports it
      try {
        const resp = await api.get(`surveys/${surveyId}/chunks/${index}/download/`, { headers: { Range: "bytes=0-0" }, silent: true } as any);
        const cr = String((resp.headers as any)["content-range"] || "");
        const total = /\/(\d+)$/.exec(cr)?.[1];
        const len = total ? Number(total) : (resp.data as Blob)?.size || 0;
        setChunkSizes((m) => new Map(m.set(key, len)));
        return len || null;
      } catch {
        return null;
      }
    }
  }

  function humanBytes(n?: number | null) {
    const x = typeof n === "number" ? n : 0;
    if (x >= 1024 * 1024) return `${(x / (1024 * 1024)).toFixed(2)} MiB`;
    if (x >= 1024) return `${(x / 1024).toFixed(1)} KiB`;
    return `${x} B`;
  }

  async function ensureGroupSizes(surveyId: number, groupIndex: number) {
    const key = `${surveyId}:${groupIndex}`;
    if (openGroups.has(key)) return; // already opened once; sizes may be loaded
    setLoadingGroupKey(key);
    const { start, end } = groupsFor(surveyId)[groupIndex] || { start: 0, end: -1 };
    for (let i = start; i <= end; i++) {
      await fetchChunkSizeHead(surveyId, i);
    }
    setLoadingGroupKey(null);
  }

  function toggleGroup(surveyId: number, groupIndex: number) {
    const key = `${surveyId}:${groupIndex}`;
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (!openGroups.has(key)) {
      void ensureGroupSizes(surveyId, groupIndex);
    }
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Project Transactions Log"
        description="Blockchain transaction records filtered by project."
      />
      <PageBreadcrumb pageTitle="Project Transactions Log" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Project</Label>
            <Select
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
              value={projectFilter}
              onChange={setProjectFilter}
              placeholder="All projects"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Survey</th>
                <th className="py-2 pr-4">Tx Hash</th>
                <th className="py-2 pr-4">Block</th>
                <th className="py-2 pr-4">Original</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded"></div>
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3"></div>
                    </div>
                  </td>
                </tr>
              )}
              {displayed.map((t) => {
                  const s = surveyById.get(t.survey);
                  const url = t.etherscan_url || (t.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                  const hash = t.public_anchor_tx_hash || t.private_tx_hash || "";
                  const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
                  const isFirstForSurvey = true;
                  return (
                    <>
                      <tr key={`row-${t.id}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">{s ? projectName(s.project) : "—"}</td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-white/90">
                          <div className="flex items-center gap-2">
                            <span>{s ? `${s.title} (#${s.id})` : `Survey #${t.survey}`}</span>
                            {s && isFirstForSurvey ? (
                              <button
                                onClick={() => toggleChunks(s.id)}
                                className="text-xs text-brand-600 hover:underline"
                                title="Show chunks"
                              >
                                {expandedSurveyId === s.id
                                  ? 'Hide chunks'
                                  : `Show chunks${(chunkCounts.get(s.id) || 0) ? ` (${chunkCounts.get(s.id)})` : ''}`}
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{t.public_block_number ?? t.private_block_number ?? "—"}</td>
                        <td className="py-2 pr-4 text-gray-500 truncate max-w-[200px]">
                          {s?.file ? (
                            <a href={s.file} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">Download</a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-col gap-1">
                            {s && s.has_onchain_record && isFirstForSurvey ? (
                              <button onClick={() => onDownloadRecord(s.id)} className="text-brand-600 hover:underline text-left" title="Download on-chain record as JSON">Download record</button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                            {s && s.has_onchain_file && isFirstForSurvey && !s.recovered_file ? (
                              <button
                                disabled={busyId === s.id}
                                onClick={() => onRecover(s.id)}
                                className="text-indigo-600 hover:underline text-left"
                                title="Recover file from chain and store on server"
                              >Recover file</button>
                            ) : null}
                            {s && s.recovered_file ? (
                              <a href={s.recovered_file} className="text-brand-600 hover:underline text-left" target="_blank" rel="noreferrer">Download recovered</a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {s && isFirstForSurvey && expandedSurveyId === s.id ? (
                        <tr key={`chunks-${t.id}`} className="bg-gray-50/60 dark:bg-white/5">
                          <td colSpan={7} className="py-2 pr-4">
                            <div className="px-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Chunks grouped by 100 (click to expand and download):</p>
                              <div className="space-y-2">
                                {groupsFor(s.id).map((g) => {
                                  const groupKey = `${s.id}:${g.index}`;
                                  const opened = openGroups.has(groupKey);
                                  const total = g.end - g.start + 1;
                                  // Compute known total bytes for group (if sizes loaded)
                                  let groupBytes = 0;
                                  for (let i = g.start; i <= g.end; i++) {
                                    const v = chunkSizes.get(`${s.id}:${i}`);
                                    if (typeof v === "number") groupBytes += v;
                                  }
                                  return (
                                    <div key={groupKey} className="rounded border border-gray-200 dark:border-gray-800">
                                      <button
                                        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10"
                                        onClick={() => toggleGroup(s.id, g.index)}
                                      >
                                        <span className="text-xs">Chunks {g.start}–{g.end} <span className="opacity-60">(N={total}{groupBytes ? `, ${humanBytes(groupBytes)}` : ""})</span></span>
                                        <span className="text-xs opacity-70">{opened ? "Hide" : "Show"}</span>
                                      </button>
                                      {opened && (
                                        <div className="px-3 pb-2">
                                          {loadingGroupKey === groupKey && (
                                            <div className="mb-2">
                                              <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-white/10 overflow-hidden">
                                                <div className="h-full w-1/3 bg-brand-500 animate-pulse" />
                                              </div>
                                              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">Loading chunk sizes…</p>
                                            </div>
                                          )}
                                          <div className="flex flex-wrap gap-2">
                                            {Array.from({ length: total }, (_, ii) => g.start + ii).map((i) => (
                                              <button
                                                key={i}
                                                onClick={() => onDownloadChunk(s.id, i)}
                                                className="text-xs rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/10"
                                                title={`Download chunk ${i}`}
                                              >
                                                #{i}{" "}
                                                <span className="opacity-60">({humanBytes(chunkSizes.get(`${s.id}:${i}`))})</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {(chunkCounts.get(s.id) || 0) === 0 && (
                                  <span className="text-xs text-gray-400">No chunks found.</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-gray-500">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {busyId !== null && (
          <div className="mt-4">
            <div className="h-2 w-full rounded bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full w-1/3 bg-indigo-600 animate-pulse" />
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Recovering file from private chain…</p>
          </div>
        )}
        {info && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{info}</p>}
        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
