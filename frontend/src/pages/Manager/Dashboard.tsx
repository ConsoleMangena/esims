import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listSurveys, summarizeStatuses, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";
import { listTransactions } from "../../lib/transactions";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import { Link } from "react-router";

export default function ManagerDashboard() {
  const [items, setItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [surveys, projs] = await Promise.all([listSurveys(), listProjects()]);
        setItems(surveys);
        setProjects(projs);
      } catch (e: any) {
        setErr("Failed to load surveys");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const startTs = filterStart ? new Date(filterStart + "T00:00:00").getTime() : null;
    const endTs = filterEnd ? new Date(filterEnd + "T23:59:59").getTime() : null;
    return items.filter((s) => {
      if (filterProject && s.project !== Number(filterProject)) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      const created = new Date(s.created_at).getTime();
      if (startTs && created < startTs) return false;
      if (endTs && created > endTs) return false;
      return true;
    });
  }, [items, filterProject, filterStatus, filterStart, filterEnd]);

  const stats = summarizeStatuses(filtered);

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
        } catch {}
      })();
    }, [surveyId]);
    if (!url) return null;
    const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "View";
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" title={hash || undefined}>{short}</a>
    );
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Manager Dashboard"
        description="Project manager overview with progress and activity."
      />
      <PageBreadcrumb pageTitle="Manager Dashboard" />
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Filters</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Project</Label>
            <Select
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
              value={filterProject}
              onChange={setFilterProject}
              placeholder="All projects"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              options={[
                { value: "", label: "All" },
                { value: "submitted", label: "Submitted" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="All statuses"
            />
          </div>
          <div>
            <Label>From date</Label>
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <Label>To date</Label>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[ 
          { label: "Total", value: stats.total },
          { label: "Submitted", value: stats.submitted },
          { label: "Approved", value: stats.approved },
          { label: "Rejected", value: stats.rejected },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/manager/verification" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600">Go to Verification</Link>
          <Link to="/manager/transactions" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">View Transactions Log</Link>
          <Link to="/manager/reports" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 dark:bg-white/5 dark:text-white/90">Open Reports & Analytics</Link>
        </div>
      </div>
      {err && (
        <p className="mt-5 text-sm text-error-500">{err}</p>
      )}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Recent submissions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">On-chain</th>
              </tr>
            </thead>
            <tbody>
              {(filtered || []).slice(0, 8).map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-green-100 text-green-700" : s.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4"><TxLink surveyId={s.id} /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">No submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
