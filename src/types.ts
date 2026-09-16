export type TicketStatus = "open" | "contesting" | "paid" | "dismissed";

export type Urgency = "overdue" | "soon" | "open" | "closed";

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** data URL or remote/public path */
  src: string;
  kind: "image" | "file";
  addedAt: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
}

export interface Ticket {
  id: string;
  citationNo: string;
  violation: string;
  location: string;
  officer: string;
  plate: string;
  court: string;
  /** ISO date YYYY-MM-DD */
  issuedOn: string;
  /** ISO date YYYY-MM-DD */
  dueOn: string;
  fine: number;
  status: TicketStatus;
  /** phone used for SMS reminders */
  phone: string;
  /** how many days before due date a reminder should fire */
  leadDays: number;
  notes: Note[];
  attachments: Attachment[];
  createdAt: number;
  resolvedAt: number | null;
}

export type ToastKind = "success" | "error" | "info" | "warn";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
}
