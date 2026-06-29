"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function usePagination<T>(items: T[], pageSize: number, resetKey: string) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const from = items.length === 0 ? 0 : (safePage - 1) * pageSize;
  const pageItems = items.slice(from, from + pageSize);
  return { page: safePage, setPage, pageCount, pageItems, total: items.length, from, to: from + pageItems.length };
}

function pageList(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) out.push(i);
  if (page < pageCount - 2) out.push("…");
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const btn = "grid size-9 place-items-center rounded-lg border border-line text-sm font-medium text-muted transition hover:bg-surface-soft disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        A mostrar <strong className="text-zinc-900">{from + 1}–{to}</strong> de <strong className="text-zinc-900">{total}</strong>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Anterior" className={btn}>
            <ChevronLeft className="size-4" />
          </button>
          {pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-soft">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`grid size-9 place-items-center rounded-lg text-sm font-semibold transition ${
                  p === page ? "pz-gradient text-white" : "border border-line text-muted hover:bg-surface-soft"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Seguinte" className={btn}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
