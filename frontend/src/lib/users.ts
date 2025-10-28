import api from "./api";

export interface Profile {
  id: number;
  user: number;
  username: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company?: string | null;
  address?: string | null;
  role: "surveyor" | "manager" | "client" | "admin";
  created_at: string;
  updated_at: string;
}

export async function listProfiles(opts?: { silent?: boolean }): Promise<Profile[]> {
  const { data } = await api.get<Profile[]>("users/profiles/", { silent: opts?.silent ?? false } as any);
  return data as any;
}

export async function updateProfile(id: number, payload: Partial<Profile>): Promise<Profile> {
  const { data } = await api.patch<Profile>(`users/profiles/${id}/`, payload as any);
  return data as any;
}