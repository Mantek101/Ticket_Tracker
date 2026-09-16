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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-in w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              state.danger ? "bg-red-soft text-red" : "bg-amber-soft text-amber"
            }`}
          >
            <IconAlert />
          </span>
          <h3 className="font-display text-lg font-bold text-text">
            {state.title}
          </h3>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-muted transition-colors hover:bg-raised hover:text-text"
            aria-label="Cancel"
          >
            <IconX />
          </button>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-text2">
          {state.message}
        </p>
        <div className="flex justify-end gap-2.5 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text2 transition-colors hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:translate-y-px ${
              state.danger
                ? "bg-red hover:brightness-110"
                : "bg-amber hover:brightness-110"
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
