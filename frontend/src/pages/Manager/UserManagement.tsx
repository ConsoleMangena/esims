import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

import { useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import { listProfiles, updateProfile, type Profile } from "../../lib/users";
import { useAuth } from "../../context/AuthContext";

export default function UserManagement() {
  const { role } = useAuth();
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listProfiles({ silent: true });
        setItems(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load users (make sure you're staff/admin)");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items || []).filter((p) => {
      if (roleFilter && p.role !== roleFilter) return false;
      if (!term) return true;
      const hay = [p.username, p.email || "", p.first_name || "", p.last_name || "", p.company || ""].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [items, q, roleFilter]);

  async function onChangeRole(p: Profile, role: string) {
    if (!role || role === p.role) return;
    setSavingId(p.id);
    setError(null);
    try {
      const updated = await updateProfile(p.id, { role: role as any });
      setItems((arr) => arr.map((x) => (x.id === p.id ? updated : x)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update user role");
    } finally {
      setSavingId(null);
    }
  }

  const roleOptions = [
    { value: "", label: "All roles" },
    { value: "surveyor", label: "Surveyor" },
    { value: "manager", label: "Manager" },
    { value: "client", label: "Client" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <>
      <PageMeta
        title="ESIMS - User Management"
        description="Manage and assign roles to project users."
      />
      <PageBreadcrumb pageTitle="User Management" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Search</Label>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="name, email, company" />
          </div>
          <div>
            <Label>Role</Label>
            <Select options={roleOptions} value={roleFilter} onChange={setRoleFilter} placeholder="All roles" />
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-error-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-3 text-gray-500">Loading…</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-700 dark:text-white/90">{p.username}</td>
                    <td className="py-2 pr-4">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="py-2 pr-4">{p.email || "—"}</td>
                    <td className="py-2 pr-4">{p.company || "—"}</td>
                    <td className="py-2 pr-4">
                      {role === "admin" ? (
                        <select
                          value={p.role}
                          onChange={(e)=>onChangeRole(p, e.target.value)}
                          disabled={savingId === p.id}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          <option value="surveyor">Surveyor</option>
                          <option value="manager">Manager</option>
                          <option value="client">Client</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-gray-700 dark:text-white/90">{p.role}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-gray-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
