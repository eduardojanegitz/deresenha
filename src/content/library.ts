import type {
  Challenge,
  Difficulty,
  InfiltradoChallenge,
  MimicaChallenge,
  NotaChallenge,
  PrefereChallenge,
  QuemChallenge,
  QuizChallenge,
  RankingChallenge,
  Theme,
} from "./types";
import { LIMITE, LIMITE_THEMES } from "./limite.ts";
import { LIMITE_EXTRA } from "./limite-extra.ts";
import { LIMITE_RESENHA } from "./limite-resenha.ts";
import { LIMITE_MAIS } from "./limite-mais.ts";
import { QUIZ_EXTRA } from "./quiz.ts";
import { INFILTRADO_EXTRA } from "./infiltrado.ts";
import { QUIZ_MAIS } from "./quiz-mais.ts";
import { QUIZ_MAIS_2 } from "./quiz-mais-2.ts";
import { MENTIRA, MENTIRA_THEMES } from "./mentira.ts";
import { TURMA_MIMICA, TURMA_NOTA_AVALIACAO, TURMA_NOTA_SECRETA, TURMA_QUEM, TURMA_THEMES } from "./turma.ts";

/**
 * Conteúdo inicial em português brasileiro. Escrito à mão, sem geração por IA a cada rodada.
 * Os IDs são estáveis (jogo, tema, posição) para que o "evitar repetição" e o banco de dados
 * concordem. Na etapa 4 este arquivo vira seed da tabela `challenges`.
 */

export const THEMES: Theme[] = [
  // Os temas da turma vêm primeiro: são os mais divertidos (ver ./turma.ts).
  ...TURMA_THEMES,
  { id: "comida", label: "Comida" },
  { id: "filmes", label: "Filmes e séries" },
  { id: "futebol", label: "Futebol" },
  { id: "esportes", label: "Esportes" },
  { id: "musica", label: "Música" },
  { id: "cultura-pop", label: "Cultura pop" },
  { id: "lugares", label: "Lugares" },
  { id: "cotidiano", label: "Cotidiano" },
  { id: "absurdo", label: "Situações absurdas" },
  { id: "amizade", label: "Amizades" },
  { id: "relacionamentos", label: "Relacionamentos" },
  { id: "trabalho", label: "Trabalho e estudo" },
  { id: "animais", label: "Animais" },
  { id: "objetos", label: "Objetos" },
  { id: "profissoes", label: "Profissões" },
  { id: "personagens", label: "Lendas e personagens" },
  { id: "conhecimentos-gerais", label: "Conhecimentos gerais" },
  { id: "brasil", label: "Brasil" },
  { id: "geografia", label: "Geografia" },
  { id: "ciencia", label: "Ciência" },
  // Temas do Jogo do Limite que ainda não existiam (ver ./limite.ts).
  ...LIMITE_THEMES.filter((t) => !["cultura-pop", "esportes"].includes(t.id)),
  // Temas da Mentira Sincera que ainda não existiam (ver ./mentira.ts).
  ...MENTIRA_THEMES.filter((t) => !TURMA_THEMES.some((x) => x.id === t.id)),
];

const extraLabels = new Map<string, string>();
/** Registra rótulos de temas vindos do banco (criados no painel). */
export function registerThemes(list: Theme[]) {
  list.forEach((t) => extraLabels.set(t.id, t.label));
}
export const themeLabel = (id: string) => extraLabels.get(id) ?? THEMES.find((t) => t.id === id)?.label ?? id;

const base = { status: "published" as const, lang: "pt-BR" as const };

function nota(kind: NotaChallenge["kind"], theme: string, texts: string[], difficulty: Difficulty = "medio"): NotaChallenge[] {
  return texts.map((text, i) => ({ ...base, id: `nota-${kind}-${theme}-${i + 1}`, game: "nota", kind, theme, text, difficulty }));
}
function mimica(theme: string, difficulty: Difficulty, texts: string[]): MimicaChallenge[] {
  return texts.map((text, i) => ({ ...base, id: `mimica-${theme}-${difficulty}-${i + 1}`, game: "mimica", theme, text, difficulty }));
}
function infiltrado(theme: string, pairs: [string, string][], difficulty: Difficulty = "medio"): InfiltradoChallenge[] {
  return pairs.map(([major, impostor], i) => ({ ...base, id: `infiltrado-${theme}-${i + 1}`, game: "infiltrado", theme, major, impostor, difficulty }));
}
function ranking(theme: string, list: [string, string[]][]): RankingChallenge[] {
  return list.map(([title, items], i) => ({ ...base, id: `ranking-${theme}-${i + 1}`, game: "ranking", theme, title, items, difficulty: "medio" }));
}

