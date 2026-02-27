export const IDESkeleton = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] overflow-hidden">
      {/* Navbar Skeleton (h-14) */}
      <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800/80 rounded-sm animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 bg-zinc-800/80 rounded animate-pulse" />
            <div className="h-2 w-16 bg-zinc-900 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse hidden md:block" />
          <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse hidden md:block" />
          <div className="w-px h-3 bg-zinc-900" />
          <div className="h-6 w-16 bg-zinc-800/80 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Task Banner Skeleton */}
      <div className="h-8 border-b border-zinc-900 px-6 flex items-center gap-4 shrink-0 bg-[#09090b]">
        <div className="h-3 w-20 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-3 w-px bg-zinc-900" />
        <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane (60%) */}
        <div className="w-[60%] h-full border-r border-zinc-900 bg-[#09090b] p-8 space-y-4">
          <div className="space-y-2 mb-8">
            <div className="h-4 w-1/3 bg-zinc-800/40 rounded animate-pulse" />
            <div className="h-4 w-1/4 bg-zinc-800/40 rounded animate-pulse" />
          </div>
          {/* Simulated Code Lines */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-3 bg-zinc-800/20 rounded animate-pulse"
              style={{
                width: `${Math.max(20, Math.random() * 70)}%`,
                marginLeft: `${Math.random() > 0.5 ? "20px" : "0px"}`,
              }}
            />
          ))}
        </div>

        {/* Chat Pane (40%) */}
        <div className="w-[40%] h-full bg-[#09090b] p-6 flex flex-col">
          <div className="flex-1 flex flex-col justify-end space-y-6 pb-6">
            <div className="w-3/4 h-20 bg-zinc-900/50 rounded-xl rounded-tl-sm animate-pulse self-start" />
            <div className="w-2/3 h-16 bg-zinc-800/30 rounded-xl rounded-tr-sm animate-pulse self-end" />
            <div className="w-5/6 h-24 bg-zinc-900/50 rounded-xl rounded-tl-sm animate-pulse self-start" />
          </div>
          {/* Input Box Skeleton */}
          <div className="h-12 w-full bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse shrink-0" />
        </div>
      </div>
    </div>
  );
};
