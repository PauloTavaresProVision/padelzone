# PadelZone — Motor de Torneios (esquemas, geração de jogos e dados)

Este é o **coração do produto**. A ideia que unifica tudo:

> Uma **Categoria** encadeia uma ou mais **Fases (Stages)**. Cada fase é só um *tipo de esquema + configuração + um gerador de jogos*.

Há **duas famílias** de geradores:
- **Fixos (fixture-based):** todos os jogos saem de uma vez (grupos, liga, eliminatórias, americano).
- **Dinâmicos (ronda a ronda):** a próxima ronda é calculada a partir da classificação atual (mexicano, ladder, rei do court).

Acrescentar um esquema novo = **escrever um gerador** sem tocar no resto.

---

## 1. Os esquemas — regra a regra

| Esquema | Unidade | Como se decide o vencedor | Família | Quando usar |
|---|---|---|---|---|
| **Eliminatórias / Quadros** | Par fixo | Perde-e-sai; último de pé ganha (3.º lugar e/ou dupla eliminação opcionais) | Fixo | Torneio clássico, fase final |
| **Fase de grupos** | Par fixo | Todos-contra-todos no grupo → classificação → apuram os X primeiros | Fixo | Garantir vários jogos antes de eliminar |
| **Grupos + Playoffs** | Par fixo | Grupos apuram para um quadro eliminatório | Fixo | Formato "padrão" de fim de semana |
| **Liga / Campeonato** | Par fixo | Round-robin a 1 ou 2 voltas; tabela; subidas/descidas (caixas) | Fixo | Época longa, ranking de clube |
| **Ladder / Escada** | Par fixo | Desafias quem está acima; ganhas → trocas de posição | Dinâmico | Atividade contínua sem calendário |
| **Nonstop · Americano** | **Jogador** | Trocas de par a cada ronda; soma de **pontos individuais** | Fixo | Eventos sociais, misturar pessoas |
| **Nonstop · Mexicano** | **Jogador** | Como Americano mas pares definidos pela tabela ao vivo | Dinâmico | Grupo com níveis muito diferentes |
| **Round-Robin (social)** | Par/jogador | Todos contra todos um nº garantido de vezes | Fixo | Liguinha rápida e equilibrada |
| **Rei do Court** | Jogador | Ganhas sobes de campo, perdes desces | Dinâmico | Treino dinâmico, animação |

A distinção crítica é a **Unidade**: *par fixo* (uma `Entry` = uma equipa de 2) vs *jogador individual* (uma `Entry` = 1 pessoa, e os pares formam-se por jogo). Condiciona todo o modelo de dados.

---

## 2. Geração de jogos (os algoritmos)

### Eliminatórias (quadros)
Tamanho do quadro = próxima potência de 2 ≥ N; `byes = tamanho − N`, atribuídos aos cabeças de série. A ordem das posições gera-se por **intercalação recursiva** para que os favoritos só se cruzem no fim:

```ts
function seedOrder(size: number): number[] {       // size = potência de 2
  let s = [1, 2];
  while (s.length < size) {
    const sum = 2 * s.length + 1;
    s = s.flatMap(x => [x, sum - x]);
  }
  return s;            // size 8 → [1,8,4,5,2,7,3,6]; emparelhar (0,1)(2,3)(4,5)(6,7)
}
```

O quadro é uma **árvore binária**: cada jogo guarda `nextMatchId` (para onde vai o vencedor) e, em dupla eliminação / 3.º lugar, `loserNextMatchId`. Os jogos das rondas seguintes nascem "vazios" com etiqueta (`"Vencedor QF1"`) e preenchem-se quando o resultado entra (`onResult`).

### Grupos & Liga (round-robin)
Método do círculo: fixa-se um e rodam-se os restantes; gera rondas equilibradas (cada equipa joga 1× por ronda), o que também serve para **calendarizar campos**:

