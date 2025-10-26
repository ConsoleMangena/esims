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
