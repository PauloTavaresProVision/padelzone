"use client";

import { useRef, useState, useTransition } from "react";
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link2, ImagePlus, Check } from "lucide-react";
import { updateRules, uploadRuleImage } from "@/server/actions/rules";

export function RulesEditor({ competitionId, initialHtml }: { competitionId: number; initialHtml: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("competitionId", String(competitionId));
      fd.set("image", f);
      const url = await uploadRuleImage(fd);
      if (url) {
        ref.current?.focus();
        document.execCommand("insertImage", false, url);
      }
    } finally {
      setUploading(false);
    }
  };

  const save = () =>
    start(async () => {
      await updateRules(competitionId, ref.current?.innerHTML ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-zinc-900">
      {children}
    </button>
  );

  return (
    <div className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line p-2">
        <Btn onClick={() => cmd("bold")} title="Negrito"><Bold className="size-4" /></Btn>
        <Btn onClick={() => cmd("italic")} title="Itálico"><Italic className="size-4" /></Btn>
        <Btn onClick={() => cmd("underline")} title="Sublinhado"><Underline className="size-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn onClick={() => cmd("formatBlock", "H2")} title="Título"><Heading2 className="size-4" /></Btn>
        <Btn onClick={() => cmd("formatBlock", "H3")} title="Subtítulo"><Heading3 className="size-4" /></Btn>
        <Btn onClick={() => cmd("insertUnorderedList")} title="Lista"><List className="size-4" /></Btn>
        <Btn onClick={() => cmd("insertOrderedList")} title="Lista numerada"><ListOrdered className="size-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn onClick={() => { const url = prompt("Endereço do link (https://…):"); if (url) cmd("createLink", url); }} title="Link"><Link2 className="size-4" /></Btn>
        <Btn onClick={() => fileRef.current?.click()} title="Inserir imagem"><ImagePlus className="size-4" /></Btn>
        {uploading && <span className="ml-1 text-xs text-soft">a carregar imagem…</span>}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        className="rules-content min-h-[280px] max-w-none px-4 py-3 text-sm leading-relaxed text-zinc-800 focus:outline-none"
      />

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImage} />

      <div className="flex items-center justify-end gap-3 border-t border-line p-3">
        {saved && <span className="inline-flex items-center gap-1 text-sm font-medium text-success"><Check className="size-4" /> Guardado</span>}
        <button onClick={save} disabled={pending} className="pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
          {pending ? "A guardar…" : "Guardar regulamento"}
        </button>
      </div>
    </div>
  );
}
