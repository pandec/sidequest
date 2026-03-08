import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot);
  const [dismissed, setDismissed] = useState(false);

  // Auto-reset dismissed state when going offline again
  useEffect(() => {
    if (!online) setDismissed(false);
  }, [online]);

  if (online || dismissed) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-amber-600 px-4 py-2 text-sm text-white">
      <span>You're offline. Connect to the internet to continue.</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 rounded px-2 py-0.5 text-white/80 hover:bg-white/20 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
