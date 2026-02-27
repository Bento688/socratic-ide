import CodeEditor from "../components/editor/CodeEditor";
import ChatInterface from "../components/mentor/ChatInterface";
import { Navbar } from "../components/ui/Navbar";
import { TabBar } from "../components/ui/TabBar";
import { TaskBanner } from "../components/ui/TaskBanner";
import { ToastViewport } from "../components/ui/Toast";
import { IDESkeleton } from "../components/ui/skeletons/IDESkeleton";

import { useSessionStore } from "../stores/useSessionStore";
import { useSession } from "../lib/auth-client";

import { ShieldAlert } from "lucide-react";

import { useEffect, useState } from "react";

// Banner Component

// Main Layout Component
const IDE = () => {
  /**
   * --- CHECK AUTH STATE ---
   */
  const { isPending } = useSession();

  /**
   * --- LOAD SESSIONS ---
   */
  const loadSessions = useSessionStore((state) => state.loadSessions);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   *  --- CHECK MOBILE DEVICE ---
   */
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- THE GATEKEEPER ---
  if (isPending) {
    return <IDESkeleton />;
  }

  // --- MOBILE CHECK ---
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

  // --- RETURN IDE IF VALID ---
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

export default IDE;
