# PadelZone — lê isto primeiro

**PadelZone** é uma plataforma de gestão de torneios de **padel** (e ténis) para o mercado **angolano**, inspirada no PadelTeams (padelteams.pt). Projeto **greenfield** (repo novo, do zero), separado de qualquer outro projeto. Língua da UI: **Português (PT)**.

## Estado atual
- **Fundação construída e verificada (2026-06-24):** Next.js 16.2.9 + React 19 + Tailwind v4; Prisma 6.19 (**fixado em v6** — v7 muda a config e deixa de auto-carregar `.env`); PostgreSQL em Docker. Modelo de dados migrado (`prisma/migrations/`), seed aplicado, e a página inicial lê da BD (verificado a renderizar os dados semeados, HTTP 200).
- **Motor de torneios construído e testado (2026-06-24):** geradores puros em `src/lib/tournament/` (`knockout` = `seedOrder` + árvore; `roundRobin` = método do círculo; `groups` = serpentina; `mexicano`; `americano4`; `computeStandings`) — **18 testes Vitest a passar** (`npm test`).
- **Próximo passo:** funcionalidades sobre o motor — **inscrições → pagamentos (Multicaixa) → sorteios**. Ver `docs/PRD.md`.
- Lê os documentos de design **antes** de construir:
  - `docs/PRD.md` — visão, atores, mapa de funcionalidades e âmbito do MVP.
  - `docs/tournament-engine.md` — **o coração do produto**: esquemas de torneio, geração de jogos e modelo de dados (Prisma).

## Comandos
- `npm run db:up` — arranca o Postgres (Docker, porta **5433**).
- `npm run dev` — Next.js. `npm run db:migrate` / `db:seed` / `db:studio` / `db:reset`.
- Demo: `admin@padelzone.ao` / `password123`.

## Notas de build (gotchas)
- Enums do Prisma: **um valor por linha** (não aceita `enum X { A B }` numa só linha).
- `prisma.seed` vive no `package.json` (deprecado em v7 → migrar para `prisma.config.ts` se/quando subir a v7).

## Stack (decidida)
- **Next.js** (App Router) + React + TypeScript + Tailwind — **web mobile-first / PWA** primeiro (apps nativas só mais tarde).
- **Prisma + PostgreSQL** — o Postgres tem `enum` e `jsonb` nativos: **usa-os**. (Não há aqui as limitações de SQL Server de outros projetos.)
- Auth + RBAC próprios. Papéis: Admin da plataforma, Clube/Diretor, Juiz-Árbitro, Staff, Jogador.

## Restrições de Angola (decisões de produto)
- **Pagamentos locais**: Multicaixa Express + Referência Multicaixa no MVP; Unitel Money / Africell Money depois. **Cartão/Stripe não servem em Angola.**
- **Moeda**: Kwanza (Kz / AOA); formatação `pt-AO`.
- **Notificações**: WhatsApp como canal principal (+ email). SMS/push depois.
- **Mobile-first / dados intermitentes**: páginas leves; inserção de resultados tolerante a offline.

## Como trabalhar
- Mantém a UI e os textos em **Português (PT)**.
- Cada esquema de torneio = **um gerador isolado**. Antes de implementar um, lê `docs/tournament-engine.md`.
- Quando uma decisão de design mudar, **atualiza os docs** (são a fonte de verdade).
