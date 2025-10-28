import { useEffect, useMemo, useRef, useState } from "react";
import { listNotifications, markAllRead, type Notification } from "../lib/notifications";
import { useToast } from "../context/ToastContext";

export function useNotificationFeed(opts?: { unreadOnly?: boolean }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications(opts?.unreadOnly ? { unread: true, silent: true } : { silent: true } as any);
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.unreadOnly]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  return { items, setItems, loading, error, unreadCount, refresh };
}

export function useNotificationToasts(pollMs = 30000) {
  const { info } = useToast();
  const lastSeen = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    let stopped = false;

    async function tick() {
      try {
        const data = await listNotifications({ silent: true } as any);
        // Newest first per backend ordering
        if (!Array.isArray(data)) return;
        if (data.length === 0) return;
        const latestId = data[0].id;
        if (lastSeen.current == null) {
          lastSeen.current = latestId;
        } else if (latestId > (lastSeen.current || 0)) {
          // Find new items and push toasts (limit to 3 to avoid spam)
          const newOnes = data.filter((n: Notification) => n.id > (lastSeen.current || 0)).slice(0, 3);
          for (const n of newOnes) {
            info(n.body || n.title || "New notification", n.title || undefined, 5000);
          }
          lastSeen.current = latestId;
        }
      } catch {
        // ignore
      } finally {
        if (!stopped) timer = window.setTimeout(tick, pollMs);
      }
    }

    timer = window.setTimeout(tick, 1000);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pollMs, info]);
}

export async function markAllNotificationsReadLocal(setter: (items: Notification[] | ((prev: Notification[]) => Notification[])) => void) {
  await markAllRead();
  setter((arr) => arr.map((n) => ({ ...n, is_read: true })));
}