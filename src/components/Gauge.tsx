import { useMemo } from "react";

/**
 * Speedometer-style "deadline pressure" gauge.
 * pressure: 0–100
 */
export default function Gauge({ pressure }: { pressure: number }) {
  const p = Math.max(0, Math.min(100, pressure));
  const angle = -90 + (p / 100) * 180;

  const ticks = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (-180 + (i / 20) * 180) * (Math.PI / 180);
      const major = i % 5 === 0;
      const r1 = major ? 74 : 79;
      arr.push({
        x1: 100 + r1 * Math.cos(a),
        y1: 100 + r1 * Math.sin(a),
        x2: 100 + 86 * Math.cos(a),
        y2: 100 + 86 * Math.sin(a),
        major,
      });
    }
    return arr;
  }, []);

  const word =
    p === 0
      ? "CLEAR"
      : p < 25
        ? "LOW"
        : p < 50
          ? "MODERATE"
          : p < 75
            ? "HIGH"
            : "CRITICAL";

  const wordColor =
    p === 0
      ? "text-go"
      : p < 50
        ? "text-warn"
        : "text-danger";

  const arc = (from: number, to: number, color: string) => {
    const a1 = (-180 + from * 1.8) * (Math.PI / 180);
    const a2 = (-180 + to * 1.8) * (Math.PI / 180);
    const r = 64;
    const x1 = 100 + r * Math.cos(a1);
    const y1 = 100 + r * Math.sin(a1);
    const x2 = 100 + r * Math.cos(a2);
    const y2 = 100 + r * Math.sin(a2);
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={color}
        strokeWidth="9"
        strokeLinecap="butt"
        fill="none"
        opacity="0.9"
      />
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-[240px]">
        {arc(0, 49, "var(--color-go)")}
        {arc(51, 74, "var(--color-warn)")}
        {arc(76, 100, "var(--color-danger)")}
        {ticks.map((t, i) => (
          <line
            key={i}
            {...t}
            stroke={t.major ? "var(--color-fog)" : "var(--color-edge2)"}
            strokeWidth={t.major ? 2 : 1}
          />
        ))}
        <g
          className="needle"
          style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 100px" }}
        >
          <path d="M100 30 L104 96 L96 96 Z" fill="var(--color-snow)" />
          <circle cx="100" cy="100" r="9" fill="var(--color-raised)" stroke="var(--color-edge2)" strokeWidth="2" />
          <circle cx="100" cy="100" r="3.5" fill="var(--color-warn)" />
        </g>
      </svg>
      <div className="-mt-1 flex items-baseline gap-2">
        <span className={`font-display text-2xl tracking-wider ${wordColor}`}>
          {word}
        </span>
        <span className="font-mono text-xs text-dim">{Math.round(p)}/100</span>
      </div>
    </div>
  );
}
