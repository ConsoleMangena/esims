import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { listProjects, createProject, updateProject, deleteProject, type Project } from "../../lib/projects";

export default function ManagerProjects() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // edit state per row
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const projs = await listProjects();
        setItems(projs);
      } catch (e: any) {
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    setCreating(true);
    try {
      const created = await createProject({ name: name.trim(), description: description || undefined });
      setItems((arr) => [created, ...arr]);
      setName("");
      setDescription("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Create project failed");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(p: Project) {
    setEditId(p.id);
    setEditName(p.name);
    setEditDesc(p.description || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditDesc("");
  }

  async function saveEdit(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateProject(id, { name: editName, description: editDesc });
      setItems((arr) => arr.map((p) => (p.id === id ? updated : p)));
      cancelEdit();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this project?")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteProject(id);
      setItems((arr) => arr.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title="ESIMS - Projects" description="Manage projects for survey submissions." />
      <PageBreadcrumb pageTitle="Projects" />

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Create project</h3>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 max-w-3xl">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Project name" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="sm:col-span-2">
            <button disabled={creating} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600 disabled:opacity-50">
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">All projects</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((p) => (
                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-800 dark:text-white/90">
                    {editId === p.id ? (
                      <Input value={editName} onChange={(e)=>setEditName(e.target.value)} />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                    {editId === p.id ? (
                      <Input value={editDesc} onChange={(e)=>setEditDesc(e.target.value)} />
                    ) : (
                      p.description || "—"
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {editId === p.id ? (
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === p.id}
                          onClick={() => saveEdit(p.id)}
                          className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                          type="button"
                        >Save</button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 rounded bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-white/90"
                          type="button"
                        >Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="px-3 py-1 rounded bg-brand-500 text-white"
                          type="button"
                        >Edit</button>
                        <button
                          disabled={busyId === p.id}
                          onClick={() => onDelete(p.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                          type="button"
                        >Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">No projects yet.</td>
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
