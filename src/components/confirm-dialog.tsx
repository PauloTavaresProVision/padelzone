"use client";

import { useEffect } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

// Modal central de confirmação (substitui o window.confirm básico do browser).
export function ConfirmDialog({
  open,
  title = "Tens a certeza?",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = tone === "danger";
  const Icon = isDanger ? AlertTriangle : Sparkles;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="pz-shadow-card w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
        <div className={`mx-auto grid size-12 place-items-center rounded-2xl ${isDanger ? "bg-danger-bg text-danger" : "bg-primary-light text-brand-purple"}`}>
          <Icon className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-zinc-900">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{message}</p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-soft">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${isDanger ? "bg-danger hover:opacity-90" : "pz-gradient hover:opacity-95"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
