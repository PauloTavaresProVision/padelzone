"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FitScreen } from "./fit-screen";

type Slide = { cat: string; group: string; duplas: string[] };

const ADVANCE_MS = 9000; // tempo em cada grupo/categoria
const CSS =
  "@keyframes svPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}" +
  ".sv-pop{animation:svPop .55s cubic-bezier(.2,.7,.3,1) both}" +
  "@keyframes svIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}" +
  ".sv-in{animation:svIn .5s ease both}";

const BG =
  "radial-gradient(1100px 760px at 50% 4%, #8b5cf6 0%, rgba(139,92,246,0) 58%)," +
  "radial-gradient(900px 700px at 88% 96%, rgba(219,39,119,0.62) 0%, rgba(219,39,119,0) 55%)," +
  "linear-gradient(165deg,#2a0f63 0%,#5b21b6 52%,#7c3aed 100%)";

// Apresentação vertical (9:16) do sorteio para direto/Instagram: mostra um grupo
// ou categoria de cada vez, em grande, com um visual de transmissão, e vai avançando.
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
  const gMatch = s?.group.match(/^Grupo\s+(.+)$/i);

  return (
    <FitScreen width={1080} height={1920}>
      <style>{CSS}</style>
      <div className="flex h-[1920px] w-[1080px] flex-col overflow-hidden text-white" style={{ background: BG }}>
        {/* Topo */}
        <div className="flex shrink-0 items-center justify-between px-16 pt-14">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/padelzone-logo.png" alt="PadelZone" className="h-8" />
            </div>
            <p className="truncate text-2xl font-extrabold">{name}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/30 bg-white/[0.12] px-5 py-2.5 text-lg font-extrabold uppercase tracking-[0.18em]">
            <span className="size-3 rounded-full bg-pink-400 shadow-[0_0_16px_#f472b6]" /> Sorteio
          </span>
        </div>

        {/* Centro */}
        {s ? (
          <div key={i} className="flex min-h-0 flex-1 flex-col items-center justify-center px-[72px]">
            <div className="sv-pop grid size-[300px] place-items-center rounded-[4.5rem] border-2 border-white/40 bg-white/[0.14] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.45),0_0_90px_-10px_rgba(192,132,252,0.55),inset_0_2px_0_rgba(255,255,255,0.4)] backdrop-blur-md">
              <span className="text-[150px] font-black leading-none tracking-tight drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]">{s.cat}</span>
            </div>

            <div className="sv-in mt-11 text-center">
              {gMatch ? (
                <>
                  <p className="text-[26px] font-extrabold uppercase tracking-[0.35em] text-violet-200">Grupo</p>
                  <p className="mt-1.5 text-[88px] font-black leading-none">{gMatch[1]}</p>
                </>
              ) : (
                <p className="text-[64px] font-black leading-none">{s.group}</p>
              )}
            </div>

            <div className="mt-[52px] flex w-full flex-col gap-[18px]">
              {s.duplas.map((d, k) => (
                <div
                  key={k}
                  className="sv-in flex items-center gap-7 rounded-3xl border border-white/25 bg-white/[0.1] px-8 py-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.4)] backdrop-blur-sm"
                  style={{ animationDelay: `${(0.15 + k * 0.12).toFixed(2)}s` }}
                >
                  <span className="grid size-[66px] shrink-0 place-items-center rounded-2xl text-3xl font-black text-[#3b0764] shadow-[0_6px_18px_-4px_rgba(192,132,252,0.6)]" style={{ background: "linear-gradient(135deg,#f5d0fe,#c084fc)" }}>
                    {k + 1}
                  </span>
                  <span className="truncate text-[40px] font-extrabold leading-tight">{d}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-16 text-center">
            <p className="text-6xl font-black">Ainda não há sorteios</p>
            <p className="text-2xl text-violet-200">Sorteia uma categoria e ela aparece aqui, em grande.</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex shrink-0 items-center justify-between px-16 pb-14">
          <a href={exitHref} className="rounded-xl border border-white/25 bg-white/[0.08] px-5 py-2.5 text-lg font-semibold text-white/80 transition hover:bg-white/15">Sair</a>
          {slides.length > 1 && (
            <div className="flex items-center gap-3.5">
              {slides.map((_, k) => (
                <span key={k} className={`h-3.5 rounded-full transition-all ${k === i ? "w-10 bg-white" : "w-3.5 bg-white/40"}`} />
              ))}
            </div>
          )}
          <span className="text-lg font-semibold text-white/50">{s ? `${s.cat} · ${s.group}` : ""}</span>
        </div>
      </div>
    </FitScreen>
  );
}
