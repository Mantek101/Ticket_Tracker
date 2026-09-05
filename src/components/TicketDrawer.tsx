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
  windowElapsed,
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

const label = "block font-mono text-[10px] uppercase tracking-[0.18em] text-dim";

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
  const cls = `flex items-center justify-center gap-2 rounded-md border border-edge bg-raised px-3 py-2.5 text-xs font-bold text-snow transition-all hover:border-warn/60 hover:text-warn active:translate-y-px ${
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const elapsed = windowElapsed(t);
  const remindDate = addDaysISO(t.dueOn, -t.leadDays);
  const remindPassed = daysUntil(remindDate) < 0;

  const savePhone = () => {
    if (phone.trim() !== t.phone) {
      onUpdate(t.id, { phone: phone.trim() }, [
        "success",
        "Reminder number saved",
        "Text reminders will draft to this number.",
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
        className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />
      <aside className="modal-in nice-scroll absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l border-edge bg-panel shadow-[-24px_0_70px_rgba(0,0,0,0.55)]">
        {/* header */}
        <div className="relative border-b border-edge bg-raised/50 px-6 py-5">
          <span className={`absolute inset-x-0 top-0 h-1 ${u.bg}`} />
          {/* stamp */}
          {!open && (
            <div
              className={`stamp-in pointer-events-none absolute right-5 top-7 rounded border-[3px] px-3 py-0.5 font-display text-2xl tracking-widest ${
                t.status === "paid" ? "border-go text-go" : "border-fog text-fog"
              }`}
            >
              {t.status === "paid" ? "PAID" : "DISMISSED"}
            </div>
          )}
          {urg === "overdue" && (
            <div className="stamp-in pointer-events-none absolute right-5 top-7 rounded border-[3px] border-danger px-3 py-0.5 font-display text-2xl tracking-widest text-danger">
              OVERDUE
            </div>
          )}

          <div className="flex items-start gap-4 pr-28">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${u.border} ${u.softBg} ${u.text}`}
                >
                  {u.label}
                </span>
                <span className="rounded-sm border border-edge bg-raised px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-fog">
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <h2 className="mt-2 font-display text-[26px] leading-tight tracking-wide text-snow">
                {t.violation}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-fog">
                <span>#{t.citationNo}</span>
                <span>issued {fmtDate(t.issuedOn)}</span>
                {t.plate && <span>plate {t.plate}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute right-4 bottom-4 rounded-md border border-edge p-2 text-fog transition-colors hover:border-edge2 hover:text-snow"
              aria-label="Close case file"
            >
              <IconX />
            </button>
          </div>

          {/* countdown strip */}
          <div className="mt-5 flex items-center gap-5">
            <div className="shrink-0">
              <span className={`font-display text-6xl leading-none ${u.text} ${urg === "overdue" ? "blink-soft" : ""}`}>
                {Math.abs(d)}
              </span>
              <div className={`mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${u.text}`}>
                {urg === "closed"
                  ? "case closed"
                  : d < 0
                    ? "days overdue"
                    : d === 0
                      ? "due today"
                      : "days left"}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-dim">
                <span>due {fmtDate(t.dueOn)}</span>
                <span className="text-warn">{fmtMoney(t.fine)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-edge/70">
                <div
                  className={`h-full rounded-full ${u.bar} transition-[width] duration-700`}
                  style={{ width: `${open ? elapsed : 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-7 px-6 py-6">
          {/* status actions */}
          <section>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
              <IconFlag width={13} height={13} className="text-warn" /> Case status
            </div>
            <div className="flex flex-wrap gap-2">
              {open ? (
                <>
                  <button
                    onClick={() =>
                      onUpdate(
                        t.id,
                        { status: "paid", resolvedAt: Date.now() },
                        ["success", "Marked as paid", "One less thing on the docket."],
                      )
                    }
                    className="flex items-center gap-2 rounded-md bg-go px-4 py-2 text-xs font-extrabold text-ink transition-all hover:brightness-110 active:translate-y-px"
                  >
                    <IconCheck width={14} height={14} strokeWidth={2.6} /> Mark paid
                  </button>
                  <button
                    onClick={() =>
                      onUpdate(
                        t.id,
                        {
                          status:
                            t.status === "contesting" ? "open" : "contesting",
                        },
                        t.status === "contesting"
                          ? ["info", "Back to open"]
                          : ["warn", "Contesting noted", "Bring your evidence to the hearing."],
                      )
                    }
                    className="flex items-center gap-2 rounded-md border border-warn/50 px-4 py-2 text-xs font-bold text-warn transition-all hover:bg-warn/10 active:translate-y-px"
                  >
                    <IconFlag width={14} height={14} />
                    {t.status === "contesting" ? "Stop contesting" : "Contesting"}
                  </button>
                  <button
                    onClick={() =>
                      onUpdate(
                        t.id,
                        { status: "dismissed", resolvedAt: Date.now() },
                        ["success", "Dismissed — get it in writing", "Keep the court notice as proof."],
                      )
                    }
                    className="flex items-center gap-2 rounded-md border border-edge px-4 py-2 text-xs font-bold text-fog transition-all hover:border-edge2 hover:text-snow active:translate-y-px"
                  >
                    Dismissed
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    onUpdate(t.id, { status: "open", resolvedAt: null }, [
                      "warn",
                      "Case reopened",
                      "The clock is back on.",
                    ])
                  }
                  className="flex items-center gap-2 rounded-md border border-warn/50 px-4 py-2 text-xs font-bold text-warn transition-all hover:bg-warn/10 active:translate-y-px"
                >
                  Reopen case
                </button>
              )}
            </div>
          </section>

          {/* details */}
          <section>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
              Particulars
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-md border border-edge bg-raised/40 p-4 sm:grid-cols-3">
              {[
                ["Citation #", t.citationNo || "—"],
                ["Fine", fmtMoney(t.fine)],
                ["Issued", fmtDate(t.issuedOn)],
                ["Due", fmtDate(t.dueOn)],
                ["Court", t.court || "—"],
                ["Officer", t.officer || "—"],
                ["Plate", t.plate || "—"],
                [
                  "Location",
                  t.location || "—",
                ],
                [
                  "Resolved",
                  t.resolvedAt ? timeAgo(t.resolvedAt) : "—",
                ],
              ].map(([k, v]) => (
                <div key={k as string} className="min-w-0">
                  <dt className={label}>{k}</dt>
                  <dd className="mt-0.5 truncate font-mono text-[13px] font-bold text-snow" title={String(v)}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* reminders */}
          <section className="rounded-md border border-warn/30 bg-warn/[0.045] p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-warn">
              <IconSms width={13} height={13} /> Reminders
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <div>
                <label className={label} htmlFor="dr-phone">
                  Text reminders to
                </label>
                <input
                  id="dr-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={savePhone}
                  onKeyDown={(e) => e.key === "Enter" && savePhone()}
                  placeholder="(555) 014-2231"
                  className="mt-1.5 w-full rounded-md border border-edge bg-raised px-3 py-2 text-sm text-snow placeholder:text-dim transition-colors focus:border-warn/70 focus:outline-none"
                />
              </div>
              <div>
                <label className={label} htmlFor="dr-lead">
                  Early warning
                </label>
                <select
                  id="dr-lead"
                  value={t.leadDays}
                  onChange={(e) =>
                    onUpdate(t.id, { leadDays: Number(e.target.value) })
                  }
                  className="mt-1.5 w-full rounded-md border border-edge bg-raised px-2.5 py-2 font-mono text-xs text-snow focus:border-warn/70 focus:outline-none"
                >
                  {[0, 1, 2, 3, 5, 7].map((dOpt) => (
                    <option key={dOpt} value={dOpt}>
                      {dOpt === 0 ? "On the day" : `${dOpt}d before`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 font-mono text-[11px] text-fog">
              {remindPassed
                ? "⚠ The early-warning date already passed — send one now."
                : `Early warning lands ${fmtDate(remindDate)} · calendar alarm included in the .ics file.`}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <RemindButton href={t.phone ? smsHref(t) : undefined} disabled={!t.phone}>
                <IconSms width={14} height={14} /> Text reminder
              </RemindButton>
              <RemindButton
                onClick={async () => {
                  const okc = await copyReminder(t);
                  notify(
                    okc ? "success" : "error",
                    okc ? "Reminder text copied" : "Couldn't copy",
                    okc ? "Paste it anywhere — group chat, email, your palm." : undefined,
                  );
                }}
              >
                <IconCopy width={14} height={14} /> Copy text
              </RemindButton>
              <RemindButton
                onClick={() => {
                  downloadICS(t);
                  notify(
                    "success",
                    "Calendar file downloaded",
                    "Open the .ics to add the due date + early alarm to any calendar.",
                  );
                }}
              >
                <IconDownload width={14} height={14} /> Download .ics
              </RemindButton>
              <RemindButton href={googleCalUrl(t)}>
                <IconCalendar width={14} height={14} /> Google Calendar
              </RemindButton>
            </div>
            {!t.phone && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-dim">
                Add a number above to enable text reminders
              </p>
            )}
          </section>

          {/* evidence */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
                <IconClip width={13} height={13} className="text-warn" /> Evidence
                <span className="text-dim">({t.attachments.length})</span>
              </div>
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
                className="flex items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-[11px] font-bold text-fog transition-all hover:border-warn/60 hover:text-warn active:translate-y-px"
              >
                <IconClip width={13} height={13} /> Add photos / files
              </button>
            </div>

            {t.attachments.length === 0 ? (
              <p className="rounded-md border border-dashed border-edge px-4 py-6 text-center text-xs text-dim">
                Nothing attached yet. Ticket scans, dashcam stills and receipts
                win arguments.
              </p>
            ) : (
              <div className="space-y-2.5">
                {setImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {setImages.map((a) => (
                      <figure
                        key={a.id}
                        className="group relative cursor-zoom-in overflow-hidden rounded-md border border-edge"
                        onClick={() => setLightbox(a)}
                      >
                        <img
                          src={a.src}
                          alt={a.name}
                          className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                        <figcaption className="absolute inset-x-0 bottom-0 truncate bg-ink/80 px-2 py-1 font-mono text-[10px] text-fog">
                          {a.name}
                        </figcaption>
                        <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 p-1 text-snow opacity-0 transition-opacity group-hover:opacity-100">
                          <IconEye width={13} height={13} />
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAttachment(t.id, a.id);
                          }}
                          className="absolute left-1.5 top-1.5 rounded bg-ink/70 p-1 text-fog opacity-0 transition-all hover:text-danger group-hover:opacity-100"
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
                    className="flex items-center gap-3 rounded-md border border-edge bg-raised/50 px-3 py-2.5"
                  >
                    <IconFile width={18} height={18} className="shrink-0 text-fog" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs font-bold text-snow">
                        {a.name}
                      </div>
                      <div className="font-mono text-[10px] text-dim">
                        {fmtBytes(a.size)} · {timeAgo(a.addedAt)}
                      </div>
                    </div>
                    <a
                      href={a.src}
                      download={a.name}
                      className="rounded-md border border-edge p-2 text-fog transition-colors hover:border-go/60 hover:text-go"
                      aria-label={`Download ${a.name}`}
                    >
                      <IconDownload width={14} height={14} />
                    </a>
                    <button
                      onClick={() => onRemoveAttachment(t.id, a.id)}
                      className="rounded-md border border-edge p-2 text-fog transition-colors hover:border-danger/60 hover:text-danger"
                      aria-label={`Remove ${a.name}`}
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* notes */}
          <section>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-fog">
              <IconNote width={13} height={13} className="text-warn" /> Case notes
              <span className="text-dim">({t.notes.length})</span>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
                }}
                placeholder="Clerk said online payment waives the appearance…"
                className="min-h-[64px] flex-1 resize-y rounded-md border border-edge bg-raised px-3 py-2.5 text-sm text-snow placeholder:text-dim transition-colors focus:border-warn/70 focus:outline-none"
              />
              <button
                onClick={addNote}
                disabled={!noteDraft.trim()}
                className="rounded-md bg-warn px-4 py-2.5 text-xs font-extrabold text-ink shadow-[0_2px_0_#7a5100] transition-all hover:brightness-110 active:translate-y-px disabled:opacity-40 disabled:shadow-none"
              >
                Add note
              </button>
            </div>

            {t.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {t.notes
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((n) => (
                    <li key={n.id} className="group flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-warn/60 bg-warn/20" />
                      <div className="min-w-0 flex-1 border-b border-edge/60 pb-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-snow">
                          {n.text}
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                            {timeAgo(n.createdAt)}
                          </span>
                          <button
                            onClick={() => onDeleteNote(t.id, n.id)}
                            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
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

          {/* footer */}
          <div className="flex items-center justify-between gap-3 border-t border-edge pt-5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
              Logged {timeAgo(t.createdAt)}
            </span>
            <button
              onClick={() => onRequestDelete(t)}
              className="flex items-center gap-2 rounded-md border border-danger/40 px-3.5 py-2 text-xs font-bold text-danger transition-all hover:bg-danger/10 active:translate-y-px"
            >
              <IconTrash width={14} height={14} /> Scrap this citation
            </button>
          </div>
        </div>
      </aside>

      {/* lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-5 top-5 rounded-md border border-edge bg-panel p-2.5 text-snow transition-colors hover:border-edge2"
            aria-label="Close preview"
          >
            <IconX />
          </button>
          <figure className="modal-in max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.src}
              alt={lightbox.name}
              className="max-h-[82vh] max-w-full rounded-md border border-edge object-contain shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
            />
            <figcaption className="mt-2 text-center font-mono text-xs text-fog">
              {lightbox.name} · {fmtBytes(lightbox.size)}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
