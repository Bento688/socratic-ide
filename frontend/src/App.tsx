import React, { useEffect, useState } from "react";
import { Terminal, ShieldAlert } from "lucide-react";
import CodeEditor from "./components/editor/CodeEditor";
import ChatInterface from "./components/mentor/ChatInterface";
import { Navbar } from "./components/ui/Navbar";
import { ToastViewport } from "./components/ui/Toast";
import { TabBar } from "./components/ui/TabBar";
import { useSessionStore } from "@/src/stores/useSessionStore";

// Banner Component
const TaskBanner = () => {
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

// Main Layout Component
const IdeLayout = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#09090b] text-zinc-500 p-8 text-center font-mono">
        <ShieldAlert className="w-12 h-12 mb-4 text-white" />
        <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
          TERMINAL WIDTH INSUFFICIENT
        </h2>
        <p className="text-xs">
          Helios refuses to operate on mobile viewports.
        </p>
        <p className="mt-4 text-[10px] uppercase tracking-widest opacity-60">
          Error Code: ID_10_T
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-200 overflow-hidden font-sans">
      <Navbar />
      <TabBar />
      <TaskBanner />
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane (60%) */}
        <div className="w-[60%] h-full relative border-r border-zinc-900 bg-[#09090b]">
          <CodeEditor />
        </div>

        {/* Chat Pane (40%) */}
        <div className="w-[40%] h-full relative bg-[#09090b]">
          <ChatInterface />
        </div>
      </div>
      <ToastViewport />
    </div>
  );
};

const App: React.FC = () => {
  return <IdeLayout />;
};

export default App;
