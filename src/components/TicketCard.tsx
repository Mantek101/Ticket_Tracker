import { useMemo, type ReactNode } from "react";
import type { Ticket } from "../types";
import {
  STATUS_LABEL,
  URGENCY,
  daysUntil,
  fmtDate,
  fmtMoney,
  isOpen,
  urgencyOf,
  windowElapsed,
} from "../lib/utils";
import {
  IconCalendar,
  IconCheck,
  IconClip,
  IconFlag,
  IconNote,
  IconSms,
  IconTrash,
} from "./icons";

function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    let h = 2166136261;
    for (const c of seed) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    const out: number[] = [];
    for (let i = 0; i < 26; i++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      out.push(((h >>> 16) % 3) + 1);
    }
    return out;
  }, [seed]);
  return (
    <div className="flex h-7 items-end gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span
          key={i}
          className="bg-fog/70"
          style={{ width: `${w}px`, height: `${22 - (i % 3) * 4}px` }}
        />
      ))}
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-md border border-edge p-2 text-fog opacity-70 transition-all hover:opacity-100 active:translate-y-px ${
        danger
          ? "hover:border-danger/60 hover:bg-danger/10 hover:text-danger"
          : "hover:border-edge2 hover:bg-raised hover:text-snow"
      }`}
    >
      {children}
    </button>
  );
}

export default function TicketCard({
  ticket: t,
  onOpen,
  onICS,
  onSMS,
  onPaid,
  onDelete,
}: {
  ticket: Ticket;
  onOpen: () => void;
  onICS: () => void;
  onSMS: () => void;
  onPaid: () => void;
  onDelete: () => void;
}) {
  const urg = urgencyOf(t);
  const u = URGENCY[urg];
  const d = daysUntil(t.dueOn);
  const open = isOpen(t);
  const elapsed = windowElapsed(t);

  return (
    <article
      onClick={onOpen}
      className={`group relative grid cursor-pointer grid-cols-1 overflow-hidden rounded-md border border-edge bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-edge2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:grid-cols-[58px_minmax(0,1fr)_196px] ${
        open ? "" : "opacity-75 hover:opacity-100"
      }`}
    >
      {/* urgency rail */}
      <span className={`absolute inset-y-0 left-0 z-10 w-[3px] ${u.bg} ${urg === "closed" ? "opacity-40" : ""}`} />

      {/* perforation notches */}
      <span className="notch-top hidden sm:block" style={{ left: 50, top: -9 }} />
      <span className="notch-bottom hidden sm:block" style={{ left: 50, bottom: -9 }} />

      {/* stub */}
      <div className="relative hidden flex-col items-center justify-between gap-3 border-r border-dashed border-edge bg-raised/50 py-4 sm:flex">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-dim"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {t.citationNo}
        </span>
        <Barcode seed={t.citationNo + t.id} />
      </div>

      {/* body */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <h3
            className={`font-display text-xl leading-snug tracking-wide ${
              open ? "text-snow" : "text-fog"
            } transition-colors group-hover:text-warn`}
          >
            {t.violation}
          </h3>
          <span
            className={`ml-auto shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
              t.status === "contesting"
                ? "border-warn/50 bg-warn/10 text-warn"
                : t.status === "open"
                  ? "border-go/40 bg-go/10 text-go"
                  : "border-edge bg-raised text-fog"
            }`}
          >
            {t.status === "contesting" && (
              <IconFlag width={10} height={10} className="mr-1 inline-block -translate-y-px" />
            )}
            {STATUS_LABEL[t.status]}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-fog">
          <span className="text-dim">
            issued <span className="text-fog">{fmtDate(t.issuedOn)}</span>
          </span>
          {t.location && <span>{t.location}</span>}
          {t.court && <span className="text-fog/80">{t.court}</span>}
          {t.officer && <span className="text-dim">{t.officer}</span>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`font-mono text-lg font-bold tabular-nums ${
              open ? "text-warn" : "text-fog"
            }`}
          >
            {fmtMoney(t.fine)}
          </span>

          {t.notes.length > 0 && (
            <span className="flex items-center gap-1 rounded-sm border border-edge bg-raised px-2 py-1 font-mono text-[10px] text-fog">
              <IconNote width={12} height={12} /> {t.notes.length}
            </span>
          )}
          {t.attachments.length > 0 && (
            <span className="flex items-center gap-1 rounded-sm border border-edge bg-raised px-2 py-1 font-mono text-[10px] text-fog">
              <IconClip width={12} height={12} /> {t.attachments.length}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {open && <QuickBtn label="Add to calendar (.ics)" onClick={onICS}><IconCalendar width={15} height={15} /></QuickBtn>}
            {open && t.phone && (
              <QuickBtn label="Send text reminder" onClick={onSMS}><IconSms width={15} height={15} /></QuickBtn>
            )}
            {open && (
              <QuickBtn label="Mark as paid" onClick={onPaid}><IconCheck width={15} height={15} /></QuickBtn>
            )}
            <QuickBtn label="Delete citation" onClick={onDelete} danger>
              <IconTrash width={15} height={15} />
            </QuickBtn>
          </div>
        </div>
      </div>

      {/* deadline zone */}
      <div className="relative flex flex-col justify-center gap-1 border-t border-edge bg-raised/40 p-4 sm:border-l sm:border-t-0">
        {urg === "overdue" && <span className="hazard absolute inset-x-0 top-0 h-1.5" />}
        <div className={`font-display text-[42px] leading-none ${u.text} ${urg === "overdue" ? "blink-soft" : ""}`}>
          {Math.abs(d)}
        </div>
        <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${u.text}`}>
          {urg === "closed"
            ? t.status === "paid"
              ? "paid"
              : "dismissed"
            : d < 0
              ? "days overdue"
              : d === 0
                ? "due today"
                : "days left"}
        </div>
        <div className="font-mono text-[11px] text-fog">due {fmtDate(t.dueOn)}</div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-edge/70">
          <div
            className={`h-full rounded-full ${u.bar} transition-[width] duration-700`}
            style={{ width: `${urg === "closed" ? 100 : elapsed}%` }}
          />
        </div>
      </div>
    </article>
  );
}
