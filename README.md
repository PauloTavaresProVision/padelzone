# PadelZone

Plataforma de gestão de torneios de **padel** para Angola — inscrições, sorteios, quadros/grupos, resultados ao vivo, ranking e **pagamentos locais** (Multicaixa Express).

Inspirado no [PadelTeams](https://padelteams.pt), localizado para o mercado angolano.

## Documentação
- [PRD — produto e âmbito](docs/PRD.md)
- [Motor de torneios — esquemas, geração de jogos e dados](docs/tournament-engine.md)

## Estado
Greenfield. Stack alvo: **Next.js + Prisma + PostgreSQL** (web mobile-first / PWA). Ainda por esqueletar.

## Decisões-chave
- Web mobile-first / PWA primeiro; apps nativas depois.
- Pagamentos: **Multicaixa Express** + referência (MVP); Unitel/Africell Money depois.
- Moeda **Kwanza (Kz)**; notificações por **WhatsApp**; UI em **Português**.
