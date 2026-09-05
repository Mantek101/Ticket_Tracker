import { useEffect, useRef, useState } from "react";
import type { Attachment, Ticket, TicketStatus, ToastKind } from "../types";
import { todayISO, uid } from "../lib/utils";
import { filesToAttachments } from "../lib/files";
import { IconClip, IconFile, IconPlus, IconTrash, IconX } from "./icons";

const genCitation = () =>
  `CT-${Math.floor(10000 + Math.random() * 89999)}`;

interface FormState {
  violation: string;
  citationNo: string;
  fine: string;
  issuedOn: string;
  dueOn: string;
  location: string;
  court: string;
  officer: string;
  plate: string;
  status: TicketStatus;
  phone: string;
  leadDays: number;
  note: string;
}

const blank = (): FormState => ({
  violation: "",
  citationNo: genCitation(),
  fine: "",
  issuedOn: todayISO(),
  dueOn: "",
  location: "",
  court: "",
  officer: "",
  plate: "",
  status: "open",
  phone: "",
  leadDays: 3,
  note: "",
});

const label =
  "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-fog";
const input =
  "w-full rounded-md border border-edge bg-raised px-3 py-2.5 text-sm text-snow placeholder:text-dim transition-colors focus:border-warn/70 focus:outline-none";

function Section({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-edge pb-2">
      <span className="rounded-sm bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] text-warn">
        {tag}
      </span>
      <span className="font-display text-base tracking-wider text-snow">
        {title}
      </span>
    </div>
  );
}