function prefere(theme: string, pairs: [string, string][]): PrefereChallenge[] {
  return pairs.map(([a, b], i) => ({ ...base, id: `prefere-${theme}-${i + 1}`, game: "voce-prefere", theme, a, b, difficulty: "medio" }));
}

/* ---------- Jogo da Nota: Nota Secreta (categorias abertas) ---------- */
const NOTA_SECRETA = [
  ...nota("secreta", "relacionamentos", [
    "Lugares para um primeiro encontro",
    "Mensagens para mandar depois do primeiro encontro",
    "Desculpas para ir embora cedo de um encontro",
    "Presentes de um mês de namoro",
    "Apelidos carinhosos",
  ]),
  ...nota("secreta", "comida", [
    "Comidas de madrugada",
    "Recheios de pastel",
    "O que levar para um churrasco",
    "Sabores de sorvete",
    "Coberturas de pizza",
    "Lanches de viagem de carro",
  ]),
  ...nota("secreta", "cotidiano", [
    "Desculpas para faltar num rolê",
    "Coisas para fazer numa fila de banco",
    "Programas de domingo",
    "Toques de celular",
    "Jeitos de acordar de manhã",
  ]),
  ...nota("secreta", "absurdo", [
    "Superpoderes inúteis",
    "Nomes para um cachorro",
    "Profissões do futuro",
    "Coisas para gritar numa montanha-russa",
    "Coisas para levar para uma ilha deserta",
  ]),
  ...nota("secreta", "lugares", [
    "Destinos para um feriado prolongado",
    "Lugares para passar o Réveillon",
    "Lugares para se esconder num apocalipse zumbi",
  ]),
  ...nota("secreta", "musica", [
    "Músicas para tocar num casamento",
    "Músicas para acordar alguém",
    "Músicas para cantar no karaokê",
    "Músicas para uma viagem de carro",
  ]),
  ...nota("secreta", "filmes", [
    "Filmes para ver num primeiro encontro",
    "Séries para maratonar num fim de semana",
    "Vilões de filme",
  ]),
  ...nota("secreta", "futebol", ["Comemorações de gol", "Desculpas depois de perder o jogo", "Apelidos de jogador"]),
  ...nota("secreta", "trabalho", ["Desculpas para chegar atrasado", "Presentes de amigo secreto da firma", "Assuntos para puxar no elevador"]),
  ...nota("secreta", "amizade", ["Programas para fazer com a turma", "Assuntos para o grupo da família", "Jeitos de pedir dinheiro emprestado"]),
];

/* ---------- Jogo da Nota: Avaliação (situações para dar nota) ---------- */
const NOTA_AVALIACAO = [
  ...nota("avaliacao", "comida", [
    "Comer pizza fria no café da manhã",
    "Colocar ketchup na pizza",
    "Pedir sempre o mesmo prato no restaurante",
    "Uva-passa no arroz de Natal",
    "Abacaxi na pizza",
    "Tomar café sem açúcar",
  ]),
  ...nota("avaliacao", "cotidiano", [
    "Mandar áudio de 4 minutos",
    "Chegar 15 minutos antes do combinado",
    "Deixar a louça de molho até amanhã",
    "Acordar no primeiro alarme",
    "Deixar 47 abas abertas no navegador",
    "Dormir de meia",
  ]),
  ...nota("avaliacao", "amizade", [
    "Responder “kkkk” sem ter rido",
    "Marcar o rolê e desmarcar no dia",
    "Dar spoiler sem querer",
    "Contar a mesma história pela terceira vez",
    "Visualizar e não responder",
  ]),
  ...nota("avaliacao", "absurdo", [
    "Ir ao cinema sozinho numa sexta à noite",
    "Dar nome e sobrenome para uma planta",
    "Aplaudir quando o avião pousa",
    "Usar meia com chinelo",
    "Conversar com o próprio cachorro como se fosse gente",
  ]),
  ...nota("avaliacao", "relacionamentos", [
    "Dividir a conta no primeiro encontro",
    "Postar foto de casal toda semana",
    "Ver série sem esperar a outra pessoa",
  ]),
  ...nota("avaliacao", "trabalho", [
    "Reunião que podia ser um e-mail",
    "Responder mensagem de trabalho no domingo",
    "Câmera desligada em reunião",
  ]),
  ...nota("avaliacao", "futebol", ["Torcer para dois times", "Ver jogo no estádio na chuva", "Comentar o jogo com quem não gosta de futebol"]),
];