```ts
function roundRobin<T>(teams: T[]): T[][][] {
  const t = [...teams]; if (t.length % 2) t.push(BYE);
  const n = t.length, rounds: T[][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: T[][] = [];
    for (let i = 0; i < n / 2; i++)
      if (t[i] !== BYE && t[n - 1 - i] !== BYE) round.push([t[i], t[n - 1 - i]]);
    rounds.push(round);
    t.splice(1, 0, t.pop()!);            // roda mantendo t[0] fixo
  }
  return rounds;                          // 1 volta; "liga" = espelhar para 2 voltas
}
```

- **Sorteio em serpentina** distribui os cabeças de série pelos grupos (1→A, 2→B, …, depois inverte) e o resto é aleatório, opcionalmente com restrição "mesmo clube em grupos diferentes".
- **Melhor 2.º**: quando os apurados não dividem certo pelos grupos, ordenam-se os 2.ºs classificados entre grupos (pontos → dif. de sets → dif. de jogos) e entram os melhores. Com grupos de tamanhos diferentes, comparar ignorando os jogos contra o último de cada grupo (justiça).
- **Grupos → Playoffs**: o apuramento **cruza** para proteger os 1.ºs (A1×B2, B1×A2, …).

### Mexicano (dinâmico)
Ronda 1 por nível/aleatório; depois, a cada ronda, ordena-se pela pontuação e formam-se jogos por blocos de 4:

```ts
function mexicanoRound(rank: Player[]): MatchDraft[] {   // rank ordenado desc por pontos
  const m: MatchDraft[] = [];
  for (let i = 0; i < rank.length; i += 4) {
    const [a, b, c, d] = rank.slice(i, i + 4);           // 4 melhores juntos, etc.
    m.push(match(side(a, d), side(b, c)));               // 1+4 vs 2+3 (configurável)
  }
  return m;
}
```

### Americano
Pontos **individuais** acumulados; pares rodam para cada jogador jogar com toda a gente. Para N comum (4/8/12/16) usam-se **tabelas de rotação** pré-calculadas; jogos a **pontos-alvo** (ex.: 24/32) ou a tempo. Variante mista força 1 homem + 1 mulher por par. Sit-outs rodam quando N não é múltiplo de 4.

### Ladder & Rei do Court
Não pré-geram calendário:
- **Ladder** é movido por **desafios** — valida "até K posições acima", cooldown, janela de aceitação; ao resultado, troca posições.
- **Rei do Court** aplica a regra sobe/desce de campo após cada jogo curto.

---

## 3. Modelo de dados (esboço Prisma — Postgres)

Postgres dá `enum` e `jsonb` nativos. O truque é o **`Match` polimórfico** servir todos os esquemas, e a **`Standing`** servir tabela-de-grupo / liga / leaderboard de americano / ladder.

```prisma
enum StageType { GROUPS KNOCKOUT LEAGUE LADDER AMERICANO MEXICANO ROUND_ROBIN KING_COURT }
enum EntryUnit { PAIR INDIVIDUAL }
enum Side      { A B }
enum MatchStatus { PENDING SCHEDULED LIVE DONE WALKOVER }

model Stage {                 // uma "fase" do esquema
  id         Int       @id @default(autoincrement())
  categoryId Int
  order      Int             // encadeamento: grupos(0) → playoffs(1)
  type       StageType
  config     Json            // pontos/sets/alvo, desempates, qualificados, maxRungs…
  groups     Group[]
  matches    Match[]
  standings  Standing[]
}

model Entry {                 // inscrição na categoria
  id       Int   @id @default(autoincrement())
  teamId   Int?              // unit = PAIR
  playerId Int?              // unit = INDIVIDUAL
  seed     Int?
}

model Match {                 // a UNIDADE universal (Jogo)
  id            Int      @id @default(autoincrement())
  stageId       Int
  round         Int
  groupId       Int?
  court         String?
  scheduledAt   DateTime?
  status        MatchStatus
  sides         MatchSide[]   // 2 lados
  result        MatchResult?
  nextMatchId       Int?      // vencedor avança para aqui (quadro)
  loserNextMatchId  Int?      // dupla eliminação / 3.º lugar
}

model MatchSide {
  id      Int   @id @default(autoincrement())
  matchId Int
  side    Side
  teamId  Int?                // par fixo
  players MatchSidePlayer[]   // combinação ad-hoc (americano/mexicano)
  label   String?             // "Vencedor QF1" enquanto não há equipa
}

model MatchResult {
  id          Int  @id @default(autoincrement())
  matchId     Int  @unique
  winnerSide  Side?
  score       Json            // sets/jogos/pontos
  submittedBy Int?
  confirmedBy Int?
}

model Standing {              // grupo / liga / leaderboard / ladder
  id           Int @id @default(autoincrement())
  stageId      Int
  entryId      Int
  groupId      Int?
  rank         Int
  played       Int
  won          Int
  lost         Int
  setsFor      Int
  setsAgainst  Int
  gamesFor     Int
  gamesAgainst Int
  points       Int            // pontos de classificação OU pontos individuais (americano)
}

model Challenge {             // só LADDER
  id           Int @id @default(autoincrement())
  stageId      Int
  challengerId Int
  defenderId   Int
  status       String         // PENDING ACCEPTED PLAYED EXPIRED
  matchId      Int?
  expiresAt    DateTime?
}
```

