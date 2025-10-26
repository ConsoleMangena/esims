import api from "./api";

export interface Project {
  id: number;
  name: string;
  description: string;
  owner: number | null;
  created_at: string;
  updated_at: string;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>("projects/");
  return data as any;
}

export async function createProject(payload: { name: string; description?: string }) {
  const { data } = await api.post<Project>("projects/", payload);
  return data as any;
}

export async function updateProject(id: number, payload: { name?: string; description?: string }) {
  const { data } = await api.patch<Project>(`projects/${id}/`, payload);
  return data as any;
}

export async function deleteProject(id: number) {
  await api.delete(`projects/${id}/`);
  return true;
}