/* ---------- Mímica ---------- */
const MIMICA = [
  ...mimica("animais", "facil", ["Cachorro", "Gato", "Galinha", "Elefante", "Macaco", "Cobra", "Pinguim", "Peixe"]),
  ...mimica("animais", "medio", ["Canguru", "Polvo", "Bicho-preguiça", "Flamingo", "Camaleão", "Tartaruga"]),
  ...mimica("cotidiano", "facil", ["Escovar os dentes", "Dirigir", "Tomar banho", "Ler um livro", "Cozinhar", "Dormir"]),
  ...mimica("cotidiano", "medio", ["Pegar ônibus lotado", "Passar roupa", "Perder a chave de casa", "Fazer selfie", "Esperar o elevador"]),
  ...mimica("cotidiano", "dificil", ["Tentar abrir um pote de vidro", "Procurar sinal de celular", "Montar um móvel sem manual", "Pisar numa peça de Lego"]),
  ...mimica("esportes", "facil", ["Futebol", "Natação", "Basquete", "Boxe", "Corrida"]),
  ...mimica("esportes", "medio", ["Surfe", "Esgrima", "Levantamento de peso", "Patinação", "Arco e flecha"]),
  ...mimica("esportes", "dificil", ["Nado sincronizado", "Curling", "Salto com vara", "Hipismo"]),
  ...mimica("filmes", "medio", ["Super-herói", "Filme de terror", "Pirata", "Zumbi", "Vampiro", "Robô"]),
  ...mimica("filmes", "dificil", ["Viagem no tempo", "Assalto a banco", "Dança na chuva", "Navio afundando"]),
  ...mimica("trabalho", "medio", ["Dentista", "Bombeiro", "Garçom", "Fotógrafo", "Mágico", "Maestro"]),
  ...mimica("trabalho", "dificil", ["Controlador de tráfego aéreo", "Domador de leões", "Astronauta consertando a nave"]),
  ...mimica("objetos", "facil", ["Guarda-chuva", "Telefone", "Tesoura", "Escada", "Violão"]),
  ...mimica("objetos", "medio", ["Liquidificador", "Secador de cabelo", "Aspirador de pó", "Máquina de lavar"]),
  ...mimica("absurdo", "dificil", ["Dinossauro jogando boliche", "Fantasma com soluço", "Pinguim de férias na praia", "Polvo fazendo malabarismo"]),
];

/* ---------- Infiltrado (palavras próximas, mas diferentes) ---------- */
const INFILTRADO = [
  ...infiltrado("lugares", [
    ["Praia", "Piscina"],
    ["Cinema", "Teatro"],
    ["Hospital", "Farmácia"],
    ["Aeroporto", "Rodoviária"],
    ["Academia", "Parque"],
    ["Biblioteca", "Livraria"],
    ["Shopping", "Feira"],
  ]),
  ...infiltrado("comida", [
    ["Pizza", "Lasanha"],
    ["Café", "Chá"],
    ["Sorvete", "Açaí"],
    ["Brigadeiro", "Beijinho"],
    ["Hambúrguer", "Cachorro-quente"],
    ["Coxinha", "Pastel"],
  ]),
  ...infiltrado("animais", [
    ["Cachorro", "Lobo"],
    ["Gato", "Leão"],
    ["Golfinho", "Tubarão"],
    ["Coruja", "Morcego"],
  ]),
  ...infiltrado("objetos", [
    ["Guarda-chuva", "Capa de chuva"],
    ["Violão", "Ukulele"],
    ["Bicicleta", "Patinete"],
    ["Travesseiro", "Almofada"],
  ]),
  ...infiltrado("esportes", [
    ["Futebol", "Futsal"],
    ["Tênis", "Pingue-pongue"],
    ["Surfe", "Skate"],
  ]),
  ...infiltrado("cultura-pop", [
    ["Novela", "Série"],
    ["Show", "Festival"],
    ["Podcast", "Rádio"],
  ]),
];

