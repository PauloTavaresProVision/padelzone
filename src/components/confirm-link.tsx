"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

// Link que pede confirmação (modal central) antes de navegar, quando needConfirm.
// Ex.: entrar no sorteio ao vivo quando o torneio já tem sorteios feitos.
export function ConfirmLink({
  href,
  needConfirm = false,
  title,
  message,
  confirmLabel = "Continuar",
  tone = "brand",
  className,
  children,
}: {
  href: string;
  needConfirm?: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "brand";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!needConfirm) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
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
          router.push(href);
        }}
      />
    </>
  );
}
