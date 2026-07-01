"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Minimize } from "lucide-react";

export function TvControls({ refreshSeconds = 45 }: { refreshSeconds?: number }) {
  const [time, setTime] = useState("--:--:--");
  const [fs, setFs] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Atualiza os dados sem recarregar a página (senão sairia do ecrã completo).
    const r = setInterval(() => router.refresh(), refreshSeconds * 1000);
    return () => clearInterval(r);
  }, [refreshSeconds, router]);

  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">{time}</span>
      <button
        onClick={toggle}
        title={fs ? "Sair de ecrã completo" : "Ecrã completo"}
        className="grid size-10 place-items-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
      >
        {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
      </button>
    </div>
  );
}
