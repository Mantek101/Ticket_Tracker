import { useEffect, useState } from "react";
import { IconPlus, ShieldMark } from "./icons";

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden text-right leading-tight md:block">
      <div className="font-mono text-sm font-bold tabular-nums text-snow">
        {now.toLocaleTimeString("en-US", { hour12: false })}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
        {now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

export default function Header({ onNew }: { onNew: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-panel/92 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <ShieldMark className="h-10 w-10 drop-shadow-[0_2px_6px_rgba(31,178,107,0.35)]" />
          <div className="leading-none">
            <div className="font-display text-[22px] tracking-wide text-snow">
              CITE<span className="text-warn">TRACK</span>
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-fog">
              Traffic citation control
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <LiveClock />
          <button
            onClick={onNew}
            className="flex items-center gap-2 rounded-md bg-warn px-4 py-2.5 text-sm font-extrabold text-ink shadow-[0_3px_0_#7a5100] transition-all hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_#7a5100]"
          >
            <IconPlus width={16} height={16} strokeWidth={2.6} />
            <span className="hidden sm:inline">Log citation</span>
            <span className="sm:hidden">Log</span>
          </button>
        </div>
      </div>
      {/* animated center lane line */}
      <div className="border-t border-edge/70 bg-ink">
        <div className="road-line mx-auto h-[6px] max-w-6xl opacity-80" />
      </div>
    </header>
  );
}
