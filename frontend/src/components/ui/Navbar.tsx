import React, { useState } from "react";
import {
  Command,
  Github,
  Cpu,
  BookOpen,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import { useSession, signOut } from "../../lib/auth-client";
import { useUIStore } from "@/stores/useUIStore";

export const Navbar: React.FC = () => {
  const { data: session, isPending } = useSession();

  const openLoginModal = useUIStore((state) => state.openLoginModal);

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          // physically dumps the React DOM from RAM and request a fresh, clean slate from the server
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <nav className="h-14 border-b border-zinc-900 bg-[#09090b] flex items-center justify-between px-6 select-none shrink-0 z-50">
      <div className="flex items-center gap-3 group cursor-pointer">
        <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm group-hover:scale-105 transition-transform duration-300">
          <Cpu size={18} className="text-black" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono font-bold text-white tracking-tighter text-sm leading-none">
            SOCRATIC<span className="text-zinc-600">_IDE</span>
          </span>
          <span className="text-[10px] text-zinc-600 font-mono leading-none mt-1">
            Build. Break. Learn.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[10px] font-mono font-medium text-zinc-500">
        <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
          <Command size={12} />
          <span>Shortcuts</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
          <BookOpen size={12} />
          <span>Manifesto</span>
        </div>

        <div className="w-px h-3 bg-zinc-800" />

        <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
          <Github size={12} />
          <span>v1.0.0</span>
        </div>

        {/* --- AUTHENTICATION MODULE --- */}
        <div className="w-px h-3 bg-zinc-800" />

        <div className="flex items-center gap-3">
          {isPending ? (
            <Loader2 size={12} className="animate-spin text-zinc-600" />
          ) : session ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-zinc-300">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar"
                    className="w-4 h-4 rounded-sm"
                  />
                ) : (
                  <User size={12} />
                )}
                <span className="tracking-wider">{session.user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal} // <-- Trigger the global state
              className="flex items-center gap-1.5 text-white hover:text-zinc-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <User size={12} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
