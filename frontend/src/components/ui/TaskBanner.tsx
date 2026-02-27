import { useSessionStore } from "../../stores/useSessionStore";
import { Terminal } from "lucide-react";

export const TaskBanner = () => {
  // Wire up the precise selector for the active task
  const activeTask = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session
      ? session.history[session.currentStep].activeTask
      : "Pending Onboarding...";
  });
  return (
    <div className="bg-[#09090b] border-b border-zinc-900 px-6 py-2 flex items-center gap-4 shrink-0">
      <div className="flex items-center gap-2 text-zinc-500">
        <Terminal className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Active Protocol
        </span>
      </div>
      <div className="h-3 w-px bg-zinc-900" />
      <p className="text-xs font-medium text-zinc-400 font-mono tracking-tight truncate">
        {activeTask}
      </p>
    </div>
  );
};
