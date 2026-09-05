import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Attachment, Ticket, Toast, ToastKind } from "./types";
import { daysUntil, uid, urgencyOf, urgencyRank } from "./lib/utils";
import { seedTickets } from "./lib/seed";
import { downloadICS, smsHref } from "./lib/ics";
import { filesToAttachments } from "./lib/files";
import Header from "./components/Header";
import StatsBand from "./components/StatsBand";
import FilterBar, {
  type Counts,
  type SortKey,
  type StatusFilter,
} from "./components/FilterBar";
import TicketCard from "./components/TicketCard";
import TicketForm from "./components/TicketForm";
import TicketDrawer from "./components/TicketDrawer";
import ConfirmDialog, { type ConfirmState } from "./components/ConfirmDialog";
import Toasts from "./components/Toasts";
import Reveal from "./components/Reveal";
import { IconPlus, IconSearch, IconTicket } from "./components/icons";

const KEY = "citetrack.tickets.v1";

type Action =
  | { type: "add"; ticket: Ticket }
  | { type: "update"; id: string; patch: Partial<Ticket> }
  | { type: "remove"; id: string }
  | { type: "addNote"; id: string; text: string }
  | { type: "deleteNote"; id: string; noteId: string }
  | { type: "addAttachments"; id: string; attachments: Attachment[] }
  | { type: "removeAttachment"; id: string; attachmentId: string }
  | { type: "seed" }
  | { type: "clear" };

function reducer(state: Ticket[], a: Action): Ticket[] {
  switch (a.type) {
    case "add":
      return [a.ticket, ...state];
    case "update":
      return state.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t));
    case "remove":
      return state.filter((t) => t.id !== a.id);
    case "addNote":
      return state.map((t) =>
        t.id === a.id
          ? {
              ...t,
              notes: [...t.notes, { id: uid(), text: a.text, createdAt: Date.now() }],
            }
          : t,
      );
    case "deleteNote":
      return state.map((t) =>
        t.id === a.id ? { ...t, notes: t.notes.filter((n) => n.id !== a.noteId) } : t,
      );
    case "addAttachments":
      return state.map((t) =>
        t.id === a.id ? { ...t, attachments: [...t.attachments, ...a.attachments] } : t,
      );
    case "removeAttachment":
      return state.map((t) =>
        t.id === a.id
          ? { ...t, attachments: t.attachments.filter((x) => x.id !== a.attachmentId) }
          : t,
      );
    case "seed":
      return seedTickets();
    case "clear":
      return [];
    default:
      return state;
  }
}

function load(): Ticket[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Ticket[];
    }
  } catch {
    /* corrupted -> reseed */
  }
  return seedTickets();
}