/* ---------- Ranking às Cegas ---------- */
const RANKING = [
  ...ranking("lugares", [
    ["Melhores lugares para viajar", ["Rio de Janeiro", "Paris", "Japão", "Chapada Diamantina", "Nova York", "Fernando de Noronha", "Islândia", "Buenos Aires", "Egito", "Gramado"]],
    ["Melhores lugares para um encontro", ["Cinema", "Parque", "Barzinho", "Restaurante japonês", "Show", "Museu", "Praia", "Karaokê"]],
  ]),
  ...ranking("comida", [
    ["Melhores comidas de festa", ["Coxinha", "Brigadeiro", "Pão de queijo", "Esfiha", "Bolo", "Pastel", "Kibe", "Cachorro-quente"]],
    ["Melhores sabores de pizza", ["Calabresa", "Marguerita", "Quatro queijos", "Portuguesa", "Frango com catupiry", "Pepperoni", "Chocolate", "Napolitana"]],
  ]),
  ...ranking("filmes", [
    ["Melhores gêneros de filme", ["Comédia", "Terror", "Romance", "Ação", "Animação", "Ficção científica", "Suspense", "Musical", "Documentário"]],
  ]),
  ...ranking("cotidiano", [
    ["Melhores dias da semana", ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]],
    ["Piores tarefas de casa", ["Lavar louça", "Passar roupa", "Limpar banheiro", "Varrer", "Estender roupa", "Tirar o lixo", "Arrumar a cama", "Limpar a geladeira"]],
  ]),
  ...ranking("animais", [
    ["Melhores animais de estimação", ["Cachorro", "Gato", "Peixe", "Papagaio", "Hamster", "Tartaruga", "Coelho", "Porquinho-da-índia"]],
  ]),
  ...ranking("esportes", [
    ["Melhores esportes para assistir", ["Futebol", "Vôlei", "Basquete", "Fórmula 1", "Tênis", "MMA", "Natação", "Ginástica", "Skate"]],
  ]),
  ...ranking("musica", [
    ["Melhores gêneros musicais", ["Samba", "Funk", "Rock", "Sertanejo", "MPB", "Pagode", "Pop", "Forró", "Rap", "Eletrônica"]],
  ]),
  ...ranking("amizade", [
    ["Melhores programas com a turma", ["Churrasco", "Noite de jogos", "Viagem", "Show", "Praia", "Maratona de séries", "Karaokê", "Acampamento"]],
  ]),
];

/* ---------- Você Prefere? ---------- */
const PREFERE = [
  ...prefere("comida", [
    ["Comer só pizza pelo resto da vida", "Nunca mais comer pizza"],
    ["Café sempre frio", "Refrigerante sempre sem gás"],
    ["Só comer doce", "Só comer salgado"],
    ["Jantar num restaurante chique sozinho", "Comer cachorro-quente de rua com a turma"],
  ]),
  ...prefere("cotidiano", [
    ["Acordar todo dia às 5h", "Dormir todo dia às 3h"],
    ["Ficar uma semana sem celular", "Ficar uma semana sem banho quente"],
    ["Pegar trânsito todo dia", "Trabalhar no sábado"],
    ["Ter o Wi-Fi mais rápido do mundo", "Nunca mais pegar fila"],
  ]),
  ...prefere("amizade", [
    ["Pagar a conta de todo mundo no rolê", "Lavar a louça de todo mundo depois"],
    ["Saber o que os amigos falam de você", "Nunca saber"],
    ["Ser o amigo que sempre se atrasa", "Ser o amigo que sempre espera"],
    ["Ler todas as mensagens do grupo da família", "Responder todas as do grupo da firma"],
  ]),
  ...prefere("absurdo", [
    ["Falar com animais", "Falar todos os idiomas"],
    ["Ter um botão de pular", "Ter um botão de voltar"],
    ["Ser invisível só quando ninguém olha", "Voar só a 10 centímetros do chão"],
    ["Espirrar confete", "Soluçar bolhas de sabão"],
    ["Ter uma música tocando sempre que você entra num lugar", "Ter risadas de plateia depois de tudo que você fala"],
  ]),
  ...prefere("relacionamentos", [
    ["Primeiro encontro no cinema", "Primeiro encontro no karaokê"],
    ["Saber tudo sobre o passado da pessoa", "Saber nada"],
    ["Mensagem de bom dia todo dia", "Ligação surpresa de vez em quando"],
  ]),
  ...prefere("lugares", [
    ["Férias na praia com chuva", "Férias na montanha com sol"],
    ["Morar na cidade grande", "Morar no interior"],
    ["Conhecer todos os países", "Conhecer todo o Brasil"],
  ]),
  ...prefere("musica", [
    ["Só ouvir uma música para sempre", "Nunca repetir uma música"],
    ["Cantar mal e muito alto", "Cantar bem e muito baixo"],
  ]),
];

