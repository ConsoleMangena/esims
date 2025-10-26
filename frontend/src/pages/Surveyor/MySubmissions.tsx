import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";

export default function MySubmissions() {
  const [items, setItems] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [surveys, projs] = await Promise.all([listSurveys(), listProjects()]);
        setItems(surveys);
        setProjects(projs);
      } catch (e: any) {
        setErr("Failed to load submissions");
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

  return (
    <>
      <PageMeta
        title="ESIMS - My Submissions"
        description="List and track your submitted survey data."
      />
      <PageBreadcrumb pageTitle="My Submissions" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">IPFS CID</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                  <td className="py-2 pr-4">{projectName(s.project)}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-green-100 text-green-700" : s.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500 truncate max-w-[200px]" title={s.ipfs_cid}>{s.ipfs_cid}</td>
                  <td className="py-2 pr-4 text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-gray-500">No submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {err && <p className="mt-4 text-sm text-error-500">{err}</p>}
      </div>
    </>
  );
}
