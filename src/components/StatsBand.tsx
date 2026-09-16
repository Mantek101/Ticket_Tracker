import type { Ticket } from "../types";
import {
  URGENCY,
  daysUntil,
  fmtDate,
  fmtMoney,
  isOpen,
  urgencyOf,
} from "../lib/utils";
import Reveal from "./Reveal";
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconSms,
  IconTicket,
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

  const next = openTs
    .slice()
    .sort((a, b) => daysUntil(a.dueOn) - daysUntil(b.dueOn))[0];

  const nextUrg = next ? urgencyOf(next) : "open";
  const nu = URGENCY[nextUrg];
  const dLeft = next ? daysUntil(next.dueOn) : 0;

  return (
    <Reveal>
      <section aria-label="Overview" className="mt-6 space-y-4">
        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open Tickets"
            value={String(openTs.length)}
            icon={<IconTicket width={18} height={18} className="text-blue" />}
          />
          <StatCard
            label="Overdue"
            value={String(overdue)}
            icon={<IconAlert width={18} height={18} className={overdue > 0 ? "text-red" : "text-muted"} />}
            highlight={overdue > 0}
          />
          <StatCard
            label="Fines Outstanding"
            value={fmtMoney(finesOut)}
            icon={<IconClock width={18} height={18} className={finesOut > 0 ? "text-amber" : "text-muted"} />}
          />
          <StatCard
            label="Resolved"
            value={String(resolved)}
            icon={<IconCheck width={18} height={18} className="text-green" />}
          />
        </div>

        {/* Next deadline card */}
        {next && (
          <div className={`rounded-xl border bg-surface p-5 ${nu.border}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${nu.softBg} ${nu.text}`}>
                    {nu.label}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    #{next.citationNo}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-text truncate">
                  {next.violation}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>Due {fmtDate(next.dueOn)}</span>
                  <span className="font-semibold text-text2">{fmtMoney(next.fine)}</span>
                  {next.court && <span>{next.court}</span>}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center rounded-lg bg-raised px-5 py-3">
                <span className={`font-display text-4xl font-extrabold leading-none ${nu.text} ${nextUrg === "overdue" ? "blink-soft" : ""}`}>
                  {Math.abs(dLeft)}
                </span>
                <span className={`mt-1 font-mono text-[10px] font-bold uppercase tracking-wider ${nu.text}`}>
                  {dLeft < 0 ? "days overdue" : dLeft === 0 ? "due today" : "days left"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onOpen(next.id)}
                className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy2"
              >
                View details
                <IconChevronRight width={14} height={14} />
              </button>
              <button
                onClick={() => onICS(next)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition-colors hover:border-blue hover:text-blue"
              >
                <IconCalendar width={14} height={14} />
                Add to calendar
              </button>
              {next.phone && (
                <button
                  onClick={() => onSMS(next)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition-colors hover:border-blue hover:text-blue"
                >
                  <IconSms width={14} height={14} />
                  Text reminder
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </Reveal>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-surface p-4 ${highlight ? "border-red-border bg-red-soft" : "border-border"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${highlight ? "text-red" : "text-text"}`}>
        {value}
      </div>
    </div>
  );
}
