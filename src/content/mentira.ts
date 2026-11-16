import type { MentiraChallenge, Theme } from "./types";

/**
 * Mentira Sincera: perguntas pessoais que funcionam para os dois lados. Quem tira "verdade"
 * precisa ter uma história real; quem tira "mentira" precisa inventar uma que convença.
 * Por isso as perguntas são sobre coisas que quase todo mundo já viveu (ou poderia ter vivido).
 */

export const MENTIRA_THEMES: Theme[] = [
  { id: "micos", label: "Micos e vexames" },
  { id: "confissoes", label: "Confissões" },
  { id: "role", label: "Rolê e balada" },
  { id: "perrengue", label: "Perrengues" },
  { id: "infancia", label: "Infância raiz" },
  { id: "familia", label: "Grupo da família" },
  { id: "amor", label: "Crush e romance" },
  { id: "trampo", label: "Trampo e escola" },
  { id: "viagem", label: "Viagens" },
];

export function sortMentiraThemes(ids: string[]) {
  const rank = new Map(MENTIRA_THEMES.map((t, i) => [t.id, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

const base = { status: "published" as const, lang: "pt-BR" as const, difficulty: "medio" as const };
const mentira = (theme: string, texts: string[]): MentiraChallenge[] => texts.map((text, i) => ({ ...base, id: `mentira-${theme}-${i + 1}`, game: "mentira", theme, text }));

export const MENTIRA: MentiraChallenge[] = [
  ...mentira("micos", [
    "Conte da vez que você passou mais vergonha em público.",
    "Conte da vez que você acenou para alguém que não estava acenando para você.",
    "Conte da vez que você caiu (ou quase caiu) na frente de muita gente.",
    "Conte da vez que você mandou mensagem para a pessoa errada.",
    "Conte da vez que você riu na hora mais errada possível.",
    "Conte da vez que você chamou alguém pelo nome errado e não teve como disfarçar.",
    "Conte o pior mico que você já pagou na frente de alguém que você queria impressionar.",
    "Conte da vez que você entrou no lugar errado com toda a confiança do mundo.",
    "Conte da vez que alguém te pegou cantando ou dançando sozinho.",
    "Conte da vez que você contou uma piada e ninguém riu.",
    "Conte da vez que a sua roupa te traiu em público.",
  ]),
  ...mentira("confissoes", [
    "Conte uma coisa que você fez escondido dos seus pais e eles nunca descobriram.",
    "Conte da vez que você inventou uma desculpa muito elaborada para não ir a algum lugar.",
    "Conte uma coisa que você já fingiu gostar para agradar alguém.",
    "Conte da vez que você comeu algo que não era seu e deixou outra pessoa levar a culpa.",
    "Conte o maior exagero que você já contou como se fosse verdade.",
    "Conte um hábito estranho que você tem e quase ninguém sabe.",
    "Conte da vez que você fingiu estar doente para fugir de um compromisso.",
    "Conte da vez que você stalkeou alguém na internet e quase foi pego.",
    "Conte qual é o seu maior medo bobo.",
    "Conte da vez que você chorou por um motivo muito besta.",
    "Conte um presente que você ganhou, odiou e fingiu adorar.",
  ]),
  ...mentira("role", [
    "Conte do rolê mais inesperado que você já foi parar.",
    "Conte da vez que você voltou para casa de um jeito que não estava nos planos.",
    "Conte da vez que você entrou numa festa sem ser convidado.",
    "Conte qual foi o show ou evento mais marcante que você já foi.",
    "Conte da vez que você perdeu algo importante numa festa.",
    "Conte da vez que um rolê marcado para ser tranquilo virou a noite.",
    "Conte da vez que você conheceu alguém famoso (ou quase).",
    "Conte o lugar mais estranho onde você já dormiu depois de um rolê.",
    "Conte da vez que você foi barrado ou expulso de algum lugar.",
    "Conte da maior furada de rolê em que você já entrou.",
  ]),
  ...mentira("perrengue", [
    "Conte do maior perrengue que você já passou no transporte público.",
    "Conte da vez que você ficou trancado (do lado de dentro ou de fora) de algum lugar.",
    "Conte da vez que você se perdeu feio.",
    "Conte do pior dia de chuva da sua vida.",
    "Conte da vez que acabou a bateria do celular na pior hora possível.",
    "Conte da vez que você teve que improvisar para resolver um problema sério.",
    "Conte da vez que você chegou atrasado num compromisso muito importante.",
    "Conte o pior corte de cabelo que você já teve e como foi.",
    "Conte do pior machucado que você já teve e como ele aconteceu.",
    "Conte da vez que um bicho te deu um susto enorme.",
  ]),
  ...mentira("infancia", [
    "Conte da maior arte que você aprontou quando era criança.",
    "Conte o castigo mais marcante que você já levou.",
    "Conte da vez que você quebrou algo em casa e tentou esconder.",
    "Conte uma coisa absurda em que você acreditava quando era criança.",
    "Conte da sua primeira paixão de escola.",
    "Conte da vez que você se machucou fazendo uma coisa que te mandaram não fazer.",
    "Conte qual era o seu brinquedo ou coleção favorita e o que aconteceu com ela.",
    "Conte da vez que você se perdeu dos seus pais.",
    "Conte qual era o seu apelido de infância e por quê.",
    "Conte da maior briga que você teve com um irmão, primo ou amigo de infância.",
  ]),
  ...mentira("familia", [
    "Conte da maior confusão que já aconteceu numa festa de família.",
    "Conte da vez que um parente te fez passar vergonha.",
    "Conte uma história de família que todo mundo conta no Natal.",
    "Conte da vez que você brigou feio com alguém da família e como acabou.",
    "Conte qual é o parente mais folclórico da sua família e uma história dele.",
    "Conte da vez que alguém da família descobriu um segredo seu.",
    "Conte da pior viagem em família que você já fez.",
    "Conte da vez que você levou alguém para conhecer a família e deu errado.",
    "Conte qual foi a pior comida que você já teve que comer na casa de um parente.",
    "Conte uma mania da sua mãe ou do seu pai que você herdou.",
  ]),
  ...mentira("amor", [
    "Conte do pior encontro que você já teve.",
    "Conte da vez que você levou um fora inesquecível.",
    "Conte da maior loucura que você já fez para impressionar alguém.",
    "Conte como foi o seu primeiro beijo.",
    "Conte da vez que você deu em cima de alguém que já era comprometido sem saber.",
    "Conte da mensagem mais vergonhosa que você já mandou para um crush.",
    "Conte da vez que um ex apareceu no pior momento possível.",
    "Conte da cantada mais ruim que você já recebeu (ou deu).",
    "Conte da vez que você confundiu amizade com paquera.",
    "Conte do presente mais estranho que você já deu ou recebeu de alguém com quem saía.",
  ]),
  ...mentira("trampo", [
    "Conte da vez que você colou numa prova e quase foi pego.",
    "Conte do pior trabalho ou bico que você já fez.",
    "Conte da vez que você dormiu numa aula, reunião ou no trabalho.",
    "Conte da maior desculpa que você já deu para um professor ou chefe.",
    "Conte da vez que você falou mal de alguém e a pessoa estava ouvindo.",
    "Conte da pior entrevista de emprego que você já fez.",
    "Conte da vez que você fez uma apresentação sem ter estudado nada.",
    "Conte da maior gafe que você já cometeu com um chefe ou professor.",
    "Conte da vez que você mandou algo no grupo do trabalho ou da escola sem querer.",
    "Conte da vez que você foi parar na diretoria e por quê.",
  ]),
  ...mentira("viagem", [
    "Conte da viagem que mais deu errado na sua vida.",
    "Conte da vez que você quase perdeu (ou perdeu) um voo, ônibus ou trem.",
    "Conte da comida mais estranha que você já comeu viajando.",
    "Conte da vez que você teve problema com a língua num lugar diferente.",
    "Conte do lugar mais bonito que você já conheceu e como foi parar lá.",
    "Conte da vez que você teve que dormir num lugar improvisado numa viagem.",
    "Conte da vez que você esqueceu algo essencial numa viagem.",
    "Conte da pessoa mais marcante que você conheceu viajando.",
    "Conte da vez que você foi enganado num lugar turístico.",
    "Conte da maior aventura que você já viveu numa viagem.",
  ]),
];
