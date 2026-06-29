"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Loader2 } from "lucide-react";
import { launchDraw } from "@/server/actions/draw";

const SUSPENSE_MS = 3000;

export function LiveDrawButton({ categoryId, categoryName, names }: { categoryId: number; categoryName: string; names: string[] }) {
  const router = useRouter();
  const [drawing, setDrawing] = useState(false);
  const [flash, setFlash] = useState(names[0] ?? "…");

  useEffect(() => {
    if (!drawing) return;
    // Efeito "lotaria": os nomes das duplas passam rapidamente durante o suspense.
    const tick = setInterval(() => {
      setFlash(names.length ? names[Math.floor(Math.random() * names.length)] : "…");
    }, 85);
    const done = setTimeout(async () => {
      clearInterval(tick);
      try {
        const fd = new FormData();
        fd.set("categoryId", String(categoryId));
        await launchDraw(fd);
        router.refresh(); // garante que a página re-renderiza e mostra os grupos a revelar-se
      } catch {
        setDrawing(false);
      }
    }, SUSPENSE_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [drawing, names, categoryId, router]);

  return (
    <>
      <button
        onClick={() => setDrawing(true)}
        disabled={drawing}
        className="pz-gradient inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.03] hover:opacity-95 disabled:opacity-80"
      >
        <Shuffle className="size-6" /> Sortear {categoryName}
      </button>

      {drawing && (
        <div className="pz-gradient fixed inset-0 z-50 grid place-items-center p-6 text-white">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">A gerar o sorteio</p>
            <div className="mx-auto mt-5 grid size-28 place-items-center rounded-3xl bg-white/15 text-5xl font-extrabold shadow-2xl">{categoryName}</div>
            <div className="mx-auto mt-7 h-14 w-[min(90vw,30rem)] overflow-hidden rounded-2xl border border-white/25 bg-white/10">
              <p className="flex h-full items-center justify-center whitespace-nowrap px-4 text-xl font-bold">{flash}</p>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-white/85">
              <Loader2 className="size-4 animate-spin" /> Aguarde enquanto sorteamos as duplas…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
