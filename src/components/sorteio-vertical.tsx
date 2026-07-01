"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FitScreen } from "./fit-screen";

type Slide = { cat: string; group: string; duplas: string[] };

const ADVANCE_MS = 9000; // tempo em cada grupo/categoria
const CSS =
  "@keyframes svPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}" +
  ".sv-pop{animation:svPop .5s cubic-bezier(.2,.7,.3,1) both}" +
  "@keyframes svIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}" +
  ".sv-in{animation:svIn .5s ease both}";

// Apresentação vertical (9:16) do sorteio para direto/Instagram: mostra um grupo
// ou categoria de cada vez, em grande, e vai avançando sozinho.
export function SorteioVertical({ slides, name, exitHref }: { slides: Slide[]; name: string; exitHref: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), ADVANCE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  // Apanha novos sorteios (feitos noutro ecrã) sem sair do ecrã completo.
  useEffect(() => {
    const r = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(r);
  }, [router]);

  const s = slides.length ? slides[Math.min(i, slides.length - 1)] : null;

  return (
    <FitScreen width={1080} height={1920}>
      <style>{CSS}</style>
      <div className="flex h-[1920px] w-[1080px] flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#ffffff 0%,#f1eefa 100%)" }}>
        <header className="pz-gradient px-12 py-9 text-center text-white">
          <p className="text-xl font-bold uppercase tracking-[0.3em] text-white/80">Sorteio ao vivo</p>
          <h1 className="mt-2 truncate text-5xl font-black">{name}</h1>
        </header>

        {s ? (
          <main key={i} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-16">
            <div className="pz-gradient sv-pop grid size-44 place-items-center rounded-[2.5rem] text-7xl font-black text-white shadow-xl">{s.cat}</div>
            <p className="sv-in text-4xl font-black uppercase tracking-wide text-brand-purple">{s.group}</p>
            <ol className="w-full space-y-4">
              {s.duplas.map((d, k) => (
                <li
                  key={k}
                  className="sv-in flex items-center gap-5 rounded-2xl border border-line bg-surface px-7 py-5 pz-shadow-card"
                  style={{ animationDelay: `${(0.15 + k * 0.12).toFixed(2)}s` }}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-light text-2xl font-black text-brand-purple">{k + 1}</span>
                  <span className="truncate text-3xl font-bold text-zinc-900">{d}</span>
                </li>
              ))}
            </ol>
          </main>
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center gap-4 px-16 text-center">
            <p className="text-5xl font-black text-zinc-900">Ainda não há sorteios</p>
            <p className="text-2xl text-muted">Sorteia uma categoria e ela aparece aqui, em grande.</p>
          </main>
        )}

        <footer className="flex items-center justify-between px-12 py-7">
          <a href={exitHref} className="rounded-xl border border-line bg-surface px-5 py-2.5 text-lg font-semibold text-muted">Sair</a>
          {slides.length > 1 && (
            <div className="flex gap-2">
              {slides.map((_, k) => (
                <span key={k} className={`size-3 rounded-full ${k === i ? "bg-brand-purple" : "bg-zinc-300"}`} />
              ))}
            </div>
          )}
          <span className="text-lg font-semibold text-soft">{s ? `${s.cat} · ${s.group}` : ""}</span>
        </footer>
      </div>
    </FitScreen>
  );
}
