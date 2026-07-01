import {
  Route,
  Trophy,
  Tags,
  ClipboardList,
  Shuffle,
  CalendarDays,
  ListChecks,
  Award,
  CreditCard,
  Bell,
  MessageSquare,
  Users,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-static";

const TOC = [
  { id: "fluxo", title: "Como funciona" },
  { id: "torneios", title: "Torneios" },
  { id: "categorias", title: "Categorias" },
  { id: "inscricoes", title: "Inscrições" },
  { id: "sorteio", title: "Sorteio" },
  { id: "calendario", title: "Calendário e campos" },
  { id: "resultados", title: "Resultados" },
  { id: "ranking", title: "Ranking APPL" },
  { id: "pagamentos", title: "Pagamentos" },
  { id: "notificacoes", title: "Notificações" },
  { id: "mensagens", title: "Mensagens" },
  { id: "pessoas", title: "Jogadores e duplas" },
  { id: "membros", title: "Membros e permissões" },
];

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="pz-shadow-card scroll-mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple">
          <Icon className="size-[18px]" />
        </span>
        <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

const ul = "list-disc space-y-1.5 pl-5 marker:text-brand-purple";

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Ajuda" subtitle="Como funciona a plataforma, de uma ponta à outra." />

      {/* Índice */}
      <nav className="pz-shadow-card rounded-2xl border border-line bg-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Nesta página</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft hover:text-brand-purple">
              {t.title}
            </a>
          ))}
        </div>
      </nav>

      <Section id="fluxo" icon={Route} title="Como funciona">
        <p>
          O PadelZone leva um torneio do princípio ao fim: crias a prova, abres inscrições, fazes o sorteio, montas o
          calendário de jogos e vais lançando os resultados. Se a prova contar para o ranking, os pontos entram no fim,
          sozinhos, a partir dos resultados.
        </p>
        <p>
          O caminho normal é sempre o mesmo: crias o torneio e as suas categorias, abres as inscrições para os jogadores
          entrarem (sozinhos ou com parceiro), fechas as inscrições, sorteias cada categoria, agendas os jogos nos campos e
          registas os resultados. Cada item do menu à esquerda trata de uma destas etapas.
        </p>
      </Section>

      <Section id="torneios" icon={Trophy} title="Torneios">
        <p>
          Um torneio cria-se num assistente, passo a passo: primeiro o formato e as regras, depois as categorias e as datas
          (do torneio e do período de inscrições), e por fim a foto e se conta para o ranking. Depois de criado, tudo se
          ajusta dentro do próprio torneio, no separador Definições.
        </p>
        <p>Cada torneio tem um estado, e é esse estado que decide também quem o vê:</p>
        <ul className={ul}>
          <li><b>Oculto (rascunho):</b> só tu o vês. Serve para preparar tudo com calma antes de abrir ao público.</li>
          <li><b>Em inscrição:</b> está aberto e os jogadores podem inscrever-se.</li>
          <li><b>Em curso:</b> a prova arrancou. Passa a este estado sozinho quando lanças o primeiro sorteio.</li>
          <li><b>Terminado:</b> a prova acabou. É aqui que atribuis os pontos de ranking.</li>
          <li><b>Cancelado.</b></li>
        </ul>
        <p>
          Não dá para sortear um torneio que ainda esteja oculto ou em inscrições sem um aviso: ao lançares o sorteio, o
          sistema pergunta e, se confirmares, passa o torneio a "Em curso" e torna-o visível.
        </p>
      </Section>

      <Section id="categorias" icon={Tags} title="Categorias">
        <p>
          As categorias usam os códigos habituais: M1 a M5 nos masculinos, F1 a F5 nos femininos e Mx1 a Mx5 nos mistos, do
          nível mais forte (1) ao mais acessível. Cada categoria tem o seu formato e joga-se de forma independente das
          outras.
        </p>
        <p>
          Um jogador só pode entrar numa categoria de género por torneio, ou seja, ou num masculino ou num feminino, mas pode
          juntar-se também a um misto. Para trocar de categoria, cancela a inscrição atual e inscreve-se na nova.
        </p>
      </Section>

      <Section id="inscricoes" icon={ClipboardList} title="Inscrições">
        <p>
          Os jogadores inscrevem-se na página pública do torneio, dentro do período que definires (data de abertura e de
          fecho). Uma inscrição é uma dupla: o jogador escolhe o parceiro, ou convida alguém que ainda não tem conta. Nesse
          caso a pessoa recebe um convite para se registar, e enquanto não o fizer a dupla não avança no sorteio.
        </p>
        <p>
          Se a categoria tiver preço, a inscrição fica a aguardar pagamento e só passa a confirmada quando o pagamento entra.
        </p>
        <p>
          Na inscrição, o jogador pode indicar os períodos em que não está disponível (manhã, tarde ou noite). O agendamento
          automático dos jogos respeita essa indicação.
        </p>
      </Section>

      <Section id="sorteio" icon={Shuffle} title="Sorteio">
        <p>O sorteio distribui as duplas pelo quadro ou pelos grupos da categoria. O formato manda:</p>
        <ul className={ul}>
          <li><b>Eliminatórias:</b> quadro direto, quem perde sai.</li>
          <li><b>Grupos + Eliminatórias:</b> primeiro uma fase de grupos e, no fim, os melhores de cada grupo passam a um quadro final.</li>
          <li><b>Liga:</b> todos jogam contra todos.</li>
        </ul>
        <p>
          Por defeito o sorteio é aleatório. Se a categoria usar cabeças de série, as duplas mais fortes (as que marcaste nas
          inscrições) são separadas no quadro, para só se poderem cruzar nas fases finais.
        </p>
        <p>
          Nos formatos com grupos, o sorteio começa só pela fase de grupos. O quadro final é gerado depois, já com os
          apurados reais. Aí escolhes quantas duplas passam, e o apuramento é feito por ordem: primeiro todos os primeiros
          classificados dos grupos, depois os segundos e, se ainda faltarem duplas para encher o quadro, os melhores
          terceiros, quartos, e por aí adiante, comparados entre todos os grupos por pontos, diferença de sets e diferença de
          jogos. Ao montar esse quadro, as duplas do mesmo grupo ficam afastadas, para não haver revanche logo na primeira
          ronda.
        </p>
        <p>
          Se quiseres fazer o sorteio à frente do público, há um modo ao vivo que revela as duplas categoria a categoria, com
          o organizador a carregar no botão para todos verem que é transparente. As ações que apagam um sorteio pedem sempre
          confirmação, e existe um "Recomeçar" caso precises de repetir tudo.
        </p>
        <p>Atenção a um ponto importante: lançar o sorteio inicia o torneio. Se estava oculto ou em inscrições, passa a "Em curso" e fica visível.</p>
      </Section>

      <Section id="calendario" icon={CalendarDays} title="Calendário e campos">
        <p>
          Depois do sorteio, os jogos entram no calendário. Podes agendá-los à mão, escolhendo campo e hora, ou deixar o
          agendamento automático distribuir tudo pelos campos disponíveis.
        </p>
        <p>O automático tem três coisas em conta:</p>
        <ul className={ul}>
          <li>os campos que o clube registou;</li>
          <li>os períodos em que cada dupla disse não estar disponível;</li>
          <li>os limites de horário da categoria (por exemplo, uma categoria só a partir de certa hora).</li>
        </ul>
        <p>Também dá prioridade às fases mais avançadas, para as finais ficarem nos melhores horários.</p>
        <p>
          O calendário tem uma vista normal e uma vista reduzida, para caber mais no ecrã, e um modo TV para pôr num ecrã
          grande no clube: mostra os jogos por campo e por hora, destaca os que estão a decorrer e, quando há muitos campos,
          vai rodando por eles sozinho.
        </p>
      </Section>

      <Section id="resultados" icon={ListChecks} title="Resultados">
        <p>
          Os resultados introduzem-se set a set. O set decisivo pode ser um super tie-break (por exemplo 10-8), e o sistema
          conta-o de forma correta para a classificação. Cada valor vai de 0 a 30, para travar enganos.
        </p>
        <p>
          Numa eliminatória, assim que lanças um resultado o vencedor avança sozinho para o jogo seguinte. Numa fase de
          grupos, a classificação é recalculada na hora, por vitórias, diferença de sets e diferença de jogos.
        </p>
      </Section>

      <Section id="ranking" icon={Award} title="Ranking APPL">
        <p>
          Ao criar o torneio dizes se conta para o ranking oficial e que tipo de prova é: Open de classe 2.000, 5.000 ou
          10.000, Campeonato, Masters ou Liga de Clubes. As provas oficiais contam para o ranking; as sociais ou amigáveis
          não.
        </p>
        <p>
          No fim, em Definições, marcas o torneio como terminado. Os pontos são então atribuídos aos jogadores conforme os
          resultados, sem teres de fazer contas.
        </p>
      </Section>

      <Section id="pagamentos" icon={CreditCard} title="Pagamentos">
        <p>
          Se o clube ativar pagamentos, cada inscrição paga gera uma referência para o jogador liquidar, por Multicaixa ou
          Express, conforme o que estiver ligado. Quando o pagamento entra, a inscrição passa a confirmada e os jogadores são
          avisados.
        </p>
        <p>No separador Pagamentos vês todos os movimentos e o estado de cada um.</p>
      </Section>

      <Section id="notificacoes" icon={Bell} title="Notificações">
        <p>
          O clube avisa os jogadores por email e, se quiseres, por SMS. O email sai pela conta da plataforma; o SMS pela conta
          WeSender do clube, cuja chave se mete em Definições, no separador Notificações.
        </p>
        <p>
          Aí escolhes, evento a evento (inscrição confirmada, pagamento recebido, resultado registado, jogo agendado), se
          queres avisar e por que canal. Por defeito só o email está ligado, porque o SMS tem custo. O WhatsApp fica
          disponível em breve.
        </p>
      </Section>

      <Section id="mensagens" icon={MessageSquare} title="Mensagens">
        <p>
          Podes falar com os jogadores de um torneio a partir do separador Mensagens: enviar a mesma mensagem a toda a gente
          de uma vez, ou uma mensagem só para uma pessoa.
        </p>
      </Section>

      <Section id="pessoas" icon={Users} title="Jogadores e duplas">
        <p>
          Jogadores reúne toda a gente que passou pelos torneios do clube. Podes procurar, corrigir contactos como email e
          telefone, e exportar a lista.
        </p>
        <p>Duplas mostra as parcerias formadas em cada torneio.</p>
      </Section>

      <Section id="membros" icon={Settings} title="Membros e permissões">
        <p>
          Podes dar acesso à gestão do clube a mais pessoas, com funções diferentes: Dono, Diretor, Juiz-Árbitro e Staff. O
          convite é por email; se a pessoa ainda não tiver conta, recebe um link para se registar e juntar-se à equipa.
        </p>
      </Section>

      <p className="px-1 pb-2 text-center text-xs text-soft">
        Cada ecrã tem também o seu botão de ajuda, com notas específicas dessa área.
      </p>
    </div>
  );
}
