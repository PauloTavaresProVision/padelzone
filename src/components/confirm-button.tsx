"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

// Botão que pede confirmação (modal central) antes de submeter o formulário.
// Ações destrutivas/sensíveis: gerar/refazer quadro, limpar sorteio, recomeçar, lançar.
export function ConfirmButton({
  message,
  title,
  confirmLabel,
  tone = "danger",
  className,
  children,
}: {
  message: string;
  title?: string;
  confirmLabel?: string;
  tone?: "danger" | "brand";
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={ref} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        tone={tone}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          ref.current?.closest("form")?.requestSubmit();
        }}
      />
    </>
  );
}
