import type { Toast } from "../types";
import { IconAlert, IconCheck, IconClock, IconX } from "./icons";

const STYLE: Record<Toast["kind"], { bar: string; icon: JSX.Element }> = {
  success: { bar: "border-go", icon: <IconCheck className="text-go" /> },
  error: { bar: "border-danger", icon: <IconAlert className="text-danger" /> },
  warn: { bar: "border-warn", icon: <IconClock className="text-warn" /> },
  info: { bar: "border-edge2", icon: <IconClock className="text-fog" /> },
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
          className={`toast-in flex items-start gap-3 border border-edge ${STYLE[t.kind].bar} rounded-md border-l-4 bg-raised px-4 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-transform hover:translate-x-[-2px]`}
        >
          <span className="mt-0.5 shrink-0">{STYLE[t.kind].icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-snow">{t.title}</span>
            {t.body && (
              <span className="mt-0.5 block text-xs leading-relaxed text-fog">
                {t.body}
              </span>
            )}
          </span>
          <IconX className="ml-auto mt-0.5 shrink-0 text-dim" width={14} height={14} />
        </button>
      ))}
    </div>
  );
}
