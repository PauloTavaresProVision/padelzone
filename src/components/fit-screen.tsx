"use client";

import { useEffect, useState } from "react";

// Placar de TV desenhado numa tela fixa de 1920x1080 e escalado para caber em
// QUALQUER ecrã, mantendo a proporção (contain). As letras e o espaçamento
// escalam juntos, por isso adapta-se de um portátil a uma TV 4K sem cortar.
export function FitScreen({ width = 1920, height = 1080, children }: { width?: number; height?: number; children: React.ReactNode }) {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    fit();
    window.addEventListener("resize", fit);
    const t = setTimeout(fit, 60); // reajusta depois de carregar fontes/layout
    return () => {
      window.removeEventListener("resize", fit);
      clearTimeout(t);
    };
  }, [width, height]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#eceaf4" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width,
          height,
          transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
          transformOrigin: "center",
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
