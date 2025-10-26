import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import { listSurveys, summarizeStatuses, type Survey } from "../../lib/surveys";

export default function SurveyorDashboard() {
  const [items, setItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listSurveys();
        setItems(data);
      } catch (e: any) {
        setErr("Failed to load surveys");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = summarizeStatuses(items);

  return (
    <>
      <PageMeta
        title="ESIMS - Surveyor Dashboard"
        description="Dashboard overview for surveyors."
      />
      <PageBreadcrumb pageTitle="Surveyor Dashboard" />
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
              </tr>
            </thead>
            <tbody>
              {(items || []).slice(0, 8).map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-green-100 text-green-700" : s.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-gray-500">No submissions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
