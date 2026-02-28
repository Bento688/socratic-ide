import React from "react";
import { Coffee, MessageSquare, X, Zap } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

export const QuotaModal: React.FC = () => {
  const isQuotaModalOpen = useUIStore((state) => state.isQuotaModalOpen);
  const closeQuotaModal = useUIStore((state) => state.closeQuotaModal);
  const quotaUnlockTime = useUIStore((state) => state.quotaUnlockTime);

  if (!isQuotaModalOpen) return null;

  // Dynamically format the time using the browser's exact timezone
  let timeString = "tomorrow";
  if (quotaUnlockTime) {
    const unlockDate = new Date(quotaUnlockTime);
    const formattedDate = unlockDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const formattedTime = unlockDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    timeString = `${formattedDate}, at ${formattedTime}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-200 font-medium">
            <Zap size={16} className="text-amber-500" />
            Daily Energy Depleted
          </div>
        </div>

        {/* Body */}
        <div className="p-6 text-sm text-zinc-400 leading-relaxed text-center">
          <p className="mb-4">
            Hello! Thank you for using our service. To ensure the system remains
            stable for everyone, your daily AI generations are capped.
          </p>
          <p className="font-medium text-zinc-200 mb-6 bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
            Your limit will regenerate <br />
            <span className="text-amber-500">{timeString}</span>
          </p>
          <p>
            In the meantime, if you enjoyed your experience, please consider
            supporting the project or letting us know how we can improve!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#09090b] border-t border-zinc-800 flex flex-col gap-2">
          <a
            href="https://github.com/Bento688/socratic-ide/issues" // Update your link
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors text-sm font-medium"
          >
            <MessageSquare size={14} />
            Feedback / Report a Bug
          </a>
          <a
            href="https://buymeacoffee.com/your-username" // Update your link
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded transition-colors text-sm font-medium"
          >
            <Coffee size={14} />
            Donate to the Developer
          </a>
          <button
            onClick={closeQuotaModal}
            className="w-full py-2 mt-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