function quem(theme: string, names: string[], difficulty: Difficulty = "medio"): QuemChallenge[] {
  return names.map((name, i) => ({ ...base, id: `quem-${theme}-${i + 1}`, game: "quem-sou-eu", theme, name, difficulty }));
}

const QUEM = [
  ...quem("animais", ["Girafa", "Pinguim", "Elefante", "Tubarão", "Bicho-preguiça", "Tamanduá", "Capivara", "Polvo", "Camaleão", "Coruja", "Canguru", "Tartaruga"], "facil"),
  ...quem("profissoes", ["Bombeiro", "Dentista", "Astronauta", "Padeiro", "Cabeleireiro", "Professor", "Piloto de avião", "Veterinário", "Garçom", "Detetive", "Salva-vidas", "Palhaço de circo"]),
  ...quem("objetos", ["Guarda-chuva", "Escova de dentes", "Controle remoto", "Geladeira", "Chinelo", "Liquidificador", "Travesseiro", "Bicicleta", "Relógio", "Espelho"]),
  ...quem("comida", ["Pastel", "Brigadeiro", "Coxinha", "Pão de queijo", "Feijoada", "Pipoca", "Açaí", "Pizza", "Melancia", "Ovo frito"], "facil"),
  ...quem("personagens", ["Saci", "Curupira", "Iara", "Papai Noel", "Coelhinho da Páscoa", "Fada do Dente", "Mula sem cabeça", "Boitatá", "Vampiro", "Sereia", "Pirata", "Robô"]),
  ...quem("lugares", ["Praia", "Hospital", "Aeroporto", "Biblioteca", "Padaria", "Cinema", "Academia", "Zoológico", "Escola", "Supermercado"]),
];

/** Cada linha: pergunta e alternativas, com a CORRETA primeiro (a ordem é embaralhada no jogo). */
function quiz(theme: string, list: [string, string[]][], difficulty: Difficulty = "medio"): QuizChallenge[] {
  return list.map(([question, options], i) => ({ ...base, id: `quiz-${theme}-${i + 1}`, game: "quiz", theme, question, options, answer: 0, difficulty }));
}

