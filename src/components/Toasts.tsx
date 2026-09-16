import type { Toast } from "../types";
import { IconAlert, IconCheck, IconClock, IconX } from "./icons";

const STYLE: Record<Toast["kind"], { border: string; icon: JSX.Element }> = {
  success: { border: "border-l-green", icon: <IconCheck className="text-green" /> },
  error: { border: "border-l-red", icon: <IconAlert className="text-red" /> },
  warn: { border: "border-l-amber", icon: <IconClock className="text-amber" /> },
  info: { border: "border-l-blue", icon: <IconClock className="text-blue" /> },
};

export default function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`toast-in flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface px-4 py-3 text-left shadow-lg transition-transform hover:translate-x-[-2px] ${STYLE[t.kind].border}`}
        >
          <span className="mt-0.5 shrink-0">{STYLE[t.kind].icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text">{t.title}</span>
            {t.body && (
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                {t.body}
              </span>
            )}
          </span>
          <IconX className="ml-auto mt-0.5 shrink-0 text-muted" width={14} height={14} />
        </button>
      ))}
    </div>
  );
}
