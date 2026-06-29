# PadelZone — Plano por Fases

Plataforma de gestão de torneios de padel para Angola, inspirada no PadelTeams.
Este é o **plano de construção**, por fases. Ver também [`PRD.md`](PRD.md) e [`tournament-engine.md`](tournament-engine.md).

## Princípios

- **Uma fase de cada vez** — começar e acabar antes de avançar. Não saltar.
- **Nada de dados falsos** — tudo o que aparece na app vem da base de dados. Onde ainda não há dados, mostra-se um **estado vazio honesto** (não números inventados).
- **Design-driven** — cada ecrã construído com o aspeto dos designs aprovados, responsivo (desktop + telemóvel).
- **Angola-first** — Português (PT), Kwanza (Kz), pagamentos locais (Multicaixa), WhatsApp.

## Dependências externas (só o cliente as obtém)

- **Multicaixa Express / referência** — credenciais de comerciante (EMIS / PSP local). Necessário na Fase 5.
- **Login Google** — `GOOGLE_CLIENT_ID/SECRET` (Google Cloud). Já programado; falta as credenciais.
- **Armazenamento de ficheiros** — para fotos de perfil/competição (Fase 12). Pode ser disco local ou um bucket.
- **WhatsApp / SMS** — conta de provedor de mensagens (Fase 10).

---

## Fase 0 — Fundação ✅ (FEITO)

- Stack: Next.js 16 + React 19 + Tailwind v4 + Prisma 6 + PostgreSQL (Docker).
- Modelo de dados completo (Club, User, Competition, Category, Stage, Entry, Team, Player, Match, Standing, Payment…).
- **Motor de torneios** (eliminatórias, grupos/round-robin, mexicano, americano, classificações) — funções puras **com testes**.
- Marca/logótipo + design system (navy/roxo/coral).
- **Autenticação** completa: login, criar conta, recuperar/repor palavra-passe, Google (programado), sessões.
- **App shell** (sidebar, topo, navegação móvel) + **página do jogador** (dashboard) + **perfil editável** (real, persiste).
- **Inscrições** — versão base (criar inscrição + lista).

---

## Fase 1 — Verdade nos dados (limpar o falso)

**Objetivo:** remover toda a estatística de exemplo; mostrar apenas dados reais.
**Entregáveis:** dashboard do jogador a calcular tudo da BD; onde não há dados, **estados vazios** ("Ainda não jogaste torneios", "Sem jogos agendados", "Sem ranking ainda"). Camada de consultas reais (view-model).
**Fica real:** o dashboard deixa de ter qualquer número inventado.

## Fase 2 — Clubes & organizadores

**Objetivo:** quem organiza (o cliente que paga) consegue ter o seu clube.
**Entregáveis:** criar/gerir clube (nome, marca, cidade), **campos**, **papéis** (Dono/Diretor/Juiz-Árbitro/Staff) com permissões, onboarding "Seja Park Partner". Multi-clube (multi-tenant).
**Fica real:** existe um clube com membros e campos.

## Fase 3 — Competições & categorias

**Objetivo:** o organizador cria uma competição de A a Z.
**Entregáveis:** assistente de criação (nome, datas, regulamento, prémios, imagem), **categorias** (M/F/Misto/escalões/Kids), **regras de inscrição** (períodos, limites, dados obrigatórios incl. t-shirt, **preços escalonados**), **estados da competição** (rascunho → inscrições → em curso → terminada).
**Fica real:** competições reais, públicas ou em rascunho.

## Fase 4 — Inscrições (completar)

**Objetivo:** fechar o módulo de inscrições nos dois lados.
**Entregáveis:** lado do clube (confirmar, **lista de espera** + limites, **cabeças de série**, remover, **exportar** lista de camisolas/contactos), **convite de parceiro** (WhatsApp), inscrição **individual "à procura de parceiro"**.
**Fica real:** as inscrições de um jogador aparecem no seu dashboard (acaba o "Torneios inscritos" falso).

## Fase 5 — Pagamentos (Angola)

**Objetivo:** o clube recebe o dinheiro das inscrições.
**Entregáveis:** **Multicaixa Express** + **referência Multicaixa** + transferência/comprovativo; preços escalonados (1/2/3 categorias); estados e **reconciliação**. (Depende das credenciais de comerciante.)
**Fica real:** inscrição "paga/pendente" verdadeira; painel de pagamentos do clube.

## Fase 6 — Sorteio, quadros & grupos

**Objetivo:** ligar o **motor** (já testado) à BD e à interface.
**Entregáveis:** gerar grupos/quadros a partir dos inscritos confirmados (serpentina, cabeças de série, byes), **calendário e campos**, vistas de **bracket** e **tabela de grupos**.
**Fica real:** jogos reais agendados; aparecem no dashboard ("Próximos jogos" deixa de ser exemplo).

## Fase 7 — Resultados & classificações

**Objetivo:** jogar de verdade.
**Entregáveis:** inserir/confirmar **resultados**, **classificações** automáticas (pontos + desempates), avanço do quadro, página **ao vivo** da competição.
**Fica real:** "Resultados recentes", vitórias, jogos ganhos, taxa de vitória — tudo verdadeiro.

## Fase 8 — Ranking

**Objetivo:** ranking e níveis reais.
**Entregáveis:** atribuição de pontos por competição, ranking **por clube** e **nacional**, **níveis** e histórico de pontos.
**Fica real:** o cabeçalho do jogador (ranking #, pontos, nível, gráfico) passa a 100% real — **fim de qualquer dado de exemplo**.

## Fase 9 — Páginas públicas & descoberta

**Objetivo:** a cara pública do produto.
**Entregáveis:** **homepage pública** (design 2), páginas públicas de competição (quadros/grupos/resultados/fotos ao vivo), **diretório** de clubes/torneios, pesquisa.

## Fase 10 — Notificações (Angola)

**Objetivo:** manter jogadores e clubes informados.
**Entregáveis:** **WhatsApp** + email (confirmação de inscrição, pagamento, lembretes de jogo, resultados). SMS/push depois.

## Fase 11 — Formatos sociais (Nonstop)

**Objetivo:** jogo casual, não só competição.
**Entregáveis:** **Americano**, **Mexicano**, **Rei do Court** e **Easy Mix** (sessões com amigos) — usando os motores dinâmicos.

## Fase 12 — Polish & extras

**Objetivo:** acabamentos e canais adicionais.
**Entregáveis:** **foto de perfil** (upload/armazenamento), **TV Monitor** (ecrã do clube), **widgets** incorporáveis, **relatórios/export**, ligar credenciais Google, e (depois do PWA) **apps nativas**.

---

## Caminho até "nada falso no dashboard do jogador"

O dashboard só fica 100% real no fim da **Fase 8**. Até lá, a **Fase 1** garante que não há números inventados (mostra estados vazios), e cada fase vai preenchendo: inscrições (F4) → jogos (F6) → resultados/vitórias (F7) → ranking/nível (F8).