*(Entidades de topo a definir no schema completo: `Club`, `Competition`, `Category`, `Team`, `Player`, `Group`, `GroupEntry`, `BracketSlot`, `Payment`.)*

---

## 4. O motor (uma interface, várias estratégias)

```ts
type Engine = {
  generateFixtures?(stage, entries): MatchDraft[];               // esquemas fixos
  generateNextRound?(stage, standings, lastRound): MatchDraft[]; // esquemas dinâmicos
  computeStandings(stage, matches): Standing[];                  // recalcula classificação
  onResult?(match, result): Mutation[];                          // propaga vencedor/perdedor
};

const engines: Record<StageType, Engine> = {
  KNOCKOUT:    { generateFixtures, onResult, computeStandings },
  GROUPS:      { generateFixtures, computeStandings },
  LEAGUE:      { generateFixtures, computeStandings },
  ROUND_ROBIN: { generateFixtures, computeStandings },
  AMERICANO:   { generateFixtures, computeStandings },
  MEXICANO:    { generateNextRound, computeStandings },   // ronda a ronda
  KING_COURT:  { generateNextRound, computeStandings },
  LADDER:      { generateNextRound, computeStandings },   // disparado por desafios
};
```

---

## 5. Botões de configuração (expostos ao organizador)

- **Pontuação do jogo**: por sets (melhor de 1/3) **ou** pontos-alvo (24/32) **ou** por tempo.
- **Pontos de classificação**: vitória (2 ou 3) / empate / derrota.
- **Ordem de desempate** (arrastável): confronto direto → dif. de sets → dif. de jogos → sorteio.
- **Apuramento**: qualificados por grupo + usar "Melhor 2.º".
- **Cabeças de série**: nº e fonte (ranking de clube/nacional ou manual).
- **Extras**: byes, 3.º/4.º lugar, dupla eliminação, restrição de par misto.
- **Campos**: nº de campos → calendarização (uma ronda = `⌊jogadores/4⌋` jogos simultâneos).

---

## 6. Pipeline de referência: Grupos + Playoffs
1. **Inscrições** → N equipas (`Entry`).
2. **Sorteio em serpentina** → distribui cabeças de série pelos grupos.
3. **Round-robin por grupo** (método do círculo) → gera todos os jogos de grupo.
4. **Classificações** → pontos + desempates (`Standing` por grupo).
5. **Apuramento** → cruzamento A1×B2, B1×A2 (+ Melhor 2.º).
6. **Quadro eliminatório** → seeding + byes (árvore binária).
7. **Final / 3.º lugar** → vencedor; ranking da competição atualizado.

Passos 1–6 são **fixos** (gerados de uma vez). Em Mexicano/Ladder/Rei do Court, o equivalente ao passo "gerar jogos" corre **a cada ronda** a partir da classificação.
