import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Attachment, Ticket, ToastKind } from "../types";
import {
  STATUS_LABEL,
  URGENCY,
  addDaysISO,
  daysUntil,
  fmtBytes,
  fmtDate,
  fmtMoney,
  isOpen,
  timeAgo,
  urgencyOf,
} from "../lib/utils";
import { copyReminder, downloadICS, googleCalUrl, smsHref } from "../lib/ics";
import {
  IconCalendar,
  IconCheck,
  IconClip,
  IconCopy,
  IconDownload,
  IconEye,
  IconFile,
  IconFlag,
  IconNote,
  IconSms,
  IconTrash,
  IconX,
} from "./icons";

const label = "block text-sm font-medium text-text2";

function RemindButton({
  children,
  onClick,
  href,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const cls = `flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text2 transition-all hover:border-blue hover:text-blue ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;
  return href ? (
    <a className={cls} href={href}>
      {children}
    </a>
  ) : (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default function TicketDrawer({
  ticket: t,
  onClose,
  onUpdate,
  onAddNote,
  onDeleteNote,
  onAddFiles,
  onRemoveAttachment,
  onRequestDelete,
  notify,
}: {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Ticket>, toast?: [ToastKind, string, string?]) => void;
  onAddNote: (id: string, text: string) => void;
  onDeleteNote: (id: string, noteId: string) => void;
  onAddFiles: (id: string, files: FileList | null) => void;
  onRemoveAttachment: (id: string, attId: string) => void;
  onRequestDelete: (t: Ticket) => void;
  notify: (kind: ToastKind, title: string, body?: string) => void;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const id = t?.id;
  useEffect(() => {
    setNoteDraft("");
    setPhone(t?.phone ?? "");
    setLightbox(null);
  }, [id]);

  useEffect(() => {
    if (!t) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t, lightbox, onClose]);

  if (!t) return null;

  const urg = urgencyOf(t);
  const u = URGENCY[urg];
  const d = daysUntil(t.dueOn);
  const open = isOpen(t);
  const remindDate = addDaysISO(t.dueOn, -t.leadDays);
  const remindPassed = daysUntil(remindDate) < 0;

  const savePhone = () => {
    if (phone.trim() !== t.phone) {
      onUpdate(t.id, { phone: phone.trim() }, [
        "success",
        "Phone saved",
      ]);
    }
  };

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    onAddNote(t.id, text);
    setNoteDraft("");
  };

  const setImages = t.attachments.filter((a) => a.kind === "image");
  const setFiles = t.attachments.filter((a) => a.kind === "file");

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onMouseDown={onClose}
      />
      <aside className="modal-in nice-scroll absolute right-0 top-0 h-full w-full max-w-[600px] overflow-y-auto border-l border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.softBg} ${u.text}`}>
                  {u.label}
                </span>
                <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted">
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-text">
                {t.violation}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span className="font-mono">#{t.citationNo}</span>
                <span>Issued {fmtDate(t.issuedOn)}</span>
                {t.plate && <span>Plate {t.plate}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-text"
              aria-label="Close"
            >
              <IconX />
            </button>
          </div>

          {/* Countdown */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex shrink-0 flex-col items-center rounded-lg bg-raised px-5 py-3">
              <span className={`font-display text-4xl font-extrabold leading-none ${u.text} ${urg === "overdue" ? "blink-soft" : ""}`}>
                {Math.abs(d)}
              </span>
              <span className={`mt-1 font-mono text-[10px] font-bold uppercase tracking-wider ${u.text}`}>
                {urg === "closed" ? "closed" : d < 0 ? "overdue" : d === 0 ? "today" : "days left"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Due {fmtDate(t.dueOn)}</span>
                <span className="font-semibold text-text">{fmtMoney(t.fine)}</span>
              </div>
            </div>
          </div>

          {/* Stamps for closed/overdue */}
          {urg === "overdue" && (
            <div className="stamp-in pointer-events-none absolute right-20 top-6 rounded border-[3px] border-red px-3 py-0.5 font-display text-xl font-bold tracking-widest text-red">
              OVERDUE
            </div>
          )}
          {!open && (
            <div
              className={`stamp-in pointer-events-none absolute right-20 top-6 rounded border-[3px] px-3 py-0.5 font-display text-xl font-bold tracking-widest ${
                t.status === "paid" ? "border-green text-green" : "border-muted text-muted"
              }`}
            >
              {t.status === "paid" ? "PAID" : "DISMISSED"}
            </div>
          )}
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Status actions */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {open ? (
                <>
                  <button
                    onClick={() =>
                      onUpdate(t.id, { status: "paid", resolvedAt: Date.now() }, [
                        "success",
                        "Marked as paid",
                      ])
                    }
                    className="flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
                  >
                    <IconCheck width={14} height={14} strokeWidth={2.2} /> Mark paid
                  </button>
                  <button
                    onClick={() =>
                      onUpdate(
                        t.id,
                        { status: t.status === "contesting" ? "open" : "contesting" },
                        t.status === "contesting" ? ["info", "Back to open"] : ["warn", "Contesting"],
                      )
                    }
                    className="flex items-center gap-2 rounded-lg border border-amber-border bg-amber-soft px-4 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber-border/30"
                  >
                    <IconFlag width={14} height={14} />
                    {t.status === "contesting" ? "Stop contesting" : "Contesting"}
                  </button>
                  <button
                    onClick={() =>
                      onUpdate(t.id, { status: "dismissed", resolvedAt: Date.now() }, [
                        "success",
                        "Dismissed",
                      ])
                    }
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition-colors hover:bg-raised"
                  >
                    Dismissed
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    onUpdate(t.id, { status: "open", resolvedAt: null }, [
                      "warn",
                      "Reopened",
                    ])
                  }
                  className="rounded-lg border border-amber-border bg-amber-soft px-4 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber-border/30"
                >
                  Reopen
                </button>
              )}
            </div>
          </section>

          {/* Details */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-text2">Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-raised p-4 sm:grid-cols-3">
              {[
                ["Citation #", t.citationNo || "—"],
                ["Fine", fmtMoney(t.fine)],
                ["Issued", fmtDate(t.issuedOn)],
                ["Due", fmtDate(t.dueOn)],
                ["Court", t.court || "—"],
                ["Officer", t.officer || "—"],
                ["Plate", t.plate || "—"],
                ["Location", t.location || "—"],
                ["Resolved", t.resolvedAt ? timeAgo(t.resolvedAt) : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="min-w-0">
                  <dt className="text-xs font-medium text-muted">{k}</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-text" title={String(v)}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Reminders */}
          <section className="rounded-lg border border-blue-border bg-blue-soft p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue">
              <IconSms width={14} height={14} /> Reminders
            </h3>

            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <div>
                <label className="text-xs font-medium text-text2" htmlFor="dr-phone">
                  Phone number
                </label>
                <input
                  id="dr-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={savePhone}
                  onKeyDown={(e) => e.key === "Enter" && savePhone()}
                  placeholder="(555) 014-2231"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-dim transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text2" htmlFor="dr-lead">
                  Remind me
                </label>
                <select
                  id="dr-lead"
                  value={t.leadDays}
                  onChange={(e) => onUpdate(t.id, { leadDays: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-text focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                >
                  {[0, 1, 2, 3, 5, 7].map((dOpt) => (
                    <option key={dOpt} value={dOpt}>
                      {dOpt === 0 ? "On the day" : `${dOpt}d before`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs text-text2">
              {remindPassed
                ? "⚠ Reminder date already passed — send one now."
                : `Reminder lands ${fmtDate(remindDate)}`}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <RemindButton href={t.phone ? smsHref(t) : undefined} disabled={!t.phone}>
                <IconSms width={14} height={14} /> Text reminder
              </RemindButton>
              <RemindButton
                onClick={async () => {
                  const okc = await copyReminder(t);
                  notify(okc ? "success" : "error", okc ? "Copied" : "Couldn't copy");
                }}
              >
                <IconCopy width={14} height={14} /> Copy text
              </RemindButton>
              <RemindButton
                onClick={() => {
                  downloadICS(t);
                  notify("success", "Calendar file downloaded");
                }}
              >
                <IconDownload width={14} height={14} /> Download .ics
              </RemindButton>
              <RemindButton href={googleCalUrl(t)}>
                <IconCalendar width={14} height={14} /> Google Calendar
              </RemindButton>
            </div>
            {!t.phone && (
              <p className="mt-2 text-xs text-muted">
                Add a phone number above to enable text reminders
              </p>
            )}
          </section>

          {/* Evidence */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text2">
                <IconClip width={14} height={14} /> Evidence
                <span className="text-muted">({t.attachments.length})</span>
              </h3>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  onAddFiles(t.id, e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text2 transition-colors hover:border-blue hover:text-blue"
              >
                <IconClip width={13} height={13} /> Add files
              </button>
            </div>

            {t.attachments.length === 0 ? (
              <p className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                No evidence attached yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {setImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {setImages.map((a) => (
                      <figure
                        key={a.id}
                        className="group relative cursor-zoom-in overflow-hidden rounded-lg border border-border"
                        onClick={() => setLightbox(a)}
                      >
                        <img
                          src={a.src}
                          alt={a.name}
                          className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <figcaption className="absolute inset-x-0 bottom-0 truncate bg-navy/80 px-2 py-1 text-xs text-white">
                          {a.name}
                        </figcaption>
                        <span className="absolute right-1.5 top-1.5 rounded bg-navy/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <IconEye width={13} height={13} />
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAttachment(t.id, a.id);
                          }}
                          className="absolute left-1.5 top-1.5 rounded bg-navy/70 p-1 text-white opacity-0 transition-all hover:text-red group-hover:opacity-100"
                          aria-label={`Remove ${a.name}`}
                        >
                          <IconTrash width={13} height={13} />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
                {setFiles.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-raised px-3 py-2.5"
                  >
                    <IconFile width={18} height={18} className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">{a.name}</div>
                      <div className="text-xs text-muted">
                        {fmtBytes(a.size)} · {timeAgo(a.addedAt)}
                      </div>
                    </div>
                    <a
                      href={a.src}
                      download={a.name}
                      className="rounded-lg border border-border p-2 text-muted transition-colors hover:border-green hover:text-green"
                      aria-label={`Download ${a.name}`}
                    >
                      <IconDownload width={14} height={14} />
                    </a>
                    <button
                      onClick={() => onRemoveAttachment(t.id, a.id)}
                      className="rounded-lg border border-border p-2 text-muted transition-colors hover:border-red hover:text-red"
                      aria-label={`Remove ${a.name}`}
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text2">
              <IconNote width={14} height={14} /> Notes
              <span className="text-muted">({t.notes.length})</span>
            </h3>
            <div className="flex items-start gap-2">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
                }}
                placeholder="Add a note..."
                className="min-h-[64px] flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-dim transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
              <button
                onClick={addNote}
                disabled={!noteDraft.trim()}
                className="rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue2 active:translate-y-px disabled:opacity-40 disabled:shadow-none"
              >
                Add
              </button>
            </div>

            {t.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {t.notes
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((n) => (
                    <li key={n.id} className="group flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-blue bg-blue-soft" />
                      <div className="min-w-0 flex-1 border-b border-border pb-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                          {n.text}
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                          <button
                            onClick={() => onDeleteNote(t.id, n.id)}
                            className="flex items-center gap-1 text-xs text-muted opacity-0 transition-all hover:text-red group-hover:opacity-100"
                          >
                            <IconTrash width={11} height={11} /> remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            <span className="text-xs text-muted">Logged {timeAgo(t.createdAt)}</span>
            <button
              onClick={() => onRequestDelete(t)}
              className="flex items-center gap-2 rounded-lg border border-red-border px-3.5 py-2 text-sm font-medium text-red transition-colors hover:bg-red-soft"
            >
              <IconTrash width={14} height={14} /> Delete ticket
            </button>
          </div>
        </div>
      </aside>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-navy/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-5 top-5 rounded-lg border border-border bg-surface p-2.5 text-text transition-colors hover:bg-raised"
            aria-label="Close preview"
          >
            <IconX />
          </button>
          <figure className="modal-in max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.src}
              alt={lightbox.name}
              className="max-h-[82vh] max-w-full rounded-lg border border-border object-contain shadow-2xl"
            />
            <figcaption className="mt-2 text-center text-sm text-muted">
              {lightbox.name} · {fmtBytes(lightbox.size)}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
