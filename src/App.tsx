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

  const notify = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, kind, title, body }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4600,
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tickets));
    } catch {
      if (!quotaWarned.current) {
        quotaWarned.current = true;
        notify(
          "error",
          "Storage full",
          "Remove old attachments to free space.",
        );
      }
    }
  }, [tickets, notify]);

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

  const handleAdd = (t: Ticket) => {
    dispatch({ type: "add", ticket: t });
    setFormOpen(false);
    notify("success", "Ticket saved", `#${t.citationNo} added.`);
  };

  const requestDelete = (t: Ticket) =>
    setConfirm({
      title: "Delete this ticket?",
      message: `"${t.violation}" (#${t.citationNo}) and all its notes and attachments will be permanently deleted.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => {
        dispatch({ type: "remove", id: t.id });
        notify("info", "Deleted", `#${t.citationNo} removed.`);
      },
    });

  const handleICS = (t: Ticket) => {
    downloadICS(t);
    notify("success", "Calendar file downloaded");
  };

  const handleSMS = (t: Ticket) => {
    if (!t.phone) {
      notify("warn", "No phone number", "Add a number in the ticket details first.");
      return;
    }
    const a = document.createElement("a");
    a.href = smsHref(t);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    notify("info", "Reminder drafted", "Your messaging app should open with the text ready.");
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
        notify("success", ok.length === 1 ? "1 file added" : `${ok.length} files added`);
      } catch {
        notify("error", "Couldn't save", "Storage refused the file.");
      }
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
  };

  return (
    <div className="min-h-screen">
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
            <div className="mt-10 flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-surface px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-soft">
                <IconTicket width={32} height={32} className="text-blue" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-text">
                No tickets yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                When a ticket comes in, log it here and we'll track the deadline for you.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue2 active:translate-y-px"
                >
                  <IconPlus width={16} height={16} strokeWidth={2.2} /> Add first ticket
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: "seed" });
                    notify("info", "Sample data loaded");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text2 transition-colors hover:bg-raised"
                >
                  Load sample data
                </button>
              </div>
            </div>
          </Reveal>
        ) : visible.length === 0 ? (
          <Reveal>
            <div className="mt-10 flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-surface px-6 py-14 text-center">
              <IconSearch width={32} height={32} className="text-muted" />
              <h2 className="mt-4 font-display text-xl font-bold text-text">
                No matches
              </h2>
              <p className="mt-2 text-sm text-muted">
                No tickets match that search or filter.
              </p>
              <button
                onClick={resetFilters}
                className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition-colors hover:bg-raised"
              >
                Clear filters
              </button>
            </div>
          </Reveal>
        ) : (
          <>
            <div className="mt-8 flex items-baseline gap-3">
              <h2 className="font-display text-xl font-bold text-text">
                All Tickets
              </h2>
              <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-muted">
                {visible.length}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {visible.map((t, i) => (
                <Reveal key={t.id} delay={Math.min(i, 6) * 50}>
                  <TicketCard
                    ticket={t}
                    onOpen={() => setDetailId(t.id)}
                    onICS={() => handleICS(t)}
                    onSMS={() => handleSMS(t)}
                    onPaid={() =>
                      updateTicket(
                        t.id,
                        { status: "paid", resolvedAt: Date.now() },
                        ["success", "Marked as paid"],
                      )
                    }
                    onDelete={() => requestDelete(t)}
                  />
                </Reveal>
              ))}
            </div>
          </>
        )}

        <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
          <p className="text-xs text-muted">
            Ascent Logistics Ticket Tracker · Data stored in this browser only
          </p>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-muted">
              {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
            </span>
            {tickets.length > 0 && (
              <button
                onClick={() =>
                  setConfirm({
                    title: "Clear all data?",
                    message:
                      "Every ticket, note, and attachment will be permanently erased.",
                    confirmLabel: "Clear all",
                    danger: true,
                    onConfirm: () => {
                      dispatch({ type: "clear" });
                      try {
                        localStorage.removeItem(KEY);
                      } catch {
                        /* noop */
                      }
                      notify("info", "All data cleared");
                    },
                  })
                }
                className="rounded-lg border border-red-border px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-red-soft"
              >
                Clear all
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
          notify("success", "Note added");
        }}
        onDeleteNote={(id, noteId) => dispatch({ type: "deleteNote", id, noteId })}
        onAddFiles={addFiles}
        onRemoveAttachment={(id, attId) => {
          dispatch({ type: "removeAttachment", id, attachmentId: attId });
          notify("info", "Removed");
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
