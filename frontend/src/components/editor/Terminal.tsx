import React, { useEffect, useRef } from "react";
import { Terminal as TerminalIcon, X, Ban, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUIStore } from "../../stores/useUIStore";

export const Terminal: React.FC = () => {
  // app state
  const setIsTerminalOpen = useUIStore((state) => state.setIsTerminalOpen);

  // terminal state
  const clearLogs = useSessionStore((state) => state.clearLogs);
  const logs = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.logs : [];
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="h-[30%] flex flex-col bg-[#09090b] border-t border-zinc-900 shrink-0">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#09090b] border-b border-zinc-900 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Console
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-zinc-800 rounded-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear Console"
          >
            <Ban size={12} />
          </button>
          <button
            onClick={() => setIsTerminalOpen(false)}
            className="p-1 hover:bg-zinc-800 rounded-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Close Terminal"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin">
        {logs.length === 0 && (
          <div className="text-zinc-700 italic">
            No output. Run your code to see results...
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 group">
            <span className="text-zinc-700 shrink-0 mt-px">
              <ChevronRight size={10} />
            </span>
            <span
              className={clsx(
                "break-all whitespace-pre-wrap leading-relaxed",
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "warn"
                    ? "text-amber-400"
                    : log.type === "system"
                      ? "text-zinc-500 italic"
                      : "text-zinc-300",
              )}
            >
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