const QUIZ = [
  ...quiz("brasil", [
    ["Qual é a capital do Brasil?", ["Brasília", "Rio de Janeiro", "São Paulo", "Salvador"]],
    ["Em que ano o Brasil declarou a independência?", ["1822", "1500", "1889", "1888"]],
    ["Qual é o maior estado brasileiro em área?", ["Amazonas", "Pará", "Mato Grosso", "Minas Gerais"]],
    ["Quantas Copas do Mundo a seleção masculina do Brasil já ganhou?", ["5", "4", "3", "6"]],
    ["Qual bioma ocupa a maior parte do território brasileiro?", ["Amazônia", "Cerrado", "Caatinga", "Pantanal"]],
    ["Qual cidade era a capital do Brasil antes de Brasília?", ["Rio de Janeiro", "Salvador", "São Paulo", "Belo Horizonte"]],
    ["Qual é a moeda do Brasil desde 1994?", ["Real", "Cruzeiro", "Cruzado", "Mil-réis"]],
    ["Em que ano foi assinada a Lei Áurea?", ["1888", "1822", "1889", "1850"]],
    ["Em qual estado fica Manaus?", ["Amazonas", "Pará", "Roraima", "Acre"]],
    ["Quantos estados tem o Brasil, sem contar o Distrito Federal?", ["26", "27", "25", "24"]],
  ]),
  ...quiz("geografia", [
    ["Qual é o maior oceano do planeta?", ["Pacífico", "Atlântico", "Índico", "Ártico"]],
    ["Qual é a capital da Argentina?", ["Buenos Aires", "Montevidéu", "Santiago", "Lima"]],
    ["Em que continente fica o Egito?", ["África", "Ásia", "Europa", "Oceania"]],
    ["Qual é o país mais populoso da América do Sul?", ["Brasil", "Argentina", "Colômbia", "Peru"]],
    ["Qual é a capital do Japão?", ["Tóquio", "Quioto", "Osaka", "Seul"]],
    ["Qual é o rio mais extenso que corre no Brasil?", ["Amazonas", "São Francisco", "Paraná", "Tocantins"]],
    ["Qual é a montanha mais alta do mundo em relação ao nível do mar?", ["Everest", "K2", "Aconcágua", "Kilimanjaro"]],
    ["Com qual país Portugal faz fronteira terrestre?", ["Espanha", "França", "Itália", "Marrocos"]],
    ["Qual é o menor país do mundo em área?", ["Vaticano", "Mônaco", "San Marino", "Malta"]],
  ]),
  ...quiz("ciencia", [
    ["Qual planeta é conhecido como planeta vermelho?", ["Marte", "Vênus", "Júpiter", "Mercúrio"]],
    ["Qual é a fórmula química da água?", ["H₂O", "CO₂", "O₂", "NaCl"]],
    ["Quantos ossos tem o corpo de um adulto?", ["206", "106", "306", "412"]],
    ["Qual é o maior planeta do Sistema Solar?", ["Júpiter", "Saturno", "Netuno", "Terra"]],
    ["Qual gás as plantas absorvem do ar na fotossíntese?", ["Gás carbônico", "Oxigênio", "Nitrogênio", "Hélio"]],
    ["Qual órgão bombeia o sangue pelo corpo?", ["Coração", "Pulmão", "Fígado", "Rim"]],
    ["A quantos graus a água ferve ao nível do mar?", ["100 °C", "90 °C", "80 °C", "120 °C"]],
    ["Qual metal é líquido em temperatura ambiente?", ["Mercúrio", "Chumbo", "Alumínio", "Ferro"]],
    ["Quantas patas tem uma aranha?", ["8", "6", "10", "4"]],
  ]),
  ...quiz(
    "conhecimentos-gerais",
    [
      ["Quantos minutos tem uma hora e meia?", ["90", "60", "120", "100"]],
      ["Quantos lados tem um hexágono?", ["6", "5", "7", "8"]],
      ["Quem pintou a Mona Lisa?", ["Leonardo da Vinci", "Michelangelo", "Rafael", "Van Gogh"]],
      ["Quantos jogadores de cada time ficam em campo numa partida de futebol?", ["11", "10", "12", "9"]],
      ["Qual é o animal terrestre mais rápido?", ["Guepardo", "Leão", "Cavalo", "Antílope"]],
      ["Que cor sai da mistura de tinta azul com amarela?", ["Verde", "Roxo", "Laranja", "Marrom"]],
      ["Quantos dias tem um ano bissexto?", ["366", "365", "364", "360"]],
      ["Em que país surgiram os Jogos Olímpicos da Antiguidade?", ["Grécia", "Itália", "Egito", "Turquia"]],
      ["Quantas cordas tem um violão comum?", ["6", "4", "5", "7"]],
    ],
    "facil",
  ),
];

export const CHALLENGES: Challenge[] = [
  ...TURMA_NOTA_SECRETA,
  ...NOTA_SECRETA,
  ...TURMA_NOTA_AVALIACAO,
  ...NOTA_AVALIACAO,
  ...TURMA_MIMICA,
  ...MIMICA,
  ...INFILTRADO,
  ...INFILTRADO_EXTRA,
  ...RANKING,
  ...PREFERE,
  ...TURMA_QUEM,
  ...QUEM,
  ...QUIZ,
  ...QUIZ_EXTRA,
  ...QUIZ_MAIS,
  ...QUIZ_MAIS_2,
  ...LIMITE,
  ...LIMITE_EXTRA,
  ...LIMITE_RESENHA,
  ...LIMITE_MAIS,
  ...MENTIRA,
];

/** Desafios publicados de um jogo, opcionalmente filtrados por tema. */
export function challengesFor<G extends Challenge["game"]>(game: G, themes?: readonly string[]) {
  return CHALLENGES.filter(
    (c): c is Extract<Challenge, { game: G }> => c.game === game && c.status === "published" && (!themes || themes.includes(c.theme)),
  );
}

/** Temas que têm conteúdo para um jogo (e, no Jogo da Nota, para um modo). */
export function themesFor(game: Challenge["game"], filter?: (c: Challenge) => boolean): Theme[] {
  const ids = new Set(CHALLENGES.filter((c) => c.game === game && c.status === "published" && (!filter || filter(c))).map((c) => c.theme));
  return THEMES.filter((t) => ids.has(t.id));
}
