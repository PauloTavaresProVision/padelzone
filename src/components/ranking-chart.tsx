export function RankingChart({ data, labels }: { data: number[]; labels: string[] }) {
  const w = 620;
  const h = 200;
  const padX = 30;
  const padY = 24;
  const max = Math.max(...data) * 1.08;
  const min = Math.min(...data) * 0.92;
  const x = (i: number) => padX + (i * (w - padX * 2)) / (data.length - 1);
  const y = (v: number) => h - padY - ((v - min) / (max - min)) * (h - padY * 2);

  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${(h - padY).toFixed(1)} L${x(0).toFixed(1)} ${(h - padY).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Histórico de ranking points">
      <defs>
        <linearGradient id="pz-rank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D2BE6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3D2BE6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={w - padX}
          y1={padY + t * (h - padY * 2)}
          y2={padY + t * (h - padY * 2)}
          stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-700"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#pz-rank)" />
      <path d={line} fill="none" stroke="#3D2BE6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#3D2BE6" stroke="#fff" strokeWidth="1.5" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={h - 4} textAnchor="middle" fontSize="10" className="fill-zinc-400">
          {l}
        </text>
      ))}
    </svg>
  );
}
