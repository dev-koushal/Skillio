import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Skillio ErrorBoundary caught error]:", error, errorInfo);

    const msg = error?.message || "";
    // If it's a stale chunk or missing reference from an outdated cached bundle, auto-recover
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("dynamically imported module") ||
      msg.includes("ArrowLeft") ||
      msg.includes("ArrowLef") ||
      msg.includes("is not defined") ||
      msg.includes("Unexpected token")
    ) {
      const now = Date.now();
      const lastReload = parseInt(sessionStorage.getItem("eb_reload_ts") || "0", 10);
      if (now - lastReload > 3000) {
        sessionStorage.setItem("eb_reload_ts", String(now));
        if (typeof window !== "undefined") {
          if ("caches" in window) {
            caches.keys().then((keys) => {
              return Promise.all(keys.map((k) => caches.delete(k)));
            }).then(() => {
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => {
                  for (const reg of regs) reg.unregister();
                  window.location.reload(true);
                });
              } else {
                window.location.reload(true);
              }
            });
            return;
          }
          window.location.reload(true);
          return;
        }
      }
    }
  }

  handleManualReload = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("eb_reload_ts");
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              for (const reg of regs) reg.unregister();
              window.location.reload(true);
            });
          } else {
            window.location.reload(true);
          }
        });
      } else {
        window.location.reload(true);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf9fd] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-2xl bg-white border border-[#e5e1ec] p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#7057c8] flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              ↻
            </div>
            <h2 className="text-xl font-bold text-[#282035] mb-2">Updating to latest version</h2>
            <p className="text-sm text-[#777281] mb-6">
              A newer version of this page is ready. Tap below to refresh with the latest updates.
            </p>
            <button
              onClick={this.handleManualReload}
              className="w-full min-h-11 rounded-xl bg-[#7057c8] hover:bg-[#5f46b8] text-white font-semibold text-sm transition shadow-sm cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
