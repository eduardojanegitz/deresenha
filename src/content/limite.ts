import type { Difficulty, LimiteChallenge, Theme } from "./types";

/**
 * Jogo do Limite: perguntas que quase ninguém sabe de cabeça, com o valor de referência.
 * Os valores vêm de fontes conhecidas (Guinness, IBGE, NASA, Sabesp…). Quando o número muda
 * com o tempo, a pergunta diz o ano. Quando é uma estimativa, a pergunta diz "cerca de".
 */

export const LIMITE_THEMES: Theme[] = [
  { id: "recordes", label: "Recordes absurdos" },
  { id: "corpo", label: "Corpo humano bizarro" },
  { id: "bichos", label: "Bichos sem noção" },
  { id: "comilanca", label: "Comilança" },
  { id: "brasil-numeros", label: "Brasil em números" },
  { id: "espaco", label: "Espaço sideral" },
  { id: "contas-da-vida", label: "Contas da vida" },
  { id: "mundo", label: "Pelo mundo" },
  { id: "cultura-pop", label: "Cultura pop" },
  { id: "esportes", label: "Esportes" },
  { id: "tecnologia", label: "Tecnologia e internet" },
];

/** Temas na ordem pensada para o jogo (os mais divertidos primeiro); temas de fora vão para o fim. */
export function sortLimiteThemes(ids: string[]) {
  const rank = new Map(LIMITE_THEMES.map((t, i) => [t.id, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

/** [pergunta, valor real, unidade, curiosidade mostrada na revelação] */
type Row = [string, number, string, string?];

const base = { status: "published" as const, lang: "pt-BR" as const };
function limite(theme: string, rows: Row[], difficulty: Difficulty = "dificil"): LimiteChallenge[] {
  return rows.map(([question, answer, unit, fact], i) => ({ ...base, id: `limite-${theme}-${i + 1}`, game: "limite", theme, question, answer, unit, difficulty, ...(fact ? { fact } : {}) }));
}

export const LIMITE: LimiteChallenge[] = [
  ...limite("recordes", [
    ["Em 2008, a americana Lee Redmond tinha as unhas mais longas do mundo. Somando as dez, quantos metros elas tinham?", 8.65, "metros", "Ela passou quase 30 anos sem cortar. Perdeu as unhas num acidente de carro em 2009."],
    ["Qual era a altura de Robert Wadlow, o homem mais alto que já existiu?", 272, "centímetros", "Ele ainda estava crescendo quando morreu, aos 22 anos."],
    ["Quantos anos viveu a francesa Jeanne Calment, a pessoa mais velha com idade comprovada?", 122, "anos", "Ela conheceu Van Gogh quando era adolescente e andou de bicicleta até os 100 anos."],
    ["O americano Charles Osborne teve a crise de soluço mais longa já registrada. Por quantos anos ele soluçou sem parar?", 68, "anos", "Começou em 1922, ao levantar um porco, e só parou em 1990, um ano antes de ele morrer."],
    ["Quanto pesava a maior abóbora do mundo, colhida nos Estados Unidos em 2023?", 1246.9, "quilos", "Mais que um carro popular. O dono deu a ela o nome de Michael Jordan."],
    ["Em 2021, Joey Chestnut bateu o recorde do concurso de cachorro-quente de Nova York. Quantos ele comeu em 10 minutos?", 76, "cachorros-quentes", "Com pão e tudo. Dá mais de um cachorro-quente a cada 8 segundos."],
    ["Quantos metros tinha a barba mais longa da história, a do norueguês Hans Langseth?", 5.33, "metros", "A barba está guardada no Museu Smithsonian, em Washington."],
    ["Quantos metros tinha o cabelo mais comprido já medido, o da chinesa Xie Qiuping, em 2004?", 5.627, "metros", "Ela deixou crescer desde 1973, quando tinha 13 anos."],
    ["Qual era a altura do nepalês Chandra Bahadur Dangi, o homem mais baixo já medido?", 54.6, "centímetros", "Mais baixo que um bebê de 1 ano."],
    ["Quanto pesava o americano Jon Brower Minnoch, a pessoa mais pesada já registrada?", 635, "quilos", "Foi preciso mais de uma dúzia de bombeiros para levá-lo ao hospital."],
    ["Por quantos milhões de dólares foi vendido o Salvator Mundi, de Leonardo da Vinci, o quadro mais caro da história, em 2017?", 450, "milhões de dólares", "O leilão durou menos de 20 minutos. Até hoje não se sabe ao certo onde o quadro está."],
  ]),
  ...limite("corpo", [
    ["Quantas vezes o coração de um adulto bate em um dia, mais ou menos?", 100000, "vezes", "Ao longo da vida, passa de 2,5 bilhões de batidas."],
    ["Se desse para enfileirar todos os vasos sanguíneos de um adulto, quantos quilômetros daria, mais ou menos?", 100000, "quilômetros", "Dá para dar duas voltas e meia na Terra."],
    ["Quantos fios de cabelo tem, em média, a cabeça de uma pessoa?", 100000, "fios", "E é normal perder de 50 a 100 por dia."],
    ["Quantos centímetros o cabelo cresce em um ano, mais ou menos?", 15, "centímetros", "Mais ou menos 1,25 centímetro por mês."],
    ["Quantos litros de sangue tem o corpo de um adulto?", 5, "litros", "Uma gota de sangue leva cerca de um minuto para dar a volta no corpo."],
    ["Somando o intestino delgado e o grosso, quantos metros de intestino tem um adulto, mais ou menos?", 7.5, "metros", "Só o delgado tem uns 6 metros, todo dobradinho dentro da barriga."],
    ["Quantas vezes uma pessoa respira em um dia, mais ou menos?", 20000, "vezes", "Quase sempre sem perceber."],
    ["Quanto pesa, em média, o cérebro de um adulto?", 1.4, "quilos", "É uns 2% do peso do corpo, mas gasta 20% da energia."],
    ["Se esticasse o DNA de uma única célula, quantos metros ele teria?", 2, "metros", "E tudo isso cabe num núcleo que nem se enxerga a olho nu."],
    ["Com quantos ossos, mais ou menos, um bebê nasce?", 300, "ossos", "Com o tempo, vários se juntam. O adulto fica com 206."],
    ["Quantos ossos tem um único pé humano?", 26, "ossos", "Os dois pés juntos têm quase um quarto dos ossos do corpo."],
    ["Quantos litros de saliva uma pessoa produz por dia, mais ou menos?", 1, "litro", "Em uma vida inteira, passa de 25 mil litros."],
  ]),
  ...limite("bichos", [
    ["Quanto pesa o coração de uma baleia-azul?", 180, "quilos", "É o maior coração do reino animal."],
    ["Quanto pesa a língua de uma baleia-azul?", 2700, "quilos", "Pesa mais ou menos o mesmo que um elefante."],
    ["Até quantas horas por dia um coala pode dormir?", 22, "horas", "A dieta de eucalipto dá pouquíssima energia, então ele economiza."],
    ["Quantos dentes um tubarão pode perder e repor ao longo da vida, mais ou menos?", 30000, "dentes", "Os dentes ficam em fileiras: caiu um, o de trás vem para frente."],
    ["Quantos centímetros tem a língua de uma girafa?", 50, "centímetros", "Ela é escura, quase roxa. Acredita-se que a cor proteja do sol enquanto a girafa come."],
    ["Quantas vezes por minuto o coração de um beija-flor pode bater?", 1200, "vezes", "O nosso bate umas 70 vezes por minuto em repouso."],
    ["Quanto pesa um ovo de avestruz?", 1.4, "quilos", "Equivale a umas 24 omeletes de ovo de galinha."],
    ["Quantos meses dura a gravidez de uma elefanta?", 22, "meses", "É a gestação mais longa entre os mamíferos terrestres."],
    ["Segundo um estudo de 2022, existem cerca de 20 quatrilhões de formigas na Terra. Quantas formigas dá para cada pessoa?", 2500000, "formigas", "Juntas, elas pesam mais que todas as aves e mamíferos selvagens somados."],
    ["Em que ano se estima que nasceu Jonathan, a tartaruga mais velha do mundo?", 1832, "", "Ele vive na ilha de Santa Helena, no meio do Atlântico, e já viveu sob oito reis e rainhas britânicos."],
    ["Quantos litros de água um camelo com sede consegue beber em 10 minutos, mais ou menos?", 100, "litros", "E a água não fica na corcova. A corcova é gordura."],
    ["Quantas flores, mais ou menos, as abelhas precisam visitar para fazer 1 quilo de mel?", 4000000, "flores", "Uma abelha produz, na vida inteira, só 1/12 de uma colher de chá de mel."],
    ["Quantos centímetros de diâmetro tem o olho da lula-colossal, o maior olho do reino animal?", 27, "centímetros", "Do tamanho de uma bola de futebol."],
    ["Quantos quilos de comida um elefante adulto pode comer por dia?", 150, "quilos", "Ele passa até 18 horas por dia comendo."],
  ]),
  ...limite("comilanca", [
    ["Quantas sementes tem, mais ou menos, um morango?", 200, "sementes", "E as 'sementes' do morango são, na verdade, os frutos dele."],
    ["Quantos gramas de açúcar tem uma lata de refrigerante de cola de 350 ml?", 37, "gramas", "Dá mais de 9 colheres de chá."],
    ["Quantos grãos de arroz tem um pacote de 1 quilo, mais ou menos?", 50000, "grãos", "Cada grão pesa mais ou menos 0,02 grama."],
    ["A que temperatura o milho de pipoca estoura?", 180, "°C", "A água dentro do grão vira vapor e explode a casca."],
    ["Quantos ovos uma galinha poedeira bota por ano, mais ou menos?", 300, "ovos", "Quase um por dia."],
    ["Quantas unidades Scoville (a escala do ardido) tem, em média, a pimenta Carolina Reaper?", 1600000, "unidades Scoville", "Uma pimenta jalapeño fica entre 2.500 e 8.000."],
    ["Quantos por cento de uma melancia é água?", 92, "%", "Por isso ela é tão boa num dia de praia."],
    ["Quantos litros de leite são necessários para fazer 1 quilo de queijo, mais ou menos?", 10, "litros", "Queijos duros, como o parmesão, pedem ainda mais."],
    ["Quantos gramas pesa um pão francês padrão?", 50, "gramas", "Desde 2006, a padaria tem que vender o pão francês por quilo."],
    ["Quantos litros de água são gastos, ao todo, para produzir 1 quilo de carne bovina?", 15000, "litros", "Quase tudo vai para o capim e a ração que o boi come."],
  ]),
  ...limite("brasil-numeros", [
    ["Quantos municípios tem o Brasil?", 5570, "municípios", "O maior é Altamira (PA). O menor é Santa Cruz de Minas (MG)."],
    ["Quantos quilômetros tem o litoral brasileiro, em linha contínua?", 7367, "quilômetros", "Contando as baías e os recortes, passa de 8.500 quilômetros."],
    ["Qual é a altura do Pico da Neblina, o ponto mais alto do Brasil?", 2995, "metros", "Fica no Amazonas, quase na fronteira com a Venezuela."],
    ["Quantos metros tem o Cristo Redentor, contando o pedestal?", 38, "metros", "De uma ponta à outra dos braços, são 28 metros."],
    ["Quantos quilômetros tem a ponte Rio–Niterói?", 13.29, "quilômetros", "Por anos foi a maior ponte do Hemisfério Sul."],
    ["Qual foi o público estimado da final da Copa de 1950, Brasil x Uruguai, no Maracanã?", 199854, "pessoas", "O maior público da história do futebol. O Brasil perdeu por 2 a 1."],
    ["Quantos por cento da Floresta Amazônica ficam no Brasil?", 60, "%", "O resto se divide entre outros oito países e a Guiana Francesa."],
    ["Em que ano Brasília foi inaugurada?", 1960, "", "A cidade foi construída em cerca de 41 meses."],
    ["Quantas línguas indígenas o Censo de 2010 encontrou no Brasil?", 274, "línguas", "Faladas por 305 povos diferentes."],
    ["Qual é a altura da barragem de Itaipu?", 196, "metros", "Equivale a um prédio de uns 65 andares."],
    ["Qual é a área de Altamira (PA), o maior município do Brasil?", 159533, "km²", "É maior que Portugal e que vários estados brasileiros."],
    ["Quantas quedas-d'água formam as Cataratas do Iguaçu, mais ou menos?", 275, "quedas", "A maior delas se chama Garganta do Diabo."],
  ]),
  ...limite("espaco", [
    ["Qual é a distância média entre a Terra e a Lua?", 384400, "quilômetros", "Daria para enfileirar todos os planetas do Sistema Solar nesse espaço."],
    ["Quantas Terras cabem dentro do Sol, mais ou menos?", 1300000, "Terras", "E o Sol é uma estrela de tamanho médio."],
    ["Quantos dias terrestres dura um único dia em Vênus?", 243, "dias", "Em Vênus, o dia é mais longo que o ano, que tem 225 dias."],
    ["Qual é a temperatura da superfície do Sol, mais ou menos?", 5500, "°C", "O centro passa de 15 milhões de graus."],
    ["Quantos minutos a luz do Sol leva para chegar à Terra?", 8, "minutos", "Se o Sol apagasse agora, a gente só ia perceber 8 minutos depois."],
    ["Quantas pessoas já pisaram na Lua?", 12, "pessoas", "Todas entre 1969 e 1972, todas americanas."],
    ["A quantos quilômetros por hora viaja a Estação Espacial Internacional?", 28000, "km/h", "Ela dá uma volta na Terra a cada 90 minutos."],
    ["Em 2025, quantas luas conhecidas tinha Saturno?", 274, "luas", "Só em março de 2025 foram anunciadas 128 luas novas."],
    ["Quantos bilhões de anos tem o universo?", 13.8, "bilhões de anos", "A Terra tem cerca de 4,5 bilhões."],
    ["Quantos anos terrestres dura um ano em Netuno?", 165, "anos", "Desde que foi descoberto, em 1846, Netuno só deu uma volta no Sol."],
    ["Quantos quilômetros de altura tem o Monte Olimpo, em Marte, o maior vulcão do Sistema Solar?", 22, "quilômetros", "Quase duas vezes e meia a altura do Everest."],
    ["Quem pesa 90 quilos na Terra pesaria quantos quilos na Lua?", 15, "quilos", "A gravidade da Lua é cerca de um sexto da nossa."],
  ]),
  ...limite("contas-da-vida", [
    ["Se alguém vive 80 anos, quantos desses anos passa dormindo, mais ou menos?", 26, "anos", "Cerca de um terço da vida."],
    ["Quantas pessoas viviam no mundo em 2025?", 8.2, "bilhões", "Em 1950 eram 2,5 bilhões."],
    ["Em 2020, quantas mensagens por dia eram enviadas no WhatsApp?", 100, "bilhões", "Dá mais de 12 mensagens por pessoa no planeta, todo dia."],
    ["Quanto pesa uma moeda de 1 real?", 7, "gramas", "Ela é feita de duas partes: o miolo prateado e o anel dourado."],
    ["Quantas vezes dá para dobrar ao meio, com a mão, uma folha de papel comum?", 7, "vezes", "Com uma folha gigante de papel especial, já chegaram a 12."],
    ["Quantos metros tem um rolo de papel higiênico comum no Brasil?", 30, "metros", "Também existem rolos de 60 metros, o dobro."],
    ["Quantas palavras uma pessoa fala por dia, em média?", 16000, "palavras", "Segundo um estudo de 2007, homens e mulheres falam mais ou menos a mesma quantidade."],
    ["Quantos quilômetros de linha dá para riscar com um único lápis comum, mais ou menos?", 56, "quilômetros", "Ou cerca de 45 mil palavras escritas."],
    ["Segundo a Sabesp, quantos litros de água gasta um banho de ducha de 15 minutos?", 135, "litros", "Com o registro fechado enquanto se ensaboa, o gasto cai bastante."],
    ["Segundo a Sabesp, quantos litros de água vão embora ao escovar os dentes por 5 minutos com a torneira aberta?", 12, "litros", "Fechando a torneira, o gasto cai para meio litro."],
  ]),
  ...limite("mundo", [
    ["Quantos metros de comprimento tinha o Titanic?", 269, "metros", "Mais de dois campos e meio de futebol enfileirados."],
    ["Qual é a altura da Torre Eiffel, contando as antenas?", 330, "metros", "No verão, com o calor, ela cresce uns 15 centímetros."],
    ["Quantos rebites seguram a Torre Eiffel?", 2500000, "rebites", "A torre é repintada à mão a cada 7 anos."],
    ["Segundo a medição oficial de 2012, quantos quilômetros tem a Muralha da China, somando todos os trechos?", 21196, "quilômetros", "E não, ela não dá para ser vista do espaço a olho nu."],
    ["Qual era a altura original da Grande Pirâmide de Gizé?", 146, "metros", "Ela foi a construção mais alta do mundo por quase 4 mil anos."],
    ["Quantos centímetros de altura tem o quadro da Mona Lisa?", 77, "centímetros", "Ao vivo, ela é bem menor do que todo mundo imagina."],
    ["Quantos metros tem a Estátua da Liberdade, do chão até a tocha?", 93, "metros", "Ela foi um presente da França e chegou aos Estados Unidos desmontada, em 350 peças."],
    ["Qual é a altura do Burj Khalifa, em Dubai, o prédio mais alto do mundo?", 828, "metros", "Lá de cima dá para ver o pôr do sol duas vezes no mesmo dia: uma do térreo e outra do topo."],
    ["Em quantos dias foi construído o Empire State Building, em Nova York?", 410, "dias", "Em média, subiam mais de quatro andares por semana."],
    ["Quantas pessoas vivem no Vaticano, mais ou menos?", 800, "pessoas", "É o menor país do mundo, menor que muito condomínio."],
  ]),
  ...limite("cultura-pop", [
    ["Quantos episódios tem a série Friends?", 236, "episódios", "Dez temporadas, de 1994 a 2004."],
    ["Quantos milhões de livros de Harry Potter já foram vendidos, mais ou menos?", 600, "milhões", "Os livros foram traduzidos para mais de 80 idiomas."],
    ["Quantos milhões de cópias o álbum Thriller, de Michael Jackson, vendeu, segundo as estimativas?", 70, "milhões", "É o álbum mais vendido da história."],
    ["Quantos milhões de dólares custou o filme Titanic, de 1997?", 200, "milhões de dólares", "Na época, foi o filme mais caro já feito. Depois, faturou mais de 2 bilhões."],
    ["Até 2023, quantos milhões de cópias do Minecraft tinham sido vendidas?", 300, "milhões", "É o jogo mais vendido da história."],
    ["Em que ano foi lançado o primeiro Super Mario Bros.?", 1985, "", "O Mario já tinha aparecido antes, em Donkey Kong, com o nome de Jumpman."],
    ["Em que ano estreou Os Simpsons como série?", 1989, "", "É a série de TV americana com roteiro mais longa da história."],
    ["Em que ano Gangnam Style virou o primeiro vídeo a passar de 1 bilhão de visualizações no YouTube?", 2012, "", "Depois, o YouTube precisou mudar o contador, que não aguentava números tão grandes."],
  ]),
  ...limite("esportes", [
    ["Quantas vezes Ayrton Senna venceu o GP de Mônaco?", 6, "vezes", "Ninguém venceu mais nas ruas de Mônaco."],
    ["Quantos passos Usain Bolt deu nos 100 metros do recorde mundial de 2009?", 41, "passos", "Cada passada dele tinha uns 2,4 metros."],
    ["Quantos quilômetros um jogador de meio-campo corre, em média, numa partida de futebol?", 11, "quilômetros", "É como correr uma prova de 10 km toda semana, com bola."],
    ["Quanto pesa uma bola oficial de futebol?", 430, "gramas", "A regra aceita de 410 a 450 gramas."],
    ["Quantos gols Marta marcou em Copas do Mundo?", 17, "gols", "É a maior artilheira da história das Copas, entre homens e mulheres."],
    ["Quantas horas durou a partida de tênis mais longa da história, Isner x Mahut, em Wimbledon 2010?", 11, "horas", "Foram três dias de jogo. O último set terminou 70 a 68."],
    ["Quantas medalhas olímpicas ganhou Michael Phelps?", 28, "medalhas", "Dessas, 23 são de ouro."],
    ["A quantos metros do chão fica o aro da cesta de basquete?", 3.05, "metros", "A altura é a mesma desde que o jogo foi inventado, em 1891."],
  ]),
];
