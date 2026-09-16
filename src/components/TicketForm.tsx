import { useEffect, useRef, useState } from "react";
import type { Attachment, Ticket, TicketStatus, ToastKind } from "../types";
import { todayISO, uid } from "../lib/utils";
import { filesToAttachments } from "../lib/files";
import { IconClip, IconFile, IconPlus, IconTrash, IconX } from "./icons";

const genCitation = () => `CT-${Math.floor(10000 + Math.random() * 89999)}`;

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

const label = "mb-1.5 block text-sm font-medium text-text2";
const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-dim transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20";

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
  const [f, setF] = useState<FormState>(blank());
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
    if (!f.violation.trim()) next.violation = "What's the violation?";
    if (!f.dueOn) next.dueOn = "When is it due?";
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
      className="fixed inset-0 z-[70] overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-in mx-auto my-6 w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl font-bold text-text">
            New Ticket
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-text"
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 nice-scroll">
          {/* Violation */}
          <div>
            <label className={label} htmlFor="tf-violation">
              Violation *
            </label>
            <input
              id="tf-violation"
              className={`${input} ${errs.violation ? "border-red" : ""}`}
              placeholder="Speeding — 47 in a 35"
              value={f.violation}
              onChange={(e) => set("violation", e.target.value)}
              autoFocus
            />
            {errs.violation && (
              <p className="mt-1 text-xs font-medium text-red">{errs.violation}</p>
            )}
          </div>

          {/* Citation # and Fine */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="tf-cite">
                Citation #
              </label>
              <input
                id="tf-cite"
                className={`${input} font-mono`}
                value={f.citationNo}
                onChange={(e) => set("citationNo", e.target.value)}
              />
            </div>
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
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                className={`${input} ${errs.dueOn ? "border-red" : ""}`}
                value={f.dueOn}
                onChange={(e) => set("dueOn", e.target.value)}
              />
              {errs.dueOn && (
                <p className="mt-1 text-xs font-medium text-red">{errs.dueOn}</p>
              )}
            </div>
          </div>

          {/* Location and Court */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="tf-loc">
                Location
              </label>
              <input
                id="tf-loc"
                className={input}
                placeholder="Maple Ave & 9th St"
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="tf-court">
                Court / Agency
              </label>
              <input
                id="tf-court"
                className={input}
                placeholder="District 4 Traffic Court"
                value={f.court}
                onChange={(e) => set("court", e.target.value)}
              />
            </div>
          </div>

          {/* Officer and Plate */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                License Plate
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

          {/* Status and Note */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="tf-status">
                Status
              </label>
              <select
                id="tf-status"
                className={input}
                value={f.status}
                onChange={(e) => set("status", e.target.value as TicketStatus)}
              >
                <option value="open">Open</option>
                <option value="contesting">Contesting</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="tf-note">
                Initial note
              </label>
              <input
                id="tf-note"
                className={input}
                placeholder="Optional note..."
                value={f.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>
          </div>

          {/* Phone and Reminder */}
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
            <div>
              <label className={label} htmlFor="tf-phone">
                Phone for reminders
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
                Remind me
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

          {/* Attachments */}
          <div>
            <label className={label}>Attachments</label>
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-raised px-4 py-6 text-sm font-medium text-muted transition-all hover:border-blue hover:text-blue disabled:opacity-50"
            >
              <IconClip width={16} height={16} />
              {busy ? "Processing..." : "Attach photos or documents"}
            </button>
            {atts.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {atts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-raised px-3 py-2"
                  >
                    {a.kind === "image" ? (
                      <img
                        src={a.src}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <IconFile width={18} height={18} className="shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text">
                      {a.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAtts((p) => p.filter((x) => x.id !== a.id))}
                      className="rounded p-1 text-muted transition-colors hover:text-red"
                      aria-label={`Remove ${a.name}`}
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">
              Images and documents up to 2.5 MB each
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text2 transition-colors hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue2 active:translate-y-px"
          >
            <IconPlus width={15} height={15} strokeWidth={2.2} />
            Save Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
