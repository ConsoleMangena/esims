import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message?: string;
  timeout?: number; // ms
}

interface ToastCtx {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => number;
  remove: (id: number) => void;
  success: (message: string, title?: string, timeout?: number) => void;
  error: (message: string, title?: string, timeout?: number) => void;
  info: (message: string, title?: string, timeout?: number) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = nextId++;
    const item: ToastItem = { id, timeout: 4000, ...t };
    setToasts((arr) => [...arr, item]);
    if (item.timeout && item.timeout > 0) {
      window.setTimeout(() => remove(id), item.timeout);
    }
    return id;
  }, [remove]);

  const success = useCallback((message: string, title?: string, timeout?: number) => {
    push({ kind: "success", message, title, timeout });
  }, [push]);

  const error = useCallback((message: string, title?: string, timeout?: number) => {
    push({ kind: "error", message, title, timeout });
  }, [push]);

  const info = useCallback((message: string, title?: string, timeout?: number) => {
    push({ kind: "info", message, title, timeout });
  }, [push]);

  const value = useMemo(() => ({ toasts, push, remove, success, error, info }), [toasts, push, remove, success, error, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
