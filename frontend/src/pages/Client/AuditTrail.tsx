import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";
import { getEtherscanTxUrl } from "../../lib/eth";

export default function AuditTrail() {
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [t, s, p] = await Promise.all([
          listTransactions({ silent: true }),
          listSurveys(),
          listProjects(),
        ]);
        setTxs(t);
        setSurveys(s);
        setProjects(p);
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

  const surveyById = useMemo(() => {
    const m = new Map<number, Survey>();
    surveys.forEach((s) => m.set(s.id, s));
    return m;
  }, [surveys]);

  const filtered = useMemo(() => {
    let arr = [...txs];
    if (projectFilter) {
      const pid = Number(projectFilter);
      const keep = new Set(surveys.filter((s)=>s.project===pid).map((s)=>s.id));
      arr = arr.filter((t)=>keep.has(t.survey));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((t) => {
        const s = surveyById.get(t.survey);
        const title = s?.title?.toLowerCase() || "";
        const hash = (t.public_anchor_tx_hash || t.private_tx_hash || "").toLowerCase();
        return title.includes(q) || hash.includes(q);
      });
    }
    return arr.sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at));
  }, [txs, projectFilter, search, surveyById, surveys]);

  return (
    <>
      <PageMeta
        title="ESIMS - Audit Trail"
        description="Read-only access to blockchain transaction proofs and logs."
      />
      <PageBreadcrumb pageTitle="Audit Trail" />

      <div className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300">Project</label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              value={projectFilter}
              onChange={(e)=>setProjectFilter(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p)=>(<option key={p.id} value={String(p.id)}>{p.name}</option>))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-300">Search</label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              placeholder="Search by survey title or tx hash…"
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Survey</th>
                  <th className="py-2 pr-4">Tx</th>
                  <th className="py-2 pr-4">Block</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t)=>{
                  const s = surveyById.get(t.survey);
                  const url = t.etherscan_url || (t.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                  const hash = t.public_anchor_tx_hash || t.private_tx_hash || "";
                  const short = hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : "";
                  return (
                    <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{s ? projectName(s.project) : "—"}</td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s ? s.title : `#${t.survey}`}</td>
                      <td className="py-2 pr-4">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a> : <span className="text-gray-400">—</span>}</td>
                      <td className="py-2 pr-4">{t.public_block_number ?? t.private_block_number ?? "—"}</td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-gray-500">No transactions.</td>
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
