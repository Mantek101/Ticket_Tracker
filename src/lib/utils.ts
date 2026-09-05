import type { Ticket, Urgency } from "../types";

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const daysUntil = (iso: string) =>
  Math.round(
    (parseISO(iso).getTime() - parseISO(todayISO()).getTime()) / 86400000,
  );

export const addDaysISO = (iso: string, days: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const fmtDate = (iso: string) =>
  parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtDateShort = (iso: string) =>
  parseISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });

export const fmtBytes = (b: number) =>
  b < 1024
    ? `${b} B`
    : b < 1048576
      ? `${Math.round(b / 1024)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;

export const timeAgo = (ts: number) => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const isOpen = (t: Ticket) =>
  t.status === "open" || t.status === "contesting";

export const urgencyOf = (t: Ticket): Urgency => {
  if (!isOpen(t)) return "closed";
  const d = daysUntil(t.dueOn);
  if (d < 0) return "overdue";
  if (d <= 7) return "soon";
  return "open";
};

export const urgencyRank: Record<Urgency, number> = {
  overdue: 0,
  soon: 1,
  open: 2,
  closed: 3,
};

interface UrgencyStyle {
  label: string;
  text: string;
  bg: string;
  softBg: string;
  border: string;
  bar: string;
}

export const URGENCY: Record<Urgency, UrgencyStyle> = {
  overdue: {
    label: "Overdue",
    text: "text-danger",
    bg: "bg-danger",
    softBg: "bg-danger/10",
    border: "border-danger/45",
    bar: "bg-danger",
  },
  soon: {
    label: "Due soon",
    text: "text-warn",
    bg: "bg-warn",
    softBg: "bg-warn/10",
    border: "border-warn/45",
    bar: "bg-warn",
  },
  open: {
    label: "Open",
    text: "text-go",
    bg: "bg-go",
    softBg: "bg-go/10",
    border: "border-go/40",
    bar: "bg-go",
  },
  closed: {
    label: "Closed",
    text: "text-fog",
    bg: "bg-fog",
    softBg: "bg-fog/10",
    border: "border-edge",
    bar: "bg-fog",
  },
};

export const STATUS_LABEL: Record<Ticket["status"], string> = {
  open: "Open",
  contesting: "Contesting",
  paid: "Paid",
  dismissed: "Dismissed",
};

/** percent of the window between issued -> due that has elapsed */
export const windowElapsed = (t: Ticket) => {
  const total = parseISO(t.dueOn).getTime() - parseISO(t.issuedOn).getTime();
  if (total <= 0) return 100;
  const elapsed = Date.now() - parseISO(t.issuedOn).getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
};
