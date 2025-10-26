import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import { listNotifications, markAllRead, markRead, type Notification } from "../../lib/notifications";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications(unreadOnly ? { unread: true } : undefined);
      setItems(data);
    } catch (e: any) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  async function onMarkRead(id: number) {
    setBusy(true);
    try {
      const updated = await markRead(id);
      setItems((arr) => arr.map((n) => (n.id === id ? updated : n)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to mark as read");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkAllRead() {
    setBusy(true);
    try {
      await markAllRead();
      setItems((arr) => arr.map((n) => ({ ...n, is_read: true })));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to mark all as read");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta title="ESIMS - Notifications" description="View and manage your notifications." />
      <PageBreadcrumb pageTitle="Notifications" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-white/90">{unreadCount}</span> unread
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500/50 dark:border-gray-700"
              />
              Unread only
            </label>
            <button
              onClick={onMarkAllRead}
              disabled={busy || unreadCount === 0}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white/90"
            >
              Mark all read
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-error-500">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Message</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">No notifications.</td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr key={n.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-800 dark:text-white/90">{n.title}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300 max-w-[420px] truncate" title={n.body}>{n.body}</td>
                    <td className="py-2 pr-4">
                      {n.is_read ? (
                        <span className="rounded bg-gray-100 text-gray-700 px-2 py-0.5 text-xs">Read</span>
                      ) : (
                        <span className="rounded bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs">Unread</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      {!n.is_read && (
                        <button
                          disabled={busy}
                          onClick={() => onMarkRead(n.id)}
                          className="px-3 py-1 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                        >
                          Mark read
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
