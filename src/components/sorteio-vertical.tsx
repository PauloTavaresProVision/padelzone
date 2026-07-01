"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { FitScreen } from "./fit-screen";

type Slide = { cat: string; group: string; duplas: string[] };

const ROLL_MS = 2600; // "passar dos nomes" (suspense) antes de revelar
const REVEAL_MS = 6400; // tempo com o grupo revelado antes de avançar

const CSS =
  "@keyframes svPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}" +
  ".sv-pop{animation:svPop .55s cubic-bezier(.2,.7,.3,1) both}" +
  "@keyframes svIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}" +
  ".sv-in{animation:svIn .5s ease both}";

const BG =
  "radial-gradient(1100px 760px at 50% 4%, #8b5cf6 0%, rgba(139,92,246,0) 58%)," +
  "radial-gradient(900px 700px at 88% 96%, rgba(219,39,119,0.62) 0%, rgba(219,39,119,0) 55%)," +
  "linear-gradient(165deg,#2a0f63 0%,#5b21b6 52%,#7c3aed 100%)";

// Apresentação vertical (9:16) do sorteio para direto/Instagram: um grupo/categoria
// de cada vez, com o "passar dos nomes" (lotaria) e só depois a revelação das duplas.
export function SorteioVertical({ slides, name, exitHref }: { slides: Slide[]; name: string; exitHref: string }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [rolling, setRolling] = useState(true);
  const [flash, setFlash] = useState("");

  const allNames = useMemo(() => slides.flatMap((x) => x.duplas), [slides]);

  useEffect(() => {
    if (!started || slides.length === 0) return;
    const pool = allNames.length ? allNames : ["…"];
    setRolling(true);
    const flashIv = setInterval(() => setFlash(pool[Math.floor(Math.random() * pool.length)]), 80);
    const rollT = setTimeout(() => {
      clearInterval(flashIv);
      setRolling(false);
    }, ROLL_MS);
    const advT = slides.length > 1 ? setTimeout(() => setI((x) => (x + 1) % slides.length), ROLL_MS + REVEAL_MS) : null;
    return () => {
      clearInterval(flashIv);
      clearTimeout(rollT);
      if (advT) clearTimeout(advT);
    };
  }, [started, i, slides.length, allNames]);

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

        {!started ? (
          /* Capa com botão Começar */
          <div className="flex flex-1 flex-col items-center justify-center gap-14 px-16 text-center">
            <div>
              <p className="text-2xl font-bold uppercase tracking-[0.4em] text-violet-200">O sorteio vai começar</p>
              <h2 className="mt-5 text-[64px] font-black leading-tight">{name}</h2>
            </div>
            <button
              onClick={() => { setStarted(true); setI(0); }}
              className="inline-flex items-center gap-4 rounded-full bg-white px-16 py-7 text-4xl font-black text-[#4c1d95] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.5)] transition hover:scale-[1.04]"
            >
              <Play className="size-9 fill-current" /> Começar
            </button>
            {slides.length === 0 && <p className="text-xl text-violet-200">Sorteia as categorias primeiro (no ecrã normal); aparecem aqui.</p>}
          </div>
        ) : !s ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-16 text-center">
            <p className="text-5xl font-black">Ainda não há sorteios</p>
            <p className="text-2xl text-violet-200">Sorteia uma categoria e ela aparece aqui.</p>
          </div>
        ) : (
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

            {rolling ? (
              <div className="mt-[52px] flex w-full flex-col items-center gap-6">
                <p className="text-2xl font-bold uppercase tracking-[0.3em] text-violet-200">A sortear…</p>
                <div className="flex h-[128px] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/25 bg-white/[0.1] px-8 backdrop-blur-sm">
                  <span className="truncate text-[46px] font-black">{flash}</span>
                </div>
              </div>
            ) : (
              <div className="mt-[52px] flex w-full flex-col gap-[18px]">
                {s.duplas.map((d, k) => (
                  <div
                    key={k}
                    className="sv-in flex items-center gap-7 rounded-3xl border border-white/25 bg-white/[0.1] px-8 py-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.4)] backdrop-blur-sm"
                    style={{ animationDelay: `${(0.1 + k * 0.12).toFixed(2)}s` }}
                  >
                    <span className="grid size-[66px] shrink-0 place-items-center rounded-2xl text-3xl font-black text-[#3b0764] shadow-[0_6px_18px_-4px_rgba(192,132,252,0.6)]" style={{ background: "linear-gradient(135deg,#f5d0fe,#c084fc)" }}>
                      {k + 1}
                    </span>
                    <span className="truncate text-[40px] font-extrabold leading-tight">{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex shrink-0 items-center justify-between px-16 pb-14">
          <a href={exitHref} className="rounded-xl border border-white/25 bg-white/[0.08] px-5 py-2.5 text-lg font-semibold text-white/80 transition hover:bg-white/15">Sair</a>
          {started && slides.length > 1 && (
            <div className="flex items-center gap-3.5">
              {slides.map((_, k) => (
                <span key={k} className={`h-3.5 rounded-full transition-all ${k === i ? "w-10 bg-white" : "w-3.5 bg-white/40"}`} />
              ))}
            </div>
          )}
          <span className="text-lg font-semibold text-white/50">{started && s ? `${s.cat} · ${s.group}` : ""}</span>
        </div>
      </div>
    </FitScreen>
  );
}
