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
const h3 = "pt-1 text-sm font-bold text-zinc-900";

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
        <p>
          É no separador Categorias do torneio que defines, para cada categoria, o formato, o número de grupos, quantas duplas
          apuram e se usa cabeças de série. O que cada uma dessas opções faz está explicado em Sorteio.
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
        <p>
          O sorteio distribui as duplas pelo quadro ou pelos grupos da categoria. Cada categoria sorteia com o seu formato, que
          defines no separador Categorias do torneio.
        </p>

        <h3 className={h3}>Escolher o formato</h3>
        <ul className={ul}>
          <li><b>Eliminatórias:</b> quadro direto, quem perde sai. Rápido, bom para muitas duplas ou pouco tempo.</li>
          <li><b>Grupos + Eliminatórias:</b> primeiro uma fase de grupos (todos contra todos dentro do grupo) e, no fim, os melhores passam a um quadro final. Dá mais jogos a cada dupla. É o formato mais usado.</li>
          <li><b>Liga:</b> todos contra todos, sem eliminatória. Para poucas duplas ou provas por pontos.</li>
        </ul>

        <h3 className={h3}>Cabeças de série</h3>
        <p>
          Servem para as melhores duplas não se cruzarem logo no início. Sem elas, o sorteio é todo à sorte e as duas
          favoritas podem calhar no mesmo jogo à primeira ronda. Ligam-se em dois passos:
        </p>
        <ul className={ul}>
          <li>Na categoria (separador Categorias), ativa <b>Tem cabeças de série</b>.</li>
          <li>Nas <b>Inscrições</b>, dá um número às duplas mais fortes: 1 à melhor, 2 à segunda, e assim adiante. As duplas sem número entram na mesma, ficam é distribuídas à sorte pelos lugares que sobram.</li>
        </ul>
        <p>
          Com esses números, o sistema afasta as favoritas. No quadro, a cabeça de série 1 e a 2 vão para metades opostas (só
          se cruzam na final), a 3 e a 4 para quartos opostos, e por aí adiante. Nos grupos, espalha uma cabeça de série por
          grupo (a 1 no Grupo A, a 2 no B, e por diante), para nenhum grupo ficar com duas favoritas.
        </p>
        <p>
          Não precisas de numerar todas as duplas. O mínimo útil é dar número às 2 melhores; num quadro grande, faz sentido
          numerar 4 ou 8. Se não usares cabeças de série, o sorteio é 100% aleatório.
        </p>

        <h3 className={h3}>Número de grupos e quantas passam</h3>
        <p>Nos formatos com grupos, defines na categoria dois valores:</p>
        <ul className={ul}>
          <li><b>Nº de grupos:</b> em quantos grupos dividir as duplas.</li>
          <li><b>Apurados por grupo:</b> quantas passam de cada grupo (no mínimo 1, o vencedor). Serve de sugestão para o tamanho do quadro final, que ainda podes ajustar na hora.</li>
        </ul>
        <p>A regra prática é fazer grupos de 3 ou 4 duplas:</p>
        <ul className={ul}>
          <li>8 duplas: 2 grupos de 4.</li>
          <li>12 duplas: 3 grupos de 4, ou 4 grupos de 3.</li>
          <li>16 duplas: 4 grupos de 4.</li>
        </ul>
        <p>
          Grupos de 3 dão menos jogos (cada dupla joga 2); grupos de 4 dão mais jogos (cada uma joga 3) e uma classificação
          mais justa. O sistema aceita no máximo metade das duplas em grupos, porque cada grupo precisa de pelo menos 2.
        </p>

        <h3 className={h3}>Como se faz o apuramento</h3>
        <p>
          A fase de grupos sorteia-se sozinha; o quadro final só se monta depois de os grupos estarem jogados, com os apurados
          reais. Aí escolhes o tamanho do quadro. O ideal é um número redondo: 4, 8 ou 16.
        </p>
        <p>
          O apuramento é cruzado entre todos os grupos, por esta ordem: primeiro todos os primeiros classificados, depois todos
          os segundos e, se ainda faltarem duplas para encher o quadro, os melhores terceiros, quartos e por aí, comparados
          entre grupos por vitórias, diferença de jogos e diferença de sets.
        </p>
        <p>
          Por exemplo, com 4 grupos e um quadro de 8 passam os 4 vencedores e os 4 segundos. Se fizeres um quadro de 6, passam
          os 4 primeiros e os 2 melhores segundos.
        </p>
        <p>
          Ao montar o quadro, as duplas do mesmo grupo ficam afastadas: os vencedores vão para as cabeças do quadro e nenhum
          jogo da primeira ronda é entre duas duplas que já se defrontaram nos grupos.
        </p>
        <p>
          Se na última vaga houver um empate total (duas duplas iguais por todos os critérios, em que uma apuraria e a outra
          não), o sistema avisa e deixa-te resolver à mão, trocando a dupla apurada pela empatada antes de o quadro começar.
        </p>

        <h3 className={h3}>Sorteio ao vivo</h3>
        <p>
          Se quiseres fazer o sorteio à frente do público, há um modo ao vivo que revela as duplas categoria a categoria, com o
          organizador a carregar no botão. As ações que apagam um sorteio pedem sempre confirmação, e existe um "Recomeçar"
          caso precises de repetir tudo.
        </p>
        <p>Um ponto importante: lançar o sorteio inicia o torneio. Se estava oculto ou em inscrições, passa a "Em curso" e fica visível.</p>
      </Section>

      <Section id="calendario" icon={CalendarDays} title="Calendário e campos">
        <p>
          Depois do sorteio, os jogos entram no calendário. Podes agendá-los à mão, escolhendo campo e hora em cada jogo, ou
          carregar no agendamento automático para o sistema distribuir tudo de uma vez.
        </p>

        <h3 className={h3}>Antes de agendar</h3>
        <p>
          O automático precisa de duas coisas: os campos do clube registados (no separador Campos) e o sorteio já feito. Sem
          campos ou sem jogos, não há nada para distribuir.
        </p>

        <h3 className={h3}>Definições do calendário</h3>
        <p>No calendário, antes de correr o automático, defines:</p>
        <ul className={ul}>
          <li><b>Duração dos jogos:</b> quanto tempo dura cada jogo. É também o tamanho de cada intervalo (por defeito 75 minutos).</li>
          <li><b>Horário dos dias de semana</b> e <b>horário do fim de semana:</b> a que horas se pode começar e acabar de jogar. Costumam ser diferentes, porque à semana só se joga ao fim do dia e ao fim de semana o dia todo.</li>
        </ul>

        <h3 className={h3}>Como o automático decide</h3>
        <p>
          O sistema cria intervalos do tamanho da duração dos jogos, dia após dia a partir da data de início e dentro do
          horário de cada dia. Depois vai colocando os jogos, respeitando sempre três regras:
        </p>
        <ul className={ul}>
          <li>nunca dois jogos no mesmo campo à mesma hora;</li>
          <li>nunca a mesma dupla em dois jogos ao mesmo tempo;</li>
          <li>no máximo um jogo por dupla por dia, para espalhar os jogos pelos dias e ninguém jogar tudo de seguida.</li>
        </ul>
        <p>Os jogos que já tinham hora marcada ficam onde estão. O automático só mexe nos que ainda não têm hora.</p>

        <h3 className={h3}>Prioridades, disponibilidade e limites</h3>
        <p>Além disso, tem em conta:</p>
        <ul className={ul}>
          <li><b>Limites de horário:</b> uma categoria pode ter uma hora máxima para começar os jogos (por exemplo, começar só até às 20h). Existe ainda um limite por defeito para as categorias femininas, que se define no calendário e vale para as femininas que não tenham limite próprio.</li>
          <li><b>Prioridade a quem tem limite:</b> as categorias com hora limite são agendadas primeiro, e as de limite mais cedo à frente, para apanharem os horários mais cedo. As sem limite ficam para o fim.</li>
          <li><b>Disponibilidade das duplas:</b> na inscrição, cada dupla pode indicar em que períodos não joga (manhã até às 12h, tarde das 12h às 18h, noite a partir das 18h). O automático evita esses períodos.</li>
        </ul>

        <h3 className={h3}>Quando não dá para respeitar tudo</h3>
        <p>
          Se um jogo não couber dentro das restrições (por exemplo, poucos campos para muitas duplas com a mesma
          indisponibilidade), o sistema agenda-o à mesma, mas marca-o como "fora das restrições" e diz-te no fim quantos
          ficaram assim, para os ajustares à mão se quiseres.
        </p>

        <h3 className={h3}>Ver o calendário</h3>
        <p>
          A vista tem um modo normal e um reduzido, que encurta os nomes para caber mais no ecrã. Há ainda o modo TV, para pôr
          num ecrã grande no clube: mostra os jogos por campo e por hora, destaca os que estão a decorrer e, quando há muitos
          campos, vai rodando por eles sozinho.
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
