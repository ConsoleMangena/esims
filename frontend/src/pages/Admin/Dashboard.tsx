import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listProjects, type Project } from "../../lib/projects";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listTransactions, type ChainTransaction } from "../../lib/transactions";
import { listProfiles, type Profile } from "../../lib/users";
import { useToast } from "../../context/ToastContext";
import { getEtherscanTxUrl } from "../../lib/eth";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { error: toastError } = useToast();
  const { role, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [txs, setTxs] = useState<ChainTransaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, s, t, u] = await Promise.all([
          listProjects(),
          listSurveys(),
          listTransactions({ silent: true }),
          listProfiles({ silent: true }),
        ]);
        setProjects(p);
        setSurveys(s);
        setTxs(t);
        setProfiles(u);
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || "Failed to load dashboard";
        setError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalSurveys = surveys.length;
    const submitted = surveys.filter((s) => s.status === "submitted").length;
    const approved = surveys.filter((s) => s.status === "approved").length;
    const rejected = surveys.filter((s) => s.status === "rejected").length;
    const onchainRecord = surveys.filter((s) => !!s.has_onchain_record).length;
    const onchainFile = surveys.filter((s) => !!s.has_onchain_file).length;
    const totalTx = txs.length;
    const usersTotal = profiles.length;
    const byRole: Record<string, number> = { surveyor: 0, manager: 0, client: 0, admin: 0 };
    profiles.forEach((p) => { byRole[p.role] = (byRole[p.role] || 0) + 1; });
    return { totalSurveys, submitted, approved, rejected, onchainRecord, onchainFile, totalTx, usersTotal, byRole };
  }, [surveys, txs, profiles]);

  const recentTx = useMemo(() => {
    return [...txs].sort((a,b)=>+new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8);
  }, [txs]);

  const projectName = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return (id: number) => map.get(id) || `#${id}`;
  }, [projects]);

  const surveyById = useMemo(() => {
    const m = new Map<number, Survey>();
    surveys.forEach((s) => m.set(s.id, s));
    return m;
  }, [surveys]);

  useEffect(() => {
    (async () => {
      // Ping API health (prefer /health/, fallback to a lightweight list)
      try {
        const t0 = performance.now();
        try {
          await api.get("health/", { silent: true } as any);
        } catch {
          await api.get("projects/", { params: { limit: 1 }, silent: true } as any);
        }
        const dt = Math.max(0, Math.round(performance.now() - t0));
        setApiOnline(true);
        setApiLatencyMs(dt);
      } catch {
        setApiOnline(false);
        setApiLatencyMs(null);
      }
    })();
  }, []);

  function Card({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color?: string }) {
    const c = color || "brand";
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold text-${c}-600 dark:text-${c}-400`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Admin Dashboard"
        description="System health status, alerts, and key metrics."
      />
      <PageBreadcrumb pageTitle="Admin Dashboard" />

      <div className="space-y-6">
        {/* System health */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">API</h3>
            <div className="mt-2 text-sm">
              {apiOnline === null ? (
                <p className="text-gray-500">Checking…</p>
              ) : apiOnline ? (
                <p className="text-green-600 dark:text-green-400">Online{typeof apiLatencyMs === 'number' ? ` (${apiLatencyMs} ms)` : ''}</p>
              ) : (
                <p className="text-error-500">Offline</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Auth: {accessToken ? `Signed in (${role || '—'})` : 'Not signed in'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Private Chain Activity</h3>
            <div className="mt-2 text-sm">
              {txs.length ? (
                <>
                  <p>Last activity: {new Date([...txs].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at))[0].created_at).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-500">Last recorded block: {(() => {
                    const blocks = txs.map(t=>t.public_block_number ?? t.private_block_number).filter(Boolean) as number[];
                    return blocks.length ? Math.max(...blocks) : '—';
                  })()}</p>
                </>
              ) : (
                <p className="text-gray-500">No transactions yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Overview</h3>
            <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>Projects: {projects.length}</li>
              <li>Surveys: {stats.totalSurveys} (records: {stats.onchainRecord}, files: {stats.onchainFile})</li>
              <li>Transactions: {stats.totalTx}</li>
            </ul>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_,i)=> (
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
              <Card label="Projects" value={projects.length} hint="Total projects" />
              <Card label="Surveys" value={stats.totalSurveys} hint={`${stats.submitted} submitted / ${stats.approved} approved / ${stats.rejected} rejected`} />
              <Card label="On-chain records" value={stats.onchainRecord} hint={`${stats.onchainFile} with files on-chain`} />
              <Card label="Transactions" value={stats.totalTx} hint="Across all surveys" />
            </>
          )}
        </div>

        {/* Users by role */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Users</h3>
            {loading ? (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/5" />
              </div>
            ) : (
              <ul className="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>Total: {stats.usersTotal}</li>
                <li>Admins: {stats.byRole.admin || 0}</li>
                <li>Managers: {stats.byRole.manager || 0}</li>
                <li>Surveyors: {stats.byRole.surveyor || 0}</li>
                <li>Clients: {stats.byRole.client || 0}</li>
              </ul>
            )}
          </div>

          {/* Recent transactions */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Recent Transactions</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-4">When</th>
                    <th className="py-1 pr-4">Project</th>
                    <th className="py-1 pr-4">Survey</th>
                    <th className="py-1 pr-4">Tx</th>
                    <th className="py-1 pr-4">Block</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="py-3">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded" />
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-5/6" />
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
                      </div>
                    </td></tr>
                  )}
                  {!loading && recentTx.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-gray-500">No transactions yet.</td></tr>
                  )}
                  {recentTx.map((t) => {
                    const s = surveyById.get(t.survey);
                    const url = t.etherscan_url || (t.public_anchor_tx_hash ? getEtherscanTxUrl(t.public_anchor_tx_hash) : (t.private_tx_hash ? getEtherscanTxUrl(t.private_tx_hash) : ""));
                    const hash = t.public_anchor_tx_hash || t.private_tx_hash || "";
                    const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "";
                    return (
                      <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">{s ? projectName(s.project) : "—"}</td>
                        <td className="py-2 pr-4">{s ? `${s.title} (#${s.id})` : `#${t.survey}`}</td>
                        <td className="py-2 pr-4">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short || "View"}</a> : <span className="text-gray-400">—</span>}</td>
                        <td className="py-2 pr-4">{t.public_block_number ?? t.private_block_number ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