function RegSign() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="var(--color-panel)" stroke="var(--color-danger)" strokeWidth="9" />
      <g transform="translate(36,38) scale(2)" stroke="var(--color-fog)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" />
        <path d="M14.5 5.5v13" strokeDasharray="2 3" />
      </g>
      <line x1="24" y1="96" x2="96" y2="24" stroke="var(--color-danger)" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [tickets, dispatch] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("due");
  const quotaWarned = useRef(false);

  /* ---------- toasts ---------- */
  const notify = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, kind, title, body }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4600,
    );
  }, []);

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tickets));
    } catch {
      if (!quotaWarned.current) {
        quotaWarned.current = true;
        notify(
          "error",
          "Browser storage is full",
          "Large attachments may not persist. Remove old evidence to free space.",
        );
      }
    }
  }, [tickets, notify]);

  /* ---------- scroll lock while overlays open ---------- */
  const detailTicket = useMemo(
    () => tickets.find((t) => t.id === detailId) ?? null,
    [tickets, detailId],
  );
  useEffect(() => {
    const lock = formOpen || !!detailTicket;
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [formOpen, detailTicket]);

  useEffect(() => {
    if (detailId && !detailTicket) setDetailId(null);
  }, [detailId, detailTicket]);

  /* ---------- derived ---------- */
  const counts: Counts = useMemo(() => {
    const c: Counts = { all: tickets.length, open: 0, soon: 0, overdue: 0, closed: 0 };
    tickets.forEach((t) => {
      c[urgencyOf(t)] += 1;
    });
    return c;
  }, [tickets]);

  const visible = useMemo(() => {
    let list = tickets.slice();
    if (status !== "all") list = list.filter((t) => urgencyOf(t) === status);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.violation, t.citationNo, t.location, t.court, t.officer, t.plate,
          ...t.notes.map((n) => n.text)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    const rank = (t: Ticket) => urgencyRank[urgencyOf(t)];
    switch (sort) {
      case "due":
        list.sort((a, b) => rank(a) - rank(b) || daysUntil(a.dueOn) - daysUntil(b.dueOn));
        break;
      case "fine":
        list.sort((a, b) => rank(a) - rank(b) || b.fine - a.fine);
        break;
      case "new":
        list.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "issued":
        list.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
        break;
    }
    return list;
  }, [tickets, status, query, sort]);

  /* ---------- actions ---------- */
  const handleAdd = (t: Ticket) => {
    dispatch({ type: "add", ticket: t });
    setFormOpen(false);
    notify("success", "Citation logged", `#${t.citationNo} is on the board — deadline armed.`);
  };

  const requestDelete = (t: Ticket) =>
    setConfirm({
      title: "Scrap this citation?",
      message: `"${t.violation}" (#${t.citationNo}) plus its notes and evidence will be gone for good.`,
      confirmLabel: "Delete it",
      danger: true,
      onConfirm: () => {
        dispatch({ type: "remove", id: t.id });
        notify("info", "Citation deleted", `#${t.citationNo} is off the record.`);
      },
    });

  const handleICS = (t: Ticket) => {
    downloadICS(t);
    notify(
      "success",
      "Calendar file downloaded",
      "Open the .ics — due date and an early alarm land in any calendar app.",
    );
  };

  const handleSMS = (t: Ticket) => {
    if (!t.phone) {
      notify("warn", "No number on file", "Open the case file and add a mobile number first.");
      return;
    }
    const a = document.createElement("a");
    a.href = smsHref(t);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    notify(
      "info",
      "Reminder drafted",
      "Your messaging app should open with the text pre-written — just hit send.",
    );
  };

  const updateTicket = (
    id: string,
    patch: Partial<Ticket>,
    toast?: [ToastKind, string, string?],
  ) => {
    dispatch({ type: "update", id, patch });
    if (toast) notify(toast[0], toast[1], toast[2]);
  };

  const addFiles = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { ok, errors } = await filesToAttachments(files);
    errors.forEach((e) => notify("error", "Attachment skipped", e));
    if (ok.length) {
      try {
        dispatch({ type: "addAttachments", id, attachments: ok });
        notify("success", ok.length === 1 ? "1 file attached" : `${ok.length} files attached`, "Filed under evidence.");
      } catch {
        notify("error", "Couldn't save", "Browser storage refused the file.");
      }
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
  };

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen">
      <div className="bg-scene" />
      <Header onNew={() => setFormOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <StatsBand
          tickets={tickets}
          onOpen={(id) => setDetailId(id)}
          onICS={handleICS}
          onSMS={handleSMS}
        />

        <FilterBar
          query={query}
          onQuery={setQuery}
          status={status}
          onStatus={setStatus}
          sort={sort}
          onSort={setSort}
          counts={counts}
        />

        {tickets.length === 0 ? (
          <Reveal>
            <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-edge bg-panel/50 px-6 py-16 text-center">
              <RegSign />
              <h2 className="mt-6 font-display text-4xl tracking-wider text-snow">
                NO TICKETS ON FILE
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-fog">
                Lucky you. The moment one shows up, log it here and CiteTrack
                will ride shotgun on the deadline.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex items-center gap-2 rounded-md bg-warn px-5 py-2.5 text-sm font-extrabold text-ink shadow-[0_3px_0_#7a5100] transition-all hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_#7a5100]"
                >
                  <IconPlus width={15} height={15} strokeWidth={2.6} /> Log a citation
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: "seed" });
                    notify("info", "Sample data restored", "Four demo citations loaded.");
                  }}
                  className="flex items-center gap-2 rounded-md border border-edge px-5 py-2.5 text-sm font-bold text-fog transition-all hover:border-edge2 hover:text-snow active:translate-y-px"
                >
                  <IconTicket width={15} height={15} /> Restore sample data
                </button>
              </div>
            </div>
          </Reveal>
        ) : visible.length === 0 ? (
          <Reveal>
            <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-edge bg-panel/50 px-6 py-14 text-center">
              <IconSearch width={30} height={30} className="text-dim" />
              <h2 className="mt-4 font-display text-2xl tracking-wider text-snow">
                NOTHING MATCHES
              </h2>
              <p className="mt-2 text-sm text-fog">
                No citations fit that search / filter combination.
              </p>
              <button
                onClick={resetFilters}
                className="mt-5 rounded-md border border-edge px-4 py-2 text-xs font-bold text-fog transition-all hover:border-warn/60 hover:text-warn active:translate-y-px"
              >
                Clear filters
              </button>
            </div>
          </Reveal>
        ) : (
          <>
            <div className="mt-8 flex items-baseline gap-3">
              <h2 className="font-display text-2xl tracking-wide text-snow">
                CITATIONS ON FILE
              </h2>
              <span className="rounded-sm border border-edge bg-panel px-2 py-0.5 font-mono text-xs font-bold text-fog">
                {visible.length}
              </span>
              <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.2em] text-dim sm:block">
                click a card for the full case file
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3.5">
              {visible.map((t, i) => (
                <Reveal key={t.id} delay={Math.min(i, 6) * 55}>
                  <TicketCard
                    ticket={t}
                    onOpen={() => setDetailId(t.id)}
                    onICS={() => handleICS(t)}
                    onSMS={() => handleSMS(t)}
                    onPaid={() =>
                      updateTicket(
                        t.id,
                        { status: "paid", resolvedAt: Date.now() },
                        ["success", "Marked as paid", `#${t.citationNo} cleared — nice driving… paperwork.`],
                      )
                    }
                    onDelete={() => requestDelete(t)}
                  />
                </Reveal>
              ))}
            </div>
          </>
        )}

        {/* footer */}
        <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-edge pt-6">
          <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-dim">
            CiteTrack v1.0 — data lives only in this browser.
            <br className="hidden sm:block" />
            .ics opens in any calendar · texts hand off to your messaging app.
          </p>
          <div className="ml-auto flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
              {tickets.length} citation{tickets.length === 1 ? "" : "s"} on file
            </span>
            {tickets.length > 0 && (
              <button
                onClick={() =>
                  setConfirm({
                    title: "Clear the whole record?",
                    message:
                      "Every citation, note and attachment stored in this browser will be permanently erased.",
                    confirmLabel: "Erase everything",
                    danger: true,
                    onConfirm: () => {
                      dispatch({ type: "clear" });
                      try {
                        localStorage.removeItem(KEY);
                      } catch {
                        /* noop */
                      }
                      notify("info", "Record erased", "Fresh start. Drive carefully.");
                    },
                  })
                }
                className="rounded-md border border-danger/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-danger transition-all hover:bg-danger/10 active:translate-y-px"
              >
                Clear all data
              </button>
            )}
          </div>
        </footer>
      </main>

      <TicketDrawer
        ticket={detailTicket}
        onClose={() => setDetailId(null)}
        onUpdate={updateTicket}
        onAddNote={(id, text) => {
          dispatch({ type: "addNote", id, text });
          notify("success", "Note filed");
        }}
        onDeleteNote={(id, noteId) => dispatch({ type: "deleteNote", id, noteId })}
        onAddFiles={addFiles}
        onRemoveAttachment={(id, attId) => {
          dispatch({ type: "removeAttachment", id, attachmentId: attId });
          notify("info", "Evidence removed");
        }}
        onRequestDelete={requestDelete}
        notify={notify}
      />

      <TicketForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleAdd}
        notify={notify}
      />

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