export default function TicketForm({
  open,
  onClose,
  onSubmit,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (t: Ticket) => void;
  notify: (kind: ToastKind, title: string, body?: string) => void;
}) {
  const [f, setF] = useState<FormState>(blank);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<{ violation?: string; dueOn?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setF(blank());
      setAtts([]);
      setErrs({});
    }
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const pickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const { ok, errors } = await filesToAttachments(files);
    if (ok.length) setAtts((p) => [...p, ...ok]);
    errors.forEach((e) => notify("error", "Attachment skipped", e));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    const next: typeof errs = {};
    if (!f.violation.trim()) next.violation = "What's the charge?";
    if (!f.dueOn) next.dueOn = "The deadline is the whole point.";
    setErrs(next);
    if (Object.keys(next).length) return;

    const ticket: Ticket = {
      id: uid(),
      citationNo: f.citationNo.trim() || genCitation(),
      violation: f.violation.trim(),
      location: f.location.trim(),
      officer: f.officer.trim(),
      plate: f.plate.trim().toUpperCase(),
      court: f.court.trim(),
      issuedOn: f.issuedOn || todayISO(),
      dueOn: f.dueOn,
      fine: Math.max(0, parseFloat(f.fine) || 0),
      status: f.status,
      phone: f.phone.trim(),
      leadDays: f.leadDays,
      notes: f.note.trim()
        ? [{ id: uid(), text: f.note.trim(), createdAt: Date.now() }]
        : [],
      attachments: atts,
      createdAt: Date.now(),
      resolvedAt: null,
    };
    onSubmit(ticket);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-ink/78 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-in mx-auto my-6 w-full max-w-2xl rounded-lg border border-edge bg-panel shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
        {/* form header */}
        <div className="relative overflow-hidden rounded-t-lg border-b border-edge bg-raised/60 px-6 py-4">
          <span className="hazard absolute inset-x-0 top-0 h-1" />
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-display text-xl tracking-wider text-snow">
                UNIFORM CITATION RECORD
              </h2>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
                Enter details exactly as printed on the ticket
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-md border border-edge p-2 text-fog transition-colors hover:border-edge2 hover:text-snow"
              aria-label="Close form"
            >
              <IconX />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-7 overflow-y-auto px-6 py-6 nice-scroll">
          {/* Section A */}
          <div>
            <Section tag="SEC. A" title="The charge" />
            <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
              <div>
                <label className={label} htmlFor="tf-violation">
                  Violation *
                </label>
                <input
                  id="tf-violation"
                  className={`${input} ${errs.violation ? "border-danger/70" : ""}`}
                  placeholder="Speeding — 47 in a 35"
                  value={f.violation}
                  onChange={(e) => set("violation", e.target.value)}
                  autoFocus
                />
                {errs.violation && (
                  <p className="mt-1 text-xs font-bold text-danger">{errs.violation}</p>
                )}
              </div>
              <div>
                <label className={label} htmlFor="tf-cite">
                  Citation #
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="tf-cite"
                    className={`${input} font-mono`}
                    value={f.citationNo}
                    onChange={(e) => set("citationNo", e.target.value)}
                  />
                  <button
                    type="button"
                    title="Generate new number"
                    onClick={() => set("citationNo", genCitation())}
                    className="shrink-0 rounded-md border border-edge px-2.5 font-mono text-xs text-fog transition-colors hover:border-edge2 hover:text-snow"
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="tf-fine">
                  Fine (USD)
                </label>
                <input
                  id="tf-fine"
                  type="number"
                  min="0"
                  step="0.01"
                  className={input}
                  placeholder="186"
                  value={f.fine}
                  onChange={(e) => set("fine", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="tf-issued">
                  Issued on
                </label>
                <input
                  id="tf-issued"
                  type="date"
                  className={input}
                  value={f.issuedOn}
                  onChange={(e) => set("issuedOn", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="tf-due">
                  Due date *
                </label>
                <input
                  id="tf-due"
                  type="date"
                  className={`${input} ${errs.dueOn ? "border-danger/70" : ""}`}
                  value={f.dueOn}
                  onChange={(e) => set("dueOn", e.target.value)}
                />
                {errs.dueOn && (
                  <p className="mt-1 text-xs font-bold text-danger">{errs.dueOn}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className={label} htmlFor="tf-loc">
                Location of violation
              </label>
              <input
                id="tf-loc"
                className={input}
                placeholder="Maple Ave & 9th St"
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>

          {/* Section B */}
          <div>
            <Section tag="SEC. B" title="Court & parties" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="tf-court">
                  Court / agency
                </label>
                <input
                  id="tf-court"
                  className={input}
                  placeholder="District 4 Traffic Court"
                  value={f.court}
                  onChange={(e) => set("court", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="tf-officer">
                  Officer
                </label>
                <input
                  id="tf-officer"
                  className={input}
                  placeholder="Ofc. D. Reyes #2214"
                  value={f.officer}
                  onChange={(e) => set("officer", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="tf-plate">
                  Plate
                </label>
                <input
                  id="tf-plate"
                  className={`${input} font-mono uppercase`}
                  placeholder="7KTR-482"
                  value={f.plate}
                  onChange={(e) => set("plate", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="tf-status">
                  Plead / status
                </label>
                <select
                  id="tf-status"
                  className={input}
                  value={f.status}
                  onChange={(e) => set("status", e.target.value as TicketStatus)}
                >
                  <option value="open">Open — deciding</option>
                  <option value="contesting">Contesting</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="tf-note">
                  First note (optional)
                </label>
                <input
                  id="tf-note"
                  className={input}
                  placeholder="e.g. Dashcam footage saved…"
                  value={f.note}
                  onChange={(e) => set("note", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section C */}
          <div>
            <Section tag="SEC. C" title="Reminders & evidence" />
            <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
              <div>
                <label className={label} htmlFor="tf-phone">
                  Mobile # for text reminders
                </label>
                <input
                  id="tf-phone"
                  type="tel"
                  className={input}
                  placeholder="(555) 014-2231"
                  value={f.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="tf-lead">
                  Remind me before
                </label>
                <select
                  id="tf-lead"
                  className={input}
                  value={f.leadDays}
                  onChange={(e) => set("leadDays", Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 5, 7].map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? "On the day" : `${d} day${d === 1 ? "" : "s"} before`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <span className={label}>Photos & files</span>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => pickFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-edge2 bg-raised/40 px-4 py-5 text-sm font-bold text-fog transition-all hover:border-warn/60 hover:text-warn disabled:opacity-50"
              >
                <IconClip width={16} height={16} />
                {busy
                  ? "Processing files…"
                  : "Attach ticket scans, dashcam stills, receipts…"}
              </button>
              {atts.length > 0 && (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {atts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2.5 rounded-md border border-edge bg-raised px-2.5 py-2"
                    >
                      {a.kind === "image" ? (
                        <img
                          src={a.src}
                          alt=""
                          className="h-9 w-12 shrink-0 rounded-sm object-cover"
                        />
                      ) : (
                        <IconFile width={18} height={18} className="shrink-0 text-fog" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-snow">
                        {a.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAtts((p) => p.filter((x) => x.id !== a.id))}
                        className="rounded p-1 text-dim transition-colors hover:text-danger"
                        aria-label={`Remove ${a.name}`}
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-dim">
                Images & docs up to 2.5 MB each — stored in this browser
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2.5 rounded-b-lg border-t border-edge bg-raised/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-edge px-4 py-2.5 text-sm font-bold text-fog transition-all hover:border-edge2 hover:text-snow active:translate-y-px"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-md bg-warn px-5 py-2.5 text-sm font-extrabold text-ink shadow-[0_3px_0_#7a5100] transition-all hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_#7a5100]"
          >
            <IconPlus width={15} height={15} strokeWidth={2.6} />
            File citation
          </button>
        </div>
      </div>
    </div>
  );
}
