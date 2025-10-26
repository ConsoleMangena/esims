import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listSurveys, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";

export default function SurveyResults() {
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
        setErr("Failed to load results");
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
        title="ESIMS - View Survey Results"
        description="Access and download approved survey data and reports."
      />
      <PageBreadcrumb pageTitle="View Survey Results" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">IPFS</th>
                <th className="py-2 pr-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{s.title}</td>
                  <td className="py-2 pr-4">{projectName(s.project)}</td>
                  <td className="py-2 pr-4">
                    <a className="text-brand-600 hover:underline" href={`https://ipfs.io/ipfs/${s.ipfs_cid}`} target="_blank" rel="noreferrer">Open</a>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{new Date(s.updated_at).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">No approved results yet.</td>
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
