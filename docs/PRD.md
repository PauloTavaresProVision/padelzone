# PadelZone — PRD (Produto e Âmbito)

> Plataforma de gestão de torneios de padel para Angola, inspirada no PadelTeams (padelteams.pt).
> Repo novo (greenfield). UI em Português (PT). Moeda: Kwanza (Kz).

## 1. Visão
Dar a clubes e organizadores angolanos as ferramentas para gerir competições de padel (e ténis) de ponta a ponta — da inscrição ao resultado — com **pagamentos locais** e acompanhamento ao vivo. Para o jogador, um sítio único para **descobrir, inscrever-se e acompanhar** torneios.

## 2. Atores
- **Clube / Organizador** — cria e gere competições.
- **Jogador** — inscreve-se, acompanha jogos, vê rankings.
- **Público / Adeptos** — segue resultados e quadros sem conta.
- **Admin da Plataforma** — multi-clube, suporte.

Papéis **dentro de uma competição**: Diretor, Juiz-Árbitro, Staff (permissões graduadas).

## 3. Mapa de funcionalidades
Legenda: **●** = incluir no MVP · **○** = fase posterior.

### Gestão de Competições (organizador)
- ● Criar competição & categorias (M/F/Misto/Kids/escalões)
- ● Inscrições: individual / equipa, com dados obrigatórios (nº camisola, contacto)
- ● Lista de espera & limites
- ● Sorteio + cabeças de série
- ● Calendário & atribuição de campos
- ● Inserção & validação de resultados
- ● Página pública ao vivo (quadros, horários, resultados)
- ○ Painel em tempo real & check-in (pagamentos, jogos atrasados)
- ○ TV Monitor & widgets incorporáveis

### Modelos de Torneio → ver [`tournament-engine.md`](tournament-engine.md)
- ● Eliminatórias/Quadros · Fase de grupos (+ Melhor 2.º) · Grupos + Playoffs · Nonstop (Americano/Mexicano)
- ○ Liga/Campeonato · Ladder/Escada · Round-Robin social · Rei do Court

### Jogador
- ● Perfil & histórico · Explorar & inscrever-se · Os meus jogos & horários · Lembretes
- ○ Submeter resultados + fotos · Easy Mix (jogos casuais)

### Ranking
- ● Por competição · Por clube · Cálculo por pontos/escalões
- ○ Ranking nacional

### Descoberta & Comunidade
- ● Páginas públicas & galerias
- ○ Diretório de clubes & torneios · Partilha social

### Pagamentos (Angola)
- ● Multicaixa Express · Referência Multicaixa · Transferência + comprovativo · Preços escalonados (1/2/3 inscrições) · Estado & reconciliação
- ○ Unitel Money / Africell Money

### Notificações (Angola)
- ● WhatsApp (lembretes/resultados) · Email
- ○ SMS · Push (app/PWA)

### Plataforma & Transversal
- ● Multi-clube (multi-tenant) · Papéis (Diretor/Juiz/Staff) · Auth + RBAC + auditoria · PWA mobile-first/offline · Definições & marca do clube
- ○ Relatórios & export

## 4. Fronteira do MVP
Critério: **um clube consegue correr um torneio real de ponta a ponta e receber o dinheiro.**
Fluxo coberto: criar competição → inscrições → sorteio → grupos/quadros → resultados → página pública ao vivo → ranking da competição, com pagamento por **Multicaixa Express / referência**.

Fica para depois: TV Monitor, widgets, push nativo, ranking nacional, Easy Mix, camada social, apps nativas.

## 5. Localização Angola (decisões)
- **Pagamentos locais** (sem cartão/Stripe). Multicaixa Express via PSP local (ex.: EMIS Online / ProxyPay) — fornecedor a confirmar.
- **Moeda** Kwanza (Kz / AOA); formatação `pt-AO`.
- **WhatsApp** como canal de notificação principal.
- **Mobile-first / PWA**, tolerante a rede fraca; inserção de resultados resiliente a offline.

## 6. Questões em aberto
- Nome final do produto (nome de trabalho: **PadelZone**).
- Relação com os projetos existentes `padescore` / `padescore-totem` — integrar scoring ao vivo / totem?
- Fornecedor de pagamentos Multicaixa (EMIS Online, ProxyPay, outro).
- Federação Angolana de Padel — integração de ranking oficial no futuro?
- Apps nativas: quando (depois do PWA).
