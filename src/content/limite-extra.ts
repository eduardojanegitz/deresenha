import type { LimiteChallenge } from "./types";

/**
 * Segunda leva do Jogo do Limite. Mesmas regras da primeira (./limite.ts): valores de fontes
 * conhecidas, ano na pergunta quando o número muda com o tempo, "cerca de" quando é estimativa.
 * Os IDs usam o sufixo "b" para não colidir com a primeira leva.
 */
type Row = [string, number, string, string?];
const base = { status: "published" as const, lang: "pt-BR" as const, difficulty: "dificil" as const };
const limite = (theme: string, rows: Row[]): LimiteChallenge[] =>
  rows.map(([question, answer, unit, fact], i) => ({ ...base, id: `limite-${theme}-b${i + 1}`, game: "limite", theme, question, answer, unit, ...(fact ? { fact } : {}) }));

export const LIMITE_EXTRA: LimiteChallenge[] = [
  ...limite("recordes", [
    ["Qual foi a velocidade máxima de Usain Bolt no recorde mundial dos 100 metros, em 2009?", 44.72, "km/h", "Mais rápido que muito carro andando na cidade."],
    ["Qual é o recorde mundial do salto em altura masculino, de Javier Sotomayor, em 1993?", 2.45, "metros", "O recorde dura há mais de 30 anos."],
    ["Qual é o recorde mundial do salto em distância masculino, de Mike Powell, em 1991?", 8.95, "metros", "Ele bateu o recorde que Bob Beamon segurava havia 23 anos."],
    ["Quantos anos viveu Bluey, considerado o cachorro mais velho com idade comprovada?", 29, "anos", "Era um boiadeiro australiano e trabalhou com gado por quase 20 anos."],
    ["Quantos anos viveu Creme Puff, a gata mais velha já registrada?", 38, "anos", "Em idade de gente, seria como passar dos 160 anos."],
    ["Em 1964, o estudante Randy Gardner ficou acordado de propósito por quantos dias seguidos?", 11, "dias", "O Guinness parou de registrar esse tipo de recorde por ser perigoso."],
  ]),
  ...limite("corpo", [
    ["Quantos dentes tem um adulto, contando os sisos?", 32, "dentes", "Muita gente nunca chega a ter os quatro sisos."],
    ["Qual é a temperatura normal do corpo humano, mais ou menos?", 36.5, "°C", "Ela varia um pouco ao longo do dia: é mais baixa de madrugada."],
    ["Até quantos metros por segundo um impulso nervoso pode viajar?", 120, "metros por segundo", "Passa de 400 km/h."],
    ["Quantos litros de ar um adulto respira por dia, mais ou menos?", 11000, "litros", "Dá para encher umas 40 banheiras."],
    ["A cada quantos dias, mais ou menos, a camada de fora da pele se renova?", 28, "dias", "A poeira de casa tem bastante pele morta."],
    ["Quantos milímetros a unha da mão cresce por mês, mais ou menos?", 3, "milímetros", "A unha do pé cresce bem mais devagar."],
    ["Quantos bilhões de neurônios tem o cérebro humano, segundo as estimativas atuais?", 86, "bilhões", "A estimativa é de uma pesquisadora brasileira, Suzana Herculano-Houzel."],
  ]),
  ...limite("bichos", [
    ["Qual é a velocidade máxima de um guepardo, mais ou menos?", 110, "km/h", "Mas ele só aguenta essa velocidade por uns 30 segundos."],
    ["Qual é a altura de uma girafa macho adulta, mais ou menos?", 5.5, "metros", "Só o pescoço tem perto de 2 metros."],
    ["Quanto pesa um elefante-africano macho adulto, mais ou menos?", 6000, "quilos", "É o maior animal terrestre do planeta."],
    ["Qual é a altura de um pinguim-imperador, o maior pinguim que existe?", 1.1, "metros", "É o macho que choca o ovo, em pé, no inverno da Antártida."],
    ["Até quantas vezes o próprio peso uma formiga consegue carregar?", 50, "vezes", "É como uma pessoa levantar um carro."],
    ["A que velocidade o falcão-peregrino chega no mergulho de caça?", 390, "km/h", "É o animal mais rápido do planeta."],
  ]),
  ...limite("comilanca", [
    ["Quantas calorias tem 1 grama de gordura?", 9, "calorias", "Mais que o dobro de 1 grama de açúcar, que tem 4."],
    ["Quantos mililitros tem uma garrafa de vinho padrão?", 750, "ml", "Dá umas cinco taças."],
    ["A que temperatura, mais ou menos, a manteiga de cacau do chocolate começa a derreter?", 34, "°C", "Por isso o chocolate derrete na boca, mas não na mão (se for rápido)."],
    ["Quantos anos tinham os potes de mel ainda comestível achados em túmulos do Egito, mais ou menos?", 3000, "anos", "O mel quase não estraga: tem pouca água e é ácido."],
    ["Quantas unidades Scoville tem a Pepper X, reconhecida em 2023 como a pimenta mais ardida do mundo?", 2690000, "unidades Scoville", "Ela tirou o título da Carolina Reaper."],
    ["Quantos por cento de um tomate é água, mais ou menos?", 95, "%", "E, para a botânica, tomate é fruta."],
  ]),
  ...limite("brasil-numeros", [
    ["Quantos milhões de pessoas o Censo de 2022 contou no Brasil?", 203, "milhões", "É o sétimo país mais populoso do mundo."],
    ["Qual é a área do Brasil?", 8.5, "milhões de km²", "É o quinto maior país do mundo."],
    ["Com quantos países o Brasil faz fronteira?", 10, "países", "Só Chile e Equador, na América do Sul, não fazem fronteira com o Brasil."],
    ["Quantos fusos horários tem o Brasil?", 4, "fusos", "Fernando de Noronha fica uma hora à frente de Brasília."],
    ["Quantos quilômetros tem a fronteira terrestre do Brasil?", 16886, "quilômetros", "É uma das maiores fronteiras terrestres do mundo."],
    ["Qual é a altura do Pão de Açúcar, no Rio de Janeiro?", 396, "metros", "O bondinho funciona desde 1912."],
    ["Quantos milhões de pessoas vivem na cidade de São Paulo, segundo o Censo de 2022?", 11.45, "milhões", "É a cidade mais populosa das Américas, sem contar a região metropolitana."],
  ]),
  ...limite("espaco", [
    ["Qual é o diâmetro da Lua?", 3474, "quilômetros", "Ela caberia, de ponta a ponta, entre o Brasil e a África."],
    ["Qual é a temperatura média na superfície de Vênus?", 465, "°C", "É o planeta mais quente do Sistema Solar, mesmo não sendo o mais perto do Sol."],
    ["Quantas Terras cabem dentro de Júpiter, mais ou menos?", 1300, "Terras", "Júpiter sozinho tem mais massa que todos os outros planetas juntos."],
    ["Quantos anos a luz leva para chegar da estrela mais próxima do Sol, a Proxima Centauri?", 4.2, "anos", "A luz que você vê dela hoje saiu de lá há mais de quatro anos."],
    ["Quantos dias durou a missão Apollo 11, ida e volta?", 8, "dias", "Os astronautas ficaram só cerca de duas horas e meia andando na Lua."],
    ["Qual é a distância média entre a Terra e o Sol?", 150, "milhões de km", "Um avião levaria uns 17 anos para chegar lá."],
    ["Quantos planetas anões são reconhecidos oficialmente no Sistema Solar?", 5, "planetas anões", "Plutão virou planeta anão em 2006."],
  ]),
  ...limite("contas-da-vida", [
    ["Quantas horas tem um ano que não é bissexto?", 8760, "horas"],
    ["Quantos segundos tem um dia?", 86400, "segundos"],
    ["Quantos dias de vida tem uma pessoa no dia em que completa 30 anos, mais ou menos?", 10957, "dias", "Contando os anos bissextos no meio do caminho."],
    ["Quantos minutos tem uma semana?", 10080, "minutos"],
    ["Quantos quilômetros tem a volta da Terra pela linha do Equador?", 40075, "quilômetros", "Andando 8 horas por dia, sem parar, levaria quase um ano e meio."],
  ]),
  ...limite("mundo", [
    ["Qual é a altura do Monte Everest, na medição de 2020?", 8849, "metros", "A medição foi feita junto pela China e pelo Nepal."],
    ["Quantos quilômetros tem o Canal do Panamá, mais ou menos?", 82, "quilômetros", "Um navio leva de 8 a 10 horas para atravessar."],
    ["Qual é a altura da torre do Big Ben, em Londres?", 96, "metros", "Big Ben é, na verdade, o nome do sino, não da torre."],
    ["Quantas pessoas cabiam no Coliseu de Roma, mais ou menos?", 50000, "pessoas", "Ele foi inaugurado no ano 80, com 100 dias de jogos."],
    ["Quantos países fazem parte da ONU?", 193, "países", "O Vaticano e a Palestina são observadores, sem voto."],
    ["Quantas línguas são faladas no mundo hoje, mais ou menos?", 7000, "línguas", "Quase metade delas corre risco de desaparecer."],
    ["Quantos quilômetros tem o rio Nilo, mais ou menos?", 6650, "quilômetros", "Ele atravessa 11 países africanos."],
  ]),
  ...limite("cultura-pop", [
    ["Em que ano foi lançado o primeiro Toy Story?", 1995, "", "Foi o primeiro longa-metragem feito todo em computador."],
    ["Quantos filmes tem a saga principal de Star Wars, a da família Skywalker?", 9, "filmes"],
    ["Em que ano estreou o primeiro filme de Harry Potter?", 2001, ""],
    ["Quantos livros tem a série principal de Harry Potter?", 7, "livros"],
    ["Em que ano o YouTube foi lançado?", 2005, "", "O primeiro vídeo tem 19 segundos e mostra um elefante num zoológico."],
    ["Em que ano o Pac-Man foi lançado?", 1980, ""],
    ["Quantos bilhões de dólares o filme Avatar, de 2009, faturou nos cinemas?", 2.9, "bilhões de dólares", "É a maior bilheteria da história do cinema."],
  ]),
  ...limite("esportes", [
    ["Qual é o comprimento de uma piscina olímpica?", 50, "metros"],
    ["Quanto pesa uma bola oficial de basquete, mais ou menos?", 600, "gramas"],
    ["A quantos metros do gol fica a marca do pênalti?", 11, "metros"],
    ["Qual é a altura da rede no vôlei masculino?", 2.43, "metros", "No feminino, a rede fica a 2,24 metros."],
    ["Quanto pesa o martelo do arremesso de martelo masculino?", 7.26, "quilos", "O mesmo peso do arremesso de peso."],
    ["Quantas medalhas de ouro o Brasil ganhou nos Jogos de Paris 2024?", 3, "medalhas", "Beatriz Souza no judô, Rebeca Andrade no solo e Ana Patrícia e Duda no vôlei de praia."],
    ["Quantos gols Pelé marcou em Copas do Mundo?", 12, "gols"],
  ]),
  ...limite("tecnologia", [
    ["Em que ano foi lançado o primeiro iPhone?", 2007, ""],
    ["Em que ano o Google foi fundado?", 1998, "", "O nome vem de googol, o número 1 seguido de 100 zeros."],
    ["Em que ano o Facebook foi criado?", 2004, ""],
    ["Quantos caracteres cabiam num tuíte quando o Twitter foi criado?", 140, "caracteres", "O limite dobrou para 280 em 2017."],
    ["Quanto pesava o primeiro celular vendido ao público, o Motorola DynaTAC, de 1983?", 790, "gramas", "A bateria durava uns 30 minutos de conversa."],
    ["Quantos megabytes cabiam num disquete comum de 3,5 polegadas?", 1.44, "MB", "Uma foto de celular de hoje não caberia em um só."],
    ["Em que ano foi enviado o primeiro SMS?", 1992, "", "A mensagem dizia 'Merry Christmas' e foi mandada de um computador."],
    ["Em que ano o WhatsApp foi lançado?", 2009, ""],
    ["Quantas toneladas pesava o ENIAC, um dos primeiros computadores, de 1946?", 27, "toneladas", "Ocupava uma sala inteira e tinha cerca de 18 mil válvulas."],
  ]),
];
