import api from "./api";

export type SurveyStatus = "submitted" | "approved" | "rejected";

export interface Survey {
  id: number;
  project: number;
  title: string;
  description: string;
  ipfs_cid: string;
  checksum_sha256: string;
  status: SurveyStatus;
  submitted_by: number | null;
  file?: string | null;
  recovered_file?: string | null;
  file_category?: string | null;
  file_mime_type?: string | null;
  file_ext?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSurveyPayload {
  project: number;
  title: string;
  description?: string;
  ipfs_cid: string;
  checksum_sha256: string;
  file?: File | null;
  extra_files?: File[];
  file_category?: string;
}

export async function listSurveys(): Promise<Survey[]> {
  const { data } = await api.get<Survey[]>("surveys/");
  return data as any;
}

export async function createSurvey(payload: CreateSurveyPayload, opts?: { skipChain?: boolean; silent?: boolean }): Promise<Survey> {
  const hasFile = !!payload.file;
  if (hasFile) {
    const fd = new FormData();
    fd.append("project", String(payload.project));
    fd.append("title", payload.title);
    if (payload.description) fd.append("description", payload.description);
    fd.append("ipfs_cid", payload.ipfs_cid);
    fd.append("checksum_sha256", payload.checksum_sha256);
    if (payload.file) fd.append("file", payload.file);
    if (payload.extra_files && payload.extra_files.length) {
      for (const f of payload.extra_files) fd.append("extra_files", f);
    }
    if (payload.file_category) fd.append("file_category", payload.file_category);
    const { data } = await api.post<Survey>("surveys/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      params: opts?.skipChain ? { skip_chain: 1 } : undefined,
      silent: opts?.silent ?? false,
    } as any);
    return data as any;
  }
  const { data } = await api.post<Survey>("surveys/", payload, {
    params: opts?.skipChain ? { skip_chain: 1 } : undefined,
    silent: opts?.silent ?? false,
  } as any);
  return data as any;
}

export async function approveSurvey(id: number, opts?: { skipChain?: boolean; silent?: boolean }): Promise<Survey> {
  const { data } = await api.post<Survey>(`surveys/${id}/approve/`, null, {
    params: opts?.skipChain ? { skip_chain: 1 } : undefined,
    silent: opts?.silent ?? false,
  } as any);
  return data as any;
}

export async function rejectSurvey(id: number, opts?: { skipChain?: boolean; silent?: boolean }): Promise<Survey> {
  const { data } = await api.post<Survey>(`surveys/${id}/reject/`, null, {
    params: opts?.skipChain ? { skip_chain: 1 } : undefined,
    silent: opts?.silent ?? false,
  } as any);
  return data as any;
}

export async function anchorFullFile(id: number, opts?: { silent?: boolean }): Promise<{ anchored_chunks: number; transactions: string[]; }> {
  const { data } = await api.post(`surveys/${id}/anchor-file/`, null, {
    silent: opts?.silent ?? false,
  } as any);
  return data as any;
}

export async function recoverFullFile(id: number, body?: { data_kek_b64?: string; data_kek_version?: number }, opts?: { silent?: boolean }): Promise<{ recovered_bytes: number; stored: boolean; }> {
  const { data } = await api.post(`surveys/${id}/recover-file/`, body || null, {
    silent: opts?.silent ?? false,
  } as any);
  return data as any;
}

export function summarizeStatuses(items: Survey[]) {
  return items.reduce(
    (acc, s) => {
      acc.total += 1;
      acc[s.status] += 1;
      return acc;
    },
    { total: 0, submitted: 0, approved: 0, rejected: 0 } as Record<string, number>
  );
}
