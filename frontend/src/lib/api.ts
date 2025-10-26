import axios, { AxiosError } from "axios";
import { STORAGE_KEY } from "../context/AuthContext";
import { decrementLoading, incrementLoading } from "./loadingBus";

const baseURL = (import.meta as any)?.env?.VITE_API_BASE ||
  (typeof window !== "undefined" ? `${window.location.origin}/api/` : "/api/");

export const api = axios.create({ baseURL });

function getTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const { accessToken, refreshToken } = JSON.parse(raw);
    return { accessToken, refreshToken } as {
      accessToken: string | null;
      refreshToken: string | null;
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function setAccessToken(newAccess: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, accessToken: newAccess })
    );
  } catch {
    /* ignore storage errors */
  }
}

function setRefreshToken(newRefresh: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, refreshToken: newRefresh })
    );
  } catch {
    /* ignore storage errors */
  }
}

api.interceptors.request.use((config) => {
  const cfg: any = config;
  const silent = !!cfg.silent;
  if (!silent) {
    try { incrementLoading(); } catch {}
    cfg.__counted = true;
  }
  const { accessToken } = getTokens();
  if (accessToken) {
    cfg.headers = cfg.headers || {};
    cfg.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false as boolean;
let queue: Array<{ resolve: () => void; reject: (e: any) => void }> = [];

function waitForRefresh() {
  return new Promise<void>((resolve, reject) => queue.push({ resolve, reject }));
}

function flushQueue(error?: any) {
  if (error) queue.forEach((p) => p.reject(error));
  else queue.forEach((p) => p.resolve());
  queue = [];
}

api.interceptors.response.use(
  (r) => {
    const cfg: any = r.config || {};
    if (cfg.__counted) { try { decrementLoading(); } catch {} }
    return r;
  },
  async (error: AxiosError) => {
    const original: any = error.config || {};
    if ((original as any).__counted) { try { decrementLoading(); } catch {} }
    if (error.response?.status === 401 && !original._retry) {
      const { refreshToken } = getTokens();
      if (!refreshToken) return Promise.reject(error);

      if (isRefreshing) {
        await waitForRefresh();
        return api(original);
      }

      isRefreshing = true;
      original._retry = true;
      try {
        const resp = await api.post("auth/refresh", { refresh: refreshToken }, { silent: true } as any);
        const newAccess = resp.data?.access;
        const newRefresh = (resp.data as any)?.refresh;
        if (newAccess) setAccessToken(newAccess);
        if (newRefresh) setRefreshToken(newRefresh);
        isRefreshing = false;
        flushQueue();
        const resp2 = await api({ ...original, silent: !!(original as any).silent } as any);
        return resp2;
      } catch (e) {
        isRefreshing = false;
        flushQueue(e);
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
