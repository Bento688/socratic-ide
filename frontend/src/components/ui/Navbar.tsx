import React from "react";
import { Command, Github, Cpu, BookOpen } from "lucide-react";

export const Navbar: React.FC = () => {
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
      </div>
    </nav>
  );
};
