import { useEffect } from "react";
import { useToast } from "../../../context/ToastContext";

export default function Toaster() {
  const { toasts, remove } = useToast();

  // Escape to clear all (optional)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // no-op: keep toasts unless needed
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100000] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`min-w-[260px] max-w-[380px] rounded-lg border px-4 py-3 shadow-theme-md text-sm flex items-start gap-3
            ${t.kind === "success" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300" : ""}
            ${t.kind === "error" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300" : ""}
            ${t.kind === "info" ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300" : ""}
          `}
          role="status"
          aria-live="polite"
        >
          <div className="mt-0.5">
            {t.kind === "success" && (
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"></span>
            )}
            {t.kind === "error" && (
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-red-500"></span>
            )}
            {t.kind === "info" && (
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            )}
          </div>
          <div className="flex-1">
            {t.title && <p className="font-medium mb-0.5">{t.title}</p>}
            {t.message && <p className="opacity-90">{t.message}</p>}
          </div>
          <button
            className="ml-2 text-xs opacity-70 hover:opacity-100"
            onClick={() => remove(t.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
