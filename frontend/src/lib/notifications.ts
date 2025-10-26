import api from "./api";

export interface Notification {
  id: number;
  user: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications(params?: { unread?: boolean }) {
  const { data } = await api.get<Notification[]>("notifications/", {
    params: params?.unread ? { unread: true } : undefined,
  });
  return data as any;
}

export async function markRead(id: number) {
  const { data } = await api.post<Notification>(`notifications/${id}/mark-read/`);
  return data as any;
}

export async function markAllRead() {
  const { data } = await api.post<{ status: string }>(`notifications/mark-all-read/`);
  return data as any;
}
