import { useEffect } from "react";
import { IconAlert, IconX } from "./icons";

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/75 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-in w-full max-w-md rounded-lg border border-edge bg-panel shadow-[0_28px_70px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 border-b border-edge px-5 py-4">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-md ${
              state.danger ? "bg-danger/12 text-danger" : "bg-warn/12 text-warn"
            }`}
          >
            <IconAlert />
          </span>
          <h3 className="font-display text-lg tracking-wide text-snow">
            {state.title}
          </h3>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1.5 text-fog transition-colors hover:bg-raised hover:text-snow"
            aria-label="Cancel"
          >
            <IconX />
          </button>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-fog">
          {state.message}
        </p>
        <div className="flex justify-end gap-2.5 border-t border-edge px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-edge px-4 py-2 text-sm font-bold text-fog transition-all hover:border-edge2 hover:text-snow active:translate-y-px"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`rounded-md px-4 py-2 text-sm font-extrabold text-ink transition-all active:translate-y-px ${
              state.danger
                ? "bg-danger hover:brightness-110"
                : "bg-warn hover:brightness-110"
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
