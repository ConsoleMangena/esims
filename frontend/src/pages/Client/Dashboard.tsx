import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import CountryMap from "../../components/ecommerce/CountryMap";
import { listProjects, type Project } from "../../lib/projects";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import { getEtherscanTxUrl } from "../../lib/eth";
import { useToast } from "../../context/ToastContext";

export default function ClientDashboard() {
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, s, t] = await Promise.all([
          listProjects(),
          listSurveys(),
          listTransactions({ silent: true }),
        ]);
        setProjects(p);
        setSurveys(s);
        setTxs(t);
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || "Failed to load dashboard";
        setError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const projectName = useMemo(() => {
    const m = new Map<number, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return (id: number) => m.get(id) || `#${id}`;
  }, [projects]);

  const approved = useMemo(() => surveys.filter((s) => s.status === "approved"), [surveys]);

  const stats = useMemo(() => {
    const approvedCount = approved.length;
    const projectsCount = new Set(approved.map((s) => s.project)).size;
    const onchainRecord = approved.filter((s) => !!s.has_onchain_record).length;
    const onchainFile = approved.filter((s) => !!s.has_onchain_file).length;
    const lastUpdated = approvedCount ? new Date(Math.max(...approved.map((s) => +new Date(s.updated_at)))).toLocaleString() : "—";
    return { approvedCount, projectsCount, onchainRecord, onchainFile, lastUpdated };
  }, [approved]);

  const filteredApproved = useMemo(() => {
    let arr = approved;
    const pid = projectFilter ? Number(projectFilter) : null;
    if (pid) arr = arr.filter((s) => s.project === pid);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s) => s.title.toLowerCase().includes(q));
    }
    return arr;
  }, [approved, projectFilter, search]);

  const recentTx = useMemo(() => [...txs].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at)).slice(0, 6), [txs]);

  const txBySurvey = useMemo(() => {
    const m = new Map<number, ChainTransaction>();
    for (const t of txs) {
      const existing = m.get(t.survey);
      if (!existing || +new Date(t.created_at) > +new Date(existing.created_at)) m.set(t.survey, t);
    }
    return m;
  }, [txs]);

  function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-brand-600 dark:text-brand-400">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }

  return (
    <>
      <PageMeta title="ESIMS - Client Dashboard" description="Project status summaries and key milestones." />
      <PageBreadcrumb pageTitle="Client Dashboard" />

      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-1/3 bg-gray-100 dark:bg-white/5 rounded" />
                  <div className="h-7 w-1/2 bg-gray-100 dark:bg-white/5 rounded" />
                  <div className="h-3 w-2/5 bg-gray-100 dark:bg-white/5 rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
              <Card label="Projects" value={stats.projectsCount} hint="With approved surveys" />
              <Card label="Approved surveys" value={stats.approvedCount} />
              <Card label="On‑chain records" value={stats.onchainRecord} />
              <Card label="Files on chain" value={stats.onchainFile} />
              <Card label="Last update" value={stats.lastUpdated} />
            </>
          )}
        </div>

        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Project</Label>
            <Select
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
              value={projectFilter}
              onChange={setProjectFilter}
              placeholder="All projects"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Search</Label>
            <input
              type="text"
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search by title…"
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        {/* Map + Summary */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Project geography</h3>
            <CountryMap 
              markers={[{ latLng: [-19.45, 29.82], name: "Gweru, Zimbabwe", style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" } }]}
              selectedRegions={["ZW"]}
            />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Summary</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>Projects with approvals: {stats.projectsCount}</li>
              <li>Approved surveys: {stats.approvedCount}</li>
              <li>On-chain records: {stats.onchainRecord}</li>
              <li>Files on chain: {stats.onchainFile}</li>
            </ul>
          </div>
        </div>

        {/* Approved surveys */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Approved surveys</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">On‑chain</th>
                  <th className="py-2 pr-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredApproved.map((s) => {
                  const t = txBySurvey.get(s.id);
                  const url = t?.etherscan_url || (t?.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t?.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                  const hash = t?.public_anchor_tx_hash || t?.private_tx_hash || "";
                  const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
                  return (
                    <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                      <td className="py-2 pr-4">{projectName(s.project)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          {s.file ? (
                            <a href={s.file} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Download</a>
                          ) : s.recovered_file ? (
                            <a href={s.recovered_file} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Download recovered</a>
                          ) : s.ipfs_cid ? (
                            <a href={`https://ipfs.io/ipfs/${s.ipfs_cid}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Open IPFS</a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {s.has_onchain_record ? (
                          url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a>
                          ) : (
                            <span className="text-gray-500">Recorded</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{new Date(s.updated_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {!loading && filteredApproved.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-gray-500">No results.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
        </div>

        {/* Recent chain activity */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Recent chain activity</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Survey</th>
                  <th className="py-2 pr-4">Tx</th>
                  <th className="py-2 pr-4">Block</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((t) => {
                  const s = surveys.find((x) => x.id === t.survey);
                  const url = t.etherscan_url || (t.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                  const hash = t.public_anchor_tx_hash || t.private_tx_hash || "";
                  const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
                  return (
                    <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-white/90">{s ? `${s.title} (#${s.id})` : `#${t.survey}`}</td>
                      <td className="py-2 pr-4">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a> : <span className="text-gray-400">—</span>}</td>
                      <td className="py-2 pr-4">{t.public_block_number ?? t.private_block_number ?? "—"}</td>
                    </tr>
                  );
                })}
                {!loading && recentTx.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500">No recent activity.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
