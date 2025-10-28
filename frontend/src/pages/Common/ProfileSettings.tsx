import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import api from "../../lib/api";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { refreshToken, logout, setRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleLocal] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");

  // Role is display-only in Profile Settings

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("users/profiles/me/");
        setProfileId(data?.id ?? null);
        setUsername(data?.username ?? "");
        setEmail(data?.email ?? "");
        setRoleLocal(data?.role ?? "");
        setFirstName(data?.first_name ?? "");
        setLastName(data?.last_name ?? "");
        setPhone(data?.phone ?? "");
        setJobTitle(data?.job_title ?? "");
        setCompany(data?.company ?? "");
        setAddress(data?.address ?? "");
        let avatar: string | null = data?.avatar || null;
        if (avatar) {
          if (avatar.startsWith("http")) {
            // absolute
          } else if (avatar.startsWith("/")) {
            avatar = `${window.location.origin}${avatar}`;
          } else {
            avatar = `${window.location.origin}/${avatar}`;
          }
          setAvatarUrl(avatar);
        } else {
          setAvatarUrl("");
        }
      } catch (e: any) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!profileId) return;
    setSaving(true);
    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        fd.append("first_name", firstName);
        fd.append("last_name", lastName);
        fd.append("phone", phone);
        fd.append("job_title", jobTitle);
        fd.append("company", company);
        fd.append("address", address);
        const { data } = await api.patch("users/profiles/me/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (data?.role) setRole(data.role);
        setSaved(true);
      } else {
        const payload: any = {
          first_name: firstName,
          last_name: lastName,
          phone,
          job_title: jobTitle,
          company,
          address,
        };
        const { data } = await api.patch("users/profiles/me/", payload);
        if (data?.role) setRole(data.role);
        setSaved(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setAvatarUrl(url);
    }
  }

  async function onLogout() {
    try {
      if (refreshToken) await api.post("auth/logout", { refresh: refreshToken });
    } catch {
      // ignore blacklist errors
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Profile Settings"
        description="Manage personal information and role."
      />
      <PageBreadcrumb pageTitle="Profile Settings" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <form onSubmit={onSave} className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
                <img src={avatarUrl || "/images/user/default-avatar.svg"} alt="Avatar" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <Label>Profile Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarChange}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-white/5 dark:file:text-white/90"
                />
                <p className="mt-1.5 text-xs text-gray-500">PNG/JPG up to ~5MB.</p>
              </div>
            </div>
            <div>
              <Label>Personal Details</Label>
              <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e)=>setLastName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="e.g. +263 77 123 4567" />
                </div>
                <div>
                  <Label>Job title</Label>
                  <Input value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} placeholder="e.g. Land Surveyor" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="e.g. Harare City Council" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Street, City, Zimbabwe" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label>Username</Label>
                <Input value={username} disabled hint="Read-only" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} disabled hint="Read-only" />
              </div>
            </div>
            <div className="sm:max-w-xs">
              <Label>Role</Label>
              <Input value={role} disabled hint="Read-only" />
            </div>
            {error && <p className="text-sm text-error-500">{error}</p>}
            {saved && <p className="text-sm text-success-500">Saved.</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 dark:bg-white/5 dark:text-white/90"
              >
                Log out
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
