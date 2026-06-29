"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { CreateCompetitionForm } from "./create-competition-form";

type Template = { id: number; code: string; label: string; gender: string };

export function CreateTournamentModal({ clubId, templates }: { clubId: number; templates: Template[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pz-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
      >
        <Plus className="size-4" /> Novo torneio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 py-10" onClick={() => setOpen(false)}>
          <div className="relative mx-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="pz-shadow-card absolute -right-3 -top-3 z-10 grid size-9 place-items-center rounded-full bg-surface text-muted transition hover:bg-surface-soft"
            >
              <X className="size-5" />
            </button>
            <CreateCompetitionForm clubId={clubId} templates={templates} />
          </div>
        </div>
      )}
    </>
  );
}
