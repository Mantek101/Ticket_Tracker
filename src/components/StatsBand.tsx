import type { Ticket } from "../types";
import {
  URGENCY,
  daysUntil,
  fmtDate,
  fmtMoney,
  isOpen,
  urgencyOf,
  windowElapsed,
} from "../lib/utils";
import Gauge from "./Gauge";
import Reveal from "./Reveal";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconGavel,
  IconSms,
} from "./icons";

export default function StatsBand({
  tickets,
  onOpen,
  onICS,
  onSMS,
}: {
  tickets: Ticket[];
  onOpen: (id: string) => void;
  onICS: (t: Ticket) => void;
  onSMS: (t: Ticket) => void;
}) {
  const openTs = tickets.filter(isOpen);
  const overdue = openTs.filter((t) => urgencyOf(t) === "overdue").length;
  const soon = openTs.filter((t) => urgencyOf(t) === "soon").length;
  const finesOut = openTs.reduce((s, t) => s + t.fine, 0);
  const resolved = tickets.length - openTs.length;

  const pressure = Math.min(100, overdue * 34 + soon * 16 + openTs.length * 6);

  const next = openTs
    .slice()
    .sort((a, b) => daysUntil(a.dueOn) - daysUntil(b.dueOn))[0];

  const nextUrg = next ? urgencyOf(next) : "open";
  const nu = URGENCY[nextUrg];
  const dLeft = next ? daysUntil(next.dueOn) : 0;

  return (
    <Reveal>
      <section
        aria-label="Overview"
        className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_250px]"
      >
        {/* pressure gauge */}
        <div className="relative overflow-hidden rounded-lg border border-edge bg-panel p-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
            <IconGavel width={14} height={14} className="text-warn" />
            Deadline pressure
          </div>
          <Gauge pressure={pressure} />
          <p className="mt-2 text-center text-xs leading-relaxed text-dim">
            Weighted from overdue, due-soon
            <br />
            and open citations.
          </p>
        </div>

        {/* next deadline */}
        <div className="relative overflow-hidden rounded-lg border border-edge bg-panel">
          {next ? (
            <>
              <div className={`absolute inset-x-0 top-0 h-1 ${nu.bg}`} />
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
                    Next deadline
                  </span>
                  <span
                    className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${nu.border} ${nu.softBg} ${nu.text}`}
                  >
                    {nu.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                  <div className="leading-none">
                    <span
                      className={`font-display text-[76px] leading-none sm:text-[92px] ${nu.text} ${nextUrg === "overdue" ? "blink-soft" : ""}`}
                    >
                      {Math.abs(dLeft)}
                    </span>
                  </div>
                  <div className="pb-2">
                    <div
                      className={`font-mono text-xs font-bold uppercase tracking-[0.2em] ${nu.text}`}
                    >
                      {dLeft < 0
                        ? `day${dLeft === -1 ? "" : "s"} overdue`
                        : dLeft === 0
                          ? "due today"
                          : `day${dLeft === 1 ? "" : "s"} left`}
                    </div>
                    <h2 className="mt-1 font-display text-2xl leading-tight tracking-wide text-snow sm:text-[28px]">
                      {next.violation}
                    </h2>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-fog">
                  <span>#{next.citationNo}</span>
                  <span>due {fmtDate(next.dueOn)}</span>
                  <span className="text-warn">{fmtMoney(next.fine)}</span>
                  {next.court && <span>{next.court}</span>}
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className={`h-full rounded-full ${nu.bar} transition-[width] duration-700`}
                    style={{ width: `${windowElapsed(next)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-dim">
                  <span>issued {fmtDate(next.issuedOn)}</span>
                  <span>{windowElapsed(next)}% of window gone</span>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button
                    onClick={() => onOpen(next.id)}
                    className="flex items-center gap-1.5 rounded-md bg-snow px-3.5 py-2 text-xs font-extrabold text-ink transition-all hover:brightness-90 active:translate-y-px"
                  >
                    Open case file
                    <IconChevronRight width={13} height={13} strokeWidth={2.4} />
                  </button>
                  <button
                    onClick={() => onICS(next)}
                    className="flex items-center gap-1.5 rounded-md border border-edge px-3.5 py-2 text-xs font-bold text-snow transition-all hover:border-go/60 hover:text-go active:translate-y-px"
                  >
                    <IconCalendar width={14} height={14} />
                    Calendar
                  </button>
                  {next.phone && (
                    <button
                      onClick={() => onSMS(next)}
                      className="flex items-center gap-1.5 rounded-md border border-edge px-3.5 py-2 text-xs font-bold text-snow transition-all hover:border-warn/60 hover:text-warn active:translate-y-px"
                    >
                      <IconSms width={14} height={14} />
                      Text me
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-go/50 bg-go/10 text-go">
                <IconCheck width={28} height={28} strokeWidth={2.4} />
              </span>
              <div className="font-display text-4xl tracking-wider text-go">
                ALL CLEAR
              </div>
              <p className="max-w-xs text-sm text-fog">
                Nothing on the docket. Log a citation if one lands on your
                windshield.
              </p>
            </div>
          )}
        </div>

        {/* ledger */}
        <div className="rounded-lg border border-edge bg-panel p-5">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
            Case ledger
          </div>
          {[
            { k: "Open cases", v: String(openTs.length), c: "text-snow" },
            {
              k: "Overdue",
              v: String(overdue),
              c: overdue > 0 ? "text-danger" : "text-snow",
              pulse: overdue > 0,
            },
            {
              k: "Due ≤ 7 days",
              v: String(soon),
              c: soon > 0 ? "text-warn" : "text-snow",
            },
            {
              k: "Fines outstanding",
              v: fmtMoney(finesOut),
              c: finesOut > 0 ? "text-warn" : "text-snow",
            },
            { k: "Resolved", v: String(resolved), c: "text-go" },
          ].map((row) => (
            <div
              key={row.k}
              className="flex items-center justify-between border-b border-edge/60 py-[9px] last:border-0"
            >
              <span className="flex items-center gap-2 text-[13px] text-fog">
                {row.pulse && (
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-danger" />
                )}
                {row.k}
              </span>
              <span className={`font-mono text-sm font-bold tabular-nums ${row.c}`}>
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
