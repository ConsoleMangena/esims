import { useEffect, useRef, useState } from "react";
import { getLoadingCount, subscribeLoading } from "../../lib/loadingBus";
import { useAuth } from "../../context/AuthContext";

// UX: only show overlay if loading lasts > delayMs, and keep it visible for at least minVisibleMs once shown
const delayMs = 200;
const minVisibleMs = 300;

export default function LoadingOverlay() {
  const { accessToken } = useAuth();
  // Do not show the overlay after sign-in
  if (accessToken) return null;
  const [count, setCount] = useState<number>(getLoadingCount());
  const [visible, setVisible] = useState(false);
  const delayTimer = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => subscribeLoading(setCount), []);

  useEffect(() => {
    // When we start loading
    if (count > 0) {
      // If already visible, do nothing
      if (visible) return;
      // Start delay timer
      if (delayTimer.current) window.clearTimeout(delayTimer.current);
      delayTimer.current = window.setTimeout(() => {
        setVisible(true);
        shownAt.current = Date.now();
      }, delayMs);
    } else {
      // When loading finishes
      if (delayTimer.current) {
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
      if (visible) {
        const elapsed = shownAt.current ? Date.now() - shownAt.current : minVisibleMs;
        const remain = Math.max(0, minVisibleMs - elapsed);
        window.setTimeout(() => {
          setVisible(false);
          shownAt.current = null;
        }, remain);
      }
    }
  }, [count, visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/60 border-t-brand-500" />
    </div>
  );
}
