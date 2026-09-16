import type { Ticket } from "../types";
import { addDaysISO, daysUntil, fmtDate, fmtMoney, todayISO } from "./utils";

const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

const compact = (iso: string) => iso.replace(/-/g, "");

export function buildICS(t: Ticket): string {
  const desc = [
    `Citation: ${t.citationNo}`,
    `Fine: ${fmtMoney(t.fine)}`,
    t.court ? `Court: ${t.court}` : "",
    t.location ? `Location: ${t.location}` : "",
    `Logged with CiteTrack — don't miss this one.`,
  ]
    .filter(Boolean)
    .join("\n");

  const lead = Math.max(0, Math.min(30, t.leadDays || 3));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CiteTrack//Citation Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${t.id}@citetrack.local`,
    `DTSTAMP:${compact(todayISO())}T090000Z`,
    `DTSTART;VALUE=DATE:${compact(t.dueOn)}`,
    `DTEND;VALUE=DATE:${compact(addDaysISO(t.dueOn, 1))}`,
    `SUMMARY:${esc(`DUE: ${t.violation} (${t.citationNo})`)}`,
    `DESCRIPTION:${esc(desc)}`,
    t.court || t.location ? `LOCATION:${esc(t.court || t.location)}` : "",
    "BEGIN:VALARM",
    lead === 0 ? "TRIGGER:P0D" : `TRIGGER:-P${lead}D`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Ticket due in ${lead} day(s): ${t.violation}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadICS(t: Ticket) {
  const blob = new Blob([buildICS(t)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `citation-${t.citationNo.replace(/[^\w-]+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function googleCalUrl(t: Ticket): string {
  const dates = `${compact(t.dueOn)}/${compact(addDaysISO(t.dueOn, 1))}`;
  const details = [
    `Citation ${t.citationNo} — fine ${fmtMoney(t.fine)}.`,
    t.court ? `Court: ${t.court}.` : "",
    "Logged with CiteTrack.",
  ]
    .filter(Boolean)
    .join(" ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `DUE: ${t.violation} (${t.citationNo})`,
    dates,
    details,
    location: t.court || t.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function reminderText(t: Ticket): string {
  const d = daysUntil(t.dueOn);
  const when =
    d < 0
      ? `was due ${fmtDate(t.dueOn)} — ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} OVERDUE`
      : d === 0
        ? `is due TODAY (${fmtDate(t.dueOn)})`
        : `is due ${fmtDate(t.dueOn)} — in ${d} day${d === 1 ? "" : "s"}`;
  const bits = [
    `CITETRACK REMINDER: "${t.violation}" (${t.citationNo}) ${when}.`,
    `Fine: ${fmtMoney(t.fine)}.`,
  ];
  if (t.court) bits.push(`Court: ${t.court}.`);
  bits.push("Pay or respond before it snowballs.");
  return bits.join(" ");
}

export function smsHref(t: Ticket): string {
  const phone = t.phone.replace(/[^+\d]/g, "");
  return `sms:${phone}?&body=${encodeURIComponent(reminderText(t))}`;
}

export async function copyReminder(t: Ticket): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(reminderText(t));
    return true;
  } catch {
    return false;
  }
}
