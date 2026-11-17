import type { LimiteChallenge, Theme } from "./types";

/**
 * Terceira leva do Jogo do Limite, escolhida para render conversa: números que parecem
 * mentira, histórias absurdas e contas que ninguém nunca fez. Mesmas regras das outras
 * levas: fontes conhecidas, ano quando o número muda, "cerca de" quando é estimativa.
 */
export const LIMITE_RESENHA_THEMES: Theme[] = [
  { id: "historia-absurda", label: "História absurda" },
  { id: "nojeira", label: "Nojeirinhas" },
  { id: "quanto-tempo", label: "Quanto tempo leva?" },
  { id: "fortunas", label: "Dinheiro e fortunas" },
];

type Row = [string, number, string, string?];
const base = { status: "published" as const, lang: "pt-BR" as const, difficulty: "dificil" as const };
const limite = (theme: string, rows: Row[]): LimiteChallenge[] =>
  rows.map(([question, answer, unit, fact], i) => ({ ...base, id: `limite-${theme}-c${i + 1}`, game: "limite", theme, question, answer, unit, ...(fact ? { fact } : {}) }));

export const LIMITE_RESENHA: LimiteChallenge[] = [
  ...limite("historia-absurda", [
    ["Em 1896, Reino Unido e Zanzibar travaram a guerra mais curta da história. Quantos minutos ela durou?", 38, "minutos", "Zanzibar se rendeu antes de dar tempo de esfriar o café."],
    ["Quantos anos durou a Guerra dos Cem Anos?", 116, "anos", "Foi de 1337 a 1453. O nome só veio séculos depois."],
    ["Napoleão ficou com fama de baixinho. Quantos centímetros ele tinha, mais ou menos?", 169, "centímetros", "Era a altura média da época. A fama veio da propaganda inglesa e de uma confusão entre medidas francesas e inglesas."],
    ["Em 1932, a Austrália mandou soldados com metralhadoras para combater emus, aves parecidas com a ema. Eram cerca de quantos emus?", 20000, "emus", "Os emus venceram: o exército desistiu depois de algumas semanas."],
    ["Quantos anos separam a construção da Grande Pirâmide e o nascimento de Cleópatra, mais ou menos?", 2500, "anos", "Cleópatra nasceu mais perto da chegada do homem à Lua do que da construção da pirâmide."],
    ["Os últimos mamutes viveram numa ilha da Rússia. Eles morreram há cerca de quantos anos?", 4000, "anos", "Quando eles sumiram, as pirâmides do Egito já existiam."],
    ["Em que ano já havia aulas na Universidade de Oxford?", 1096, "", "Oxford é mais antiga que o Império Asteca."],
    ["Quantos botes salva-vidas tinha o Titanic?", 20, "botes", "Cabiam cerca de 1.200 pessoas neles. Havia mais de 2.200 a bordo."],
    ["Quantos metros voou o 14-Bis, de Santos-Dumont, no voo de 23 de outubro de 1906?", 60, "metros", "O voo durou cerca de 7 segundos."],
    ["A Torre Eiffel foi construída para ser desmontada depois de quantos anos?", 20, "anos", "Ela foi salva porque virou uma ótima antena de rádio."],
    ["Quantos anos tinha Tutancâmon quando morreu?", 19, "anos", "Ele virou faraó com uns 9 anos."],
    ["Quantos anos levou a construção da catedral de Notre-Dame de Paris, mais ou menos?", 180, "anos", "Quem começou a obra nunca viu ela pronta. Nem os netos."],
    ["Quantos anos durou o reinado de Luís XIV, o Rei Sol, o mais longo da história da Europa?", 72, "anos", "Ele virou rei com 4 anos."],
    ["Em que ano foi inventada a Coca-Cola?", 1886, "", "Foi criada por um farmacêutico e vendida como remédio."],
  ]),
  ...limite("nojeira", [
    ["Quantas vezes por dia, em média, uma pessoa solta pum?", 14, "vezes", "E sim, todo mundo. Até quem jura que não."],
    ["Quantos tipos diferentes de bactéria já foram encontrados na boca humana?", 700, "tipos", "Escovar os dentes não mata todas. Só põe ordem na bagunça."],
    ["Um projeto de cientistas americanos analisou umbigos de voluntários. Quantas espécies de bactéria eles encontraram, somando todos?", 2368, "espécies", "Muitas delas nunca tinham sido vistas pela ciência."],
    ["Por quantos dias uma barata consegue viver sem a cabeça, mais ou menos?", 7, "dias", "Ela respira pelo corpo. Morre de sede, não da falta de cabeça."],
    ["Há quantos milhões de anos as baratas existem, mais ou menos?", 300, "milhões de anos", "Elas já estavam aqui antes dos dinossauros."],
    ["Quantos litros de muco (catarro) o corpo produz por dia, mais ou menos?", 1, "litro", "A maior parte a gente engole sem perceber."],
    ["Quantas células de pele morta a gente perde por minuto, mais ou menos?", 40000, "células", "Boa parte da poeira de casa vem daí."],
    ["Quantas vezes por hora, em média, uma pessoa coloca a mão no rosto, segundo um estudo de 2015?", 23, "vezes", "O estudo filmou estudantes de medicina. Nem eles escapam."],
    ["Um estudo da Universidade do Arizona achou quantas vezes mais bactérias no celular do que num assento de vaso sanitário?", 10, "vezes", "Quando foi a última vez que você limpou o seu?"],
    ["Até quantas gotículas saem num único espirro?", 40000, "gotículas", "Por isso o cotovelo existe."],
  ]),
  ...limite("quanto-tempo", [
    ["Se você contasse até 1 milhão, um número por segundo, sem dormir nem parar, quantos dias levaria?", 11.6, "dias", "E até 1 bilhão? Mais de 31 anos."],
    ["Se você contasse até 1 bilhão, um número por segundo, sem parar, quantos anos levaria?", 31.7, "anos", "Um milhão de segundos dá 11 dias. Um bilhão dá uma vida adulta inteira."],
    ["Andando a 5 km/h, sem parar nunca, quantos anos levaria para chegar à Lua?", 8.8, "anos"],
    ["Quantos anos uma garrafa plástica leva para se decompor na natureza, mais ou menos?", 450, "anos", "A primeira garrafa PET da sua vida provavelmente ainda existe."],
    ["Quantos anos uma lata de alumínio leva para se decompor, mais ou menos?", 200, "anos", "A boa notícia: o Brasil recicla quase todas as latas."],
    ["Quantos segundos a luz da Lua leva para chegar à Terra?", 1.3, "segundos"],
    ["Quantas vezes por dia os astronautas da Estação Espacial veem o sol nascer?", 16, "vezes", "Eles dão uma volta na Terra a cada 90 minutos."],
    ["Até quantos dias uma preguiça pode levar para digerir uma única refeição?", 30, "dias", "E ela desce da árvore para fazer cocô só uma vez por semana."],
    ["Quantos dias durou a viagem de Cabral de Portugal até o Brasil, em 1500?", 44, "dias", "Saiu de Lisboa em 9 de março e avistou terra em 22 de abril."],
    ["Quantos anos uma estalactite leva para crescer 1 centímetro, mais ou menos?", 100, "anos", "Quebrar uma é apagar séculos de trabalho da natureza."],
    ["Quantos dias uma pessoa aguenta sem beber água, mais ou menos?", 3, "dias", "Sem comida, dá para aguentar semanas."],
  ]),
  ...limite("fortunas", [
    ["Em 2010, quantos bitcoins um programador pagou por duas pizzas?", 10000, "bitcoins", "Anos depois, essas pizzas passariam a valer centenas de milhões de dólares."],
    ["Por quantos milhões de dólares os Estados Unidos compraram o Alasca da Rússia, em 1867?", 7.2, "milhões de dólares", "Na época, chamaram a compra de loucura."],
    ["Por quantos milhões de euros Neymar foi vendido do Barcelona para o PSG, em 2017?", 222, "milhões de euros", "É a transferência mais cara da história do futebol."],
    ["Por quantos milhões de dólares foi leiloada uma banana colada na parede com fita adesiva, obra de arte de Maurizio Cattelan, em 2024?", 6.2, "milhões de dólares", "O comprador comeu a banana dias depois."],
    ["Por quantos milhões de dólares foi leiloada a camisa que Maradona usou no gol de mão contra a Inglaterra, em 1986?", 9.3, "milhões de dólares", "Foi leiloada em 2022 e virou a camisa esportiva mais cara da história."],
    ["Por quantos milhões de dólares foi vendido o primeiro tuíte da história, como NFT, em 2021?", 2.9, "milhões de dólares", "O tuíte dizia só 'just setting up my twttr'."],
    ["Quantos dólares custava o primeiro iPhone, o de 4 GB, em 2007?", 499, "dólares", "Ele não tinha loja de aplicativos nem copiar e colar."],
    ["Em 2022, a Apple foi a primeira empresa a valer quantos trilhões de dólares?", 3, "trilhões de dólares", "Mais que o PIB do Brasil inteiro."],
  ]),
  ...limite("bichos", [
    ["Quantas vezes por segundo uma mosca bate as asas, mais ou menos?", 200, "vezes", "Por isso aquele zumbido irritante."],
    ["Quantos músculos tem a tromba de um elefante, mais ou menos?", 40000, "músculos", "O corpo humano inteiro tem uns 600."],
    ["Quantos olhos tem uma abelha?", 5, "olhos", "Dois grandes nas laterais e três pequenos no alto da cabeça."],
    ["Quantos por cento dos neurônios de um polvo ficam nos braços, mais ou menos?", 66, "%", "Cada braço consegue agir quase sozinho."],
    ["Quanto pesa o coração de uma girafa, mais ou menos?", 11, "quilos", "Ele precisa bombear sangue até uma cabeça a 2 metros de altura."],
    ["A que velocidade o camarão-louva-a-deus dá o soco dele, mais ou menos?", 80, "km/h", "O golpe é tão rápido que cria bolhas na água que estouram com luz e calor."],
  ]),
  ...limite("corpo", [
    ["Quantos litros de sangue o coração bombeia por dia, mais ou menos?", 7000, "litros", "Daria para encher um caminhão-pipa pequeno."],
    ["Quantos músculos tem o rosto humano, mais ou menos?", 43, "músculos"],
    ["Quantos ossos tem a mão humana, contando o punho?", 27, "ossos", "As duas mãos juntas têm mais de um quarto dos ossos do corpo."],
    ["Quantas vezes uma pessoa pisca por dia, mais ou menos?", 15000, "vezes", "Somando tudo, passamos uns 10% do tempo acordado de olhos fechados."],
  ]),
];
