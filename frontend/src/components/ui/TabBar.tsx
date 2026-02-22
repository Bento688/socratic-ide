import React from "react";
import { X, Plus, Terminal } from "lucide-react";
import { clsx } from "clsx";
import { useSessionStore } from "@/src/stores/useSessionStore";

export const TabBar: React.FC = () => {
  // imports from store
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const switchSession = useSessionStore((state) => state.switchSession);
  const addSession = useSessionStore((state) => state.addSession);
  const removeSession = useSessionStore((state) => state.removeSession);

  return (
    <div className="flex items-center h-9 bg-[#09090b] border-b border-zinc-900 overflow-x-auto scrollbar-hide select-none shrink-0">
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => switchSession(session.id)}
          className={clsx(
            "group flex items-center gap-2 px-3 h-full border-r border-zinc-900 min-w-30 max-w-30 cursor-pointer transition-colors relative",
            session.id === activeSessionId
              ? "bg-[#09090b] text-zinc-200"
              : "bg-[#0c0c0e] text-zinc-500 hover:bg-[#121214] hover:text-zinc-400",
          )}
        >
          {/* Active Top Border Indicator */}
          {session.id === activeSessionId && (
            <div className="absolute top-0 left-0 right-0 h-px bg-emerald-500" />
          )}

          <Terminal
            size={10}
            className={clsx(
              "shrink-0",
              session.persona === "helios"
                ? "text-emerald-500"
                : session.persona === "athena"
                  ? "text-purple-500"
                  : "text-zinc-600",
            )}
          />

          <span className="text-[11px] font-mono truncate flex-1">
            {session.title}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeSession(session.id);
            }}
            className={clsx(
              "opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-zinc-800 transition-all",
              sessions.length === 1 && "hidden",
            )}
          >
            <X size={10} />
          </button>
        </div>
      ))}

      <button
        onClick={addSession}
        className="h-full px-3 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors border-r border-zinc-900"
        title="New Chat"
      >
        <Plus size={14} />
      </button>

      <div className="flex-1 bg-[#0c0c0e] h-full" />
    </div>
  );
};
