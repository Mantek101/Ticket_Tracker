import { IconSearch, IconX } from "./icons";

export type StatusFilter = "all" | "open" | "soon" | "overdue" | "closed";
export type SortKey = "due" | "fine" | "new" | "issued";

export interface Counts {
  all: number;
  open: number;
  soon: number;
  overdue: number;
  closed: number;
}

const CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "soon", label: "Due soon" },
  { key: "overdue", label: "Overdue" },
  { key: "closed", label: "Closed" },
];

export default function FilterBar({
  query,
  onQuery,
  status,
  onStatus,
  sort,
  onSort,
  counts,
}: {
  query: string;
  onQuery: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  counts: Counts;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="relative">
        <IconSearch
          width={15}
          height={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search tickets..."
          className="w-[240px] rounded-lg border border-border bg-surface py-2 pl-9 pr-8 text-sm text-text placeholder:text-dim transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-text"
          >
            <IconX width={13} height={13} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map((c) => {
          const active = status === c.key;
          return (
            <button
              key={c.key}
              onClick={() => onStatus(c.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:translate-y-px ${
                active
                  ? "bg-navy text-white"
                  : "border border-border text-muted hover:border-border2 hover:text-text"
              } ${c.key === "overdue" && !active && counts.overdue > 0 ? "border-red-border text-red" : ""}`}
            >
              {c.label}
              <span className={`ml-1.5 ${active ? "text-white/60" : "text-dim"}`}>
                {counts[c.key]}
              </span>
            </button>
          );
        })}
      </div>

      <label className="ml-auto flex items-center gap-2">
        <span className="text-xs font-medium text-muted">Sort by</span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-medium text-text transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        >
          <option value="due">Due date ↑</option>
          <option value="fine">Fine ↓</option>
          <option value="new">Newest</option>
          <option value="issued">Issued ↓</option>
        </select>
      </label>
    </div>
  );
}
