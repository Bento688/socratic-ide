import React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { clsx } from "clsx";
import { useUIStore } from "../../stores/useUIStore";

export const ToastViewport: React.FC = () => {
  // import toasts from useUIStore
  const toasts = useUIStore((state) => state.toasts);

  return (
    <>
      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-100 flex flex-col gap-2 pointer-events-none items-center">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{ animation: "slideDown 0.3s ease-out forwards" }}
            className={clsx(
              "pointer-events-auto min-w-70 max-w-sm px-4 py-3 rounded-sm border shadow-2xl flex items-center gap-3 backdrop-blur-xl",
              toast.type === "success" &&
                "bg-[#09090b]/90 border-emerald-500/50 text-emerald-500",
              toast.type === "error" &&
                "bg-[#09090b]/90 border-red-500/50 text-red-500",
              toast.type === "info" &&
                "bg-[#09090b]/90 border-blue-500/50 text-blue-500",
            )}
          >
            <div className="shrink-0">
              {toast.type === "success" && <CheckCircle2 size={18} />}
              {toast.type === "error" && <XCircle size={18} />}
              {toast.type === "info" && <Info size={18} />}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-zinc-200">
                {toast.type === "success"
                  ? "Protocol Success"
                  : toast.type === "error"
                    ? "Protocol Failed"
                    : "System Info"}
              </span>
              <span className="text-xs font-medium text-zinc-400 leading-tight">
                {toast.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
