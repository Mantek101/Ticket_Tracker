import type { Ticket } from "../types";
import {
  STATUS_LABEL,
  URGENCY,
  daysUntil,
  fmtDate,
  fmtMoney,
  isOpen,
  urgencyOf,
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

  return (
    <article
      onClick={onOpen}
      className={`group relative cursor-pointer rounded-xl border bg-surface p-4 transition-all hover:shadow-md sm:p-5 ${
        open ? "border-border hover:border-border2" : "border-border opacity-75 hover:opacity-100"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.softBg} ${u.text}`}>
              {u.label}
            </span>
            <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
              {STATUS_LABEL[t.status]}
            </span>
            <span className="font-mono text-xs text-muted">#{t.citationNo}</span>
          </div>

          <h3 className={`font-display text-lg font-bold truncate ${open ? "text-text" : "text-muted"}`}>
            {t.violation}
          </h3>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {t.location && <span>{t.location}</span>}
            <span>Issued {fmtDate(t.issuedOn)}</span>
            {t.court && <span>{t.court}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`font-display text-lg font-bold ${open ? "text-text" : "text-muted"}`}>
              {fmtMoney(t.fine)}
            </span>

            {t.notes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <IconNote width={13} height={13} /> {t.notes.length}
              </span>
            )}
            {t.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <IconClip width={13} height={13} /> {t.attachments.length}
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              {open && (
                <QuickBtn label="Calendar" onClick={onICS}>
                  <IconCalendar width={15} height={15} />
                </QuickBtn>
              )}
              {open && t.phone && (
                <QuickBtn label="Text reminder" onClick={onSMS}>
                  <IconSms width={15} height={15} />
                </QuickBtn>
              )}
              {open && (
                <QuickBtn label="Mark paid" onClick={onPaid}>
                  <IconCheck width={15} height={15} />
                </QuickBtn>
              )}
              <QuickBtn label="Delete" onClick={onDelete} danger>
                <IconTrash width={15} height={15} />
              </QuickBtn>
            </div>
          </div>
        </div>

        {/* Right side - countdown */}
        <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-raised px-4 py-3">
          <span className={`font-display text-3xl font-extrabold leading-none ${u.text} ${urg === "overdue" ? "blink-soft" : ""}`}>
            {Math.abs(d)}
          </span>
          <span className={`mt-1 font-mono text-[10px] font-bold uppercase tracking-wider ${u.text}`}>
            {urg === "closed"
              ? t.status === "paid" ? "paid" : "closed"
              : d < 0
                ? "overdue"
                : d === 0
                  ? "today"
                  : "days left"}
          </span>
          <span className="mt-0.5 text-[11px] text-muted">{fmtDate(t.dueOn)}</span>
        </div>
      </div>
    </article>
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
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg border border-border p-2 text-muted transition-all hover:text-text ${
        danger ? "hover:border-red hover:text-red hover:bg-red-soft" : "hover:border-border2 hover:bg-raised"
      }`}
    >
      {children}
    </button>
  );
}
