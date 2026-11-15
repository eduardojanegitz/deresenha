import type { PieceKind } from "@/engine/core";
import type { GameId } from "@/content/types";

/**
 * Catálogo de jogos. Adicionar um jogo = uma entrada aqui + um motor em src/engine
 * + uma tela em src/games/<id>. Nada mais na aplicação precisa mudar.
 */
export type PlayMode = "shared" | "room";
export type GameStatus = "ready" | "planned";

export interface GameDefinition {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  piece: PieceKind;
  tint: string;
  players: { min: number; max: number };
  /** Modos que o jogo suporta no desenho final. */
  modes: PlayMode[];
  /** Modos já jogáveis nesta versão. */
  available: PlayMode[];
  status: GameStatus;
  /** Etapa do plano em que chega, para jogos ainda não prontos. */
  stage?: number;
  /** Por que um jogo planejado ainda não está disponível, quando não é só questão de etapa. */
  pendingNote?: string;
  minutes: string;
  rules: string[];
  scoring?: string;
}

export const GAMES: GameDefinition[] = [
  {
    id: "nota",
    name: "Jogo da Nota",
    tagline: "Dê uma nota, esconda uma nota, adivinhe a nota.",
    description: "Dois jogos em um. Na Nota Secreta, alguém recebe uma nota escondida e diz algo que vale exatamente isso. Na Avaliação, todo mundo dá nota para a mesma situação e vê quem pensa igual.",
    piece: "tijolo",
    tint: "var(--color-gema-t)",
    players: { min: 2, max: 12 },
    modes: ["shared", "room"],
    available: ["shared", "room"],
    status: "ready",
    minutes: "2 minutos por rodada",
    rules: [
      "Nota Secreta: o DeResenha sorteia quem pensa, o tema e uma nota de 0 a 10.",
      "Só quem pensa vê a nota. Essa pessoa diz algo que, pra ela, vale exatamente aquilo.",
      "A turma chuta o número. Quanto mais perto, mais pontos.",
      "Avaliação: todo mundo dá uma nota escondida para a mesma situação, e tudo é revelado junto.",
    ],
    scoring: "Na mosca 100, errou por 1 vale 70, por 2 vale 40, por 3 vale 20. Quem deu a dica ganha metade da média da turma. Tudo configurável.",
  },
  {
    id: "mimica",
    name: "Mímica",
    tagline: "Faz sem falar. A turma adivinha antes do tempo acabar.",
    description: "Uma pessoa representa a palavra sem falar e o próprio time tenta adivinhar. Cada acerto vale um ponto. Dá para jogar em times ou cada um por si.",
    piece: "capsula",
    tint: "var(--color-menta-t)",
    players: { min: 2, max: 20 },
    modes: ["shared"],
    available: ["shared"],
    status: "ready",
    minutes: "1 minuto por vez",
    rules: [
      "Passe o celular para quem vai representar. Só essa pessoa olha a palavra.",
      "Sem falar, sem apontar objetos, sem soletrar com a boca.",
      "Acertou, toca em Acertou e vem a próxima. Travou, pode pular.",
      "Quando o tempo acaba, passa a vez para o próximo time.",
    ],
    scoring: "Um ponto por palavra acertada, para o time da vez.",
  },
  {
    id: "infiltrado",
    name: "Infiltrado",
    tagline: "Todo mundo tem a mesma palavra. Quase todo mundo.",
    description: "Cada um recebe uma palavra em segredo. Uma pessoa recebe uma palavra parecida, mas diferente, e nem sabe que é o infiltrado. Dicas, desconfiança e votação.",
    piece: "pino",
    tint: "var(--color-lilas-t)",
    players: { min: 4, max: 12 },
    modes: ["shared", "room"],
    available: ["shared", "room"],
    status: "ready",
    minutes: "5 minutos por rodada",
    rules: [
      "O celular passa de mão em mão e cada um vê a própria palavra em segredo.",
      "Na sua vez, dê uma dica curta sobre a sua palavra. Nem óbvia demais, nem vaga demais.",
      "Depois das dicas, cada um vota em segredo em quem acha que é o infiltrado.",
      "Empate leva a um desempate só entre os mais votados. Empatou de novo, o infiltrado escapa.",
    ],
    scoring: "Pegou o infiltrado: cada civil ganha 1, e quem votou nele ganha mais 1. Escapou: o infiltrado ganha 3.",
  },
  {
    id: "ranking",
    name: "Ranking às Cegas",
    tagline: "Encaixe cinco itens sem saber o que vem depois.",
    description: "Os itens aparecem um por vez e cada um precisa ganhar uma posição no ranking na hora. Escolheu, travou. O que vier depois tem que caber no que sobrou.",
    piece: "meialua",
    tint: "var(--color-ceu-t)",
    players: { min: 1, max: 10 },
    modes: ["shared", "room"],
    available: ["shared"],
    status: "ready",
    minutes: "1 minuto por ranking",
    rules: [
      "Aparece o tema e o primeiro item.",
      "Escolha uma posição de 1 a 5. Ela fica travada para sempre.",
      "O próximo item precisa entrar numa posição livre.",
      "No fim, o ranking completo aparece e dá para compartilhar como imagem.",
    ],
  },
  {
    id: "quem-sou-eu",
    name: "Quem Sou Eu?",
    tagline: "Todo mundo sabe quem você é. Menos você.",
    description: "O celular vai na sua testa, virado para a turma. Todo mundo vê a identidade secreta, menos você. Pergunte só o que se responde com sim ou não e descubra antes de acabarem as perguntas.",
    piece: "bolota",
    tint: "var(--color-chiclete-t)",
    players: { min: 2, max: 12 },
    modes: ["shared"],
    available: ["shared"],
    status: "ready",
    minutes: "2 minutos por vez",
    rules: [
      "Na sua vez, segure o celular na testa com a tela para a turma, sem olhar.",
      "Faça perguntas de sim ou não: “Eu sou um animal?”, “Eu caibo numa mochila?”.",
      "A turma responde em voz alta e toca em Sim ou Não, o que conta as perguntas.",
      "Chutou certo, a turma toca em Acertou. Errou ou desistiu, a vez passa.",
    ],
    scoring: "Acertar vale 1 ponto, mais 1 por pergunta que sobrou. Errar ou estourar o tempo não pontua.",
  },
  {
    id: "voce-prefere",
    name: "Você Prefere?",
    tagline: "Duas opções, uma escolha, nenhuma saída.",
    description: "Um dilema, duas saídas. Cada um escolhe em segredo e tudo aparece junto: dá para ver quem pensa igual à turma e quem é do contra.",
    piece: "bolota",
    tint: "var(--color-chiclete-t)",
    players: { min: 2, max: 12 },
    modes: ["shared", "room"],
    available: ["shared", "room"],
    status: "ready",
    minutes: "1 minuto por dilema",
    rules: [
      "Aparece um dilema com duas opções.",
      "Cada um escolhe em segredo e o anfitrião registra.",
      "As escolhas aparecem todas juntas, com quem foi para cada lado.",
      "No fim, veja quem pensa como a turma e quem é do contra.",
    ],
    scoring: "Opcional: 1 ponto para quem ficar com a maioria. Empate não pontua.",
  },
  {
    id: "quiz",
    name: "Quiz Relâmpago",
    tagline: "Acertou rápido, pontuou mais.",
    description: "Perguntas de múltipla escolha, cada um responde no próprio celular. Acertar dá pontos e acertar rápido dá mais. O servidor marca o tempo de cada um e só revela a resposta certa quando a pergunta fecha.",
    piece: "capsula",
    tint: "var(--color-ceu-t)",
    players: { min: 2, max: 12 },
    modes: ["room"],
    available: ["room"],
    status: "ready",
    minutes: "15 segundos por pergunta",
    rules: [
      "Quem comanda cria uma sala e a turma entra pelo código.",
      "A pergunta aparece em todos os celulares ao mesmo tempo, com o relógio correndo.",
      "Cada um toca na sua resposta. Depois de tocar, não dá para mudar.",
      "Quando todos respondem ou o tempo acaba, aparece a certa e quem marcou o quê.",
    ],
    scoring: "Acerto vale 100 pontos, mais até 100 pela rapidez. Errar ou não responder vale zero. A rapidez pode ser desligada.",
  },
  {
    id: "musica",
    name: "Adivinhe a Música",
    tagline: "Trechos curtos, memória longa.",
    description: "Reconhecer músicas ou artistas por trechos de áudio licenciados.",
    piece: "bolota",
    tint: "var(--color-lilas-t)",
    players: { min: 2, max: 20 },
    modes: ["shared", "room"],
    available: [],
    status: "planned",
    pendingNote: "Para tocar trechos de música, o DeResenha precisa de áudios com licença de uso. Este jogo chega quando houver um catálogo autorizado.",
    minutes: "",
    rules: [],
  },
];

export const getGame = (id: string) => GAMES.find((g) => g.id === id);
export const MODE_LABEL: Record<PlayMode, string> = { shared: "Num celular só", room: "Cada um no seu celular" };
