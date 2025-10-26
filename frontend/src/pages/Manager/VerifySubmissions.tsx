import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { approveSurvey, listSurveys, rejectSurvey, type Survey } from "../../lib/surveys";
import { listProjects, type Project } from "../../lib/projects";

export default function VerifySubmissions() {
  const [items, setItems] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  async function onApprove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await approveSurvey(id);
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await rejectSurvey(id);
      setItems((arr) => arr.map((s) => (s.id === id ? updated : s)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Reject failed");
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">IPFS CID</th>
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
                    <div className="flex gap-2">
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
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">No pending submissions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
      </div>
    </>
  );
}
