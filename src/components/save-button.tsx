"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";

// Botão de submit que dá feedback: "A guardar…" enquanto grava e "Guardado ✓" no fim.
// Usa o estado do próprio formulário (useFormStatus), por isso serve qualquer server action.
export function SaveButton({ children = "Guardar", className }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (was.current && !pending) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
    was.current = pending;
  }, [pending]);

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "A guardar…" : saved ? "Guardado ✓" : children}
    </button>
  );
}
