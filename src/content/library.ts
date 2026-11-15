import type {
  Challenge,
  Difficulty,
  InfiltradoChallenge,
  MimicaChallenge,
  NotaChallenge,
  RankingChallenge,
  Theme,
} from "./types";

/**
 * Conteúdo inicial em português brasileiro. Escrito à mão, sem geração por IA a cada rodada.
 * Os IDs são estáveis (jogo, tema, posição) para que o "evitar repetição" e o banco de dados
 * concordem. Na etapa 4 este arquivo vira seed da tabela `challenges`.
 */

export const THEMES: Theme[] = [
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
];

export const themeLabel = (id: string) => THEMES.find((t) => t.id === id)?.label ?? id;

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

export const CHALLENGES: Challenge[] = [...NOTA_SECRETA, ...NOTA_AVALIACAO, ...MIMICA, ...INFILTRADO, ...RANKING];

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
