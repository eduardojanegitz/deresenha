# DeResenha — Etapa 1: direção de produto e identidade

> Documento de exploração. Nada aqui é definitivo até a sua avaliação visual do protótipo
> (`prototipo/index.html`) e das direções (`prototipo/direcoes.html`).

---

## 1. O que o briefing realmente pede

Lendo as 27 seções, o produto se resume a cinco princípios:

1. **Do "abri" ao "tô jogando" em menos de um minuto.** Sem cadastro, sem tela de onboarding, sem
   configuração obrigatória além dos nomes. Todo o resto tem um padrão sensato.
2. **O celular é um objeto da mesa, não uma tela pessoal.** No modo compartilhado ele passa de mão
   em mão, fica no centro, é lido de longe. Isso pede tipografia grande, botões de dedão e
   fluxos explícitos de "passa o celular / só você olha".
3. **O segredo é sagrado.** Nota secreta, palavra do infiltrado e votos são o coração dos jogos.
   No modo compartilhado o segredo é protegido pelo fluxo (segurar para ver, devolver). No modo
   sala, pelo servidor: o cliente nunca recebe o que não pode ver.
4. **A revelação é o produto.** Os jogos são simples; o que fica na memória é o instante em que a
   nota aparece, os palpites caem no placar e alguém grita. O motion design existe para esse
   momento.
5. **Um sistema, muitos jogos.** Cada jogo tem cor e personagem próprios, mas usa as mesmas peças
   de interface, o mesmo motor de rodadas e o mesmo banco de temas.

## 2. Três direções artísticas

Os painéis visuais estão em `prototipo/direcoes.html`. Resumo:

### A — "Peças" (recomendada)

**Conceito:** o DeResenha é a caixa de jogos da turma. Tudo é feito de peças de tabuleiro que
ganharam vida: fichas, pinos, dados, sobre uma mesa de feltro.

- **Linguagem visual:** formas primitivas sólidas (círculo, quadrado arredondado, triângulo,
  meia-lua, cápsula), sempre com uma "espessura" colorida embaixo — como uma ficha de verdade.
  Nada de sombra cinza: a profundidade é a própria peça.
- **Cor:** verde-feltro como cor da casa, rosa-chiclete e gema como acompanhamento, mais céu,
  lilás e menta para as peças. Fundo "giz", frio e limpo. As revelações acontecem sobre feltro
  escuro (a mesa à noite).
- **Tipografia:** M PLUS Rounded 1c (900) nos títulos e números — redonda sem ser infantil, com
  desenho de sinalização japonesa; Onest na interface — grotesca contemporânea, muito legível.
- **Formas:** traço monolinear de pontas redondas, raios generosos, hierarquia por tamanho e cor.
- **Movimento:** físico. Peças caem, quicam e encaixam; botões afundam a própria espessura;
  cartas viram como fichas.
- **DR:** uma única haste compartilhada — o lado direito do D é a haste do R. Duas peças
  encaixadas.

### B — "Placar"

**Conceito:** programa de auditório na madrugada. Placar de estádio, letreiro de LED, plaquinhas
de split-flap.

- **Cor:** noite azul-tinta, holofote amarelo, grama, placa vermelha. Escura por padrão.
- **Tipografia:** Big Shoulders Display (condensada, 900) + Barlow.
- **Formas:** retângulos com cantos chanfrados, matriz de pontos, divisória horizontal das placas.
- **Movimento:** placas virando, contadores girando, varredura de luz.
- **DR:** duas plaquinhas de split-flap; a animação vira as placas e revela as letras restantes.
- **Por que não:** contradiz a preferência por interface clara, puxa para competição esportiva e
  fica fria para jogos subjetivos como a Avaliação.

### C — "Riso"

**Conceito:** filipeta de festa feita em risografia. Papel recortado, sobreposição de rosa fluor
e azul, registro desalinhado de propósito.

- **Cor:** rosa fluor, azul riso, amarelo, papel.
- **Tipografia:** Rubik Mono One + Rethink Sans; letreiros recortados à mão.
- **Formas:** recortes irregulares, adesivos, granulação.
- **Movimento:** stop-motion a 12 quadros por segundo, papéis deslizando.
- **DR:** o D é recortado do papel e o R é montado com a sobra do recorte (o miolo do D).
- **Por que não:** textura e stop-motion custam caro em celular intermediário, o contraste das
  sobreposições é difícil de manter acessível e a estética cansa rápido num app de uso repetido.

### Por que "Peças"

- **Nasce do assunto.** Noite de jogos tem mesa, fichas e peças. Não é uma estética emprestada.
- **Um único vocabulário para tudo.** O logo, os personagens, os botões e os cards usam as mesmas
  formas e a mesma espessura. É isso que faz componentes "parecerem do mesmo produto".
- **Escala para oito jogos.** Cada jogo ganha uma cor e uma peça; o sistema não muda.
- **Dois registros de movimento sem contradição:** navegação suave (peças deslizando) e jogo
  impactante (peças caindo e quicando).
- **Barato de animar.** Primitivas SVG e `transform`/`opacity`; nenhum filtro, nenhuma textura.
- **Herda o melhor de "Placar"** nas telas de segredo e revelação, que ficam em feltro escuro.

## 3. Sistema visual (direção A)

### Paleta

| Papel | Nome | Hex | Uso |
|---|---|---|---|
| Principal | Feltro | `#0F6B52` | Ações principais, marca. Texto branco: 6,5:1 |
| Principal (espessura) | Feltro escuro | `#0A4D3B` | Base dos botões principais |
| Secundária | Chiclete | `#FF6F91` | Peça Bolota, Mímica, destaques sociais |
| Destaque | Gema | `#FFC23D` | Notas, foco do teclado, Jogo da Nota |
| Peças | Céu `#6EC1FF`, Lilás `#B7A4FF`, Menta `#43C59E` | | Personagens e jogos |
| Fundo | Giz | `#F1F4EF` | Fundo geral (frio, não creme) |
| Superfície | Branco | `#FFFFFF` | Cards, campos |
| Mesa à noite | Noite | `#0B3B2E` | Telas de segredo e revelação |
| Texto principal | Tinta | `#14241E` | 15:1 sobre Giz |
| Texto secundário | Tinta 2 | `#4B5E56` | 6,2:1 sobre Giz |
| Sucesso | `#23A05B` | | Acertos (sempre com ícone ou texto) |
| Erro | `#E2434B` | | Erros de validação, tempo acabando |
| Aviso | `#E8890C` | | Avisos não bloqueantes |

Cores das peças nunca carregam texto branco; texto sobre elas é sempre Tinta.

### Tipografia

- **M PLUS Rounded 1c** 800/900: títulos, números das notas, botões.
- **Onest** 400–700: textos, rótulos, campos.
- Escala: 14 · 17 · 21 · 27 · 34 · 44 · 56 (+ números de revelação até 180px).
- Desafios (o texto do tema) nunca abaixo de 27px no celular.

### Componentes

- **Botão-peça:** cor sólida + 5px de espessura na mesma família de cor. No toque, desce os 5px.
  Desabilitado perde a cor, não só a opacidade.
- **Card de jogo:** área de arte em tom claro da cor do jogo, peça do jogo, texto em superfície
  branca. Jogos que ainda não existem mostram a peça **dormindo**, nunca um card falso.
- **Chips:** seleção vira Tinta sólida — sem depender só de cor.
- **Teclado de notas:** 0–10 em botões-peça grandes, sempre na mesma posição.
- **Foco:** contorno Gema de 3px com afastamento — visível sobre claro e escuro.

## 4. Monograma DR

**Construção:** traço único de 18 unidades em uma caixa de 100 de altura, pontas e junções
redondas. O D é uma haste, uma barra superior e dois arcos de raio 32 que terminam num trecho
reto. Esse trecho reto **é** a haste do R. O R completa com uma barriga (semicírculo de raio 21)
e uma perna diagonal.

- Funciona em uma cor (é só traço), em 16px (os dois miolos continuam abertos) e dentro de um
  quadrado arredondado como favicon e ícone de PWA (`prototipo/favicon.svg`).
- O pequeno "dente" no topo, onde o arco do D encontra a haste do R, é a assinatura do desenho.

**Animação de assinatura (1,7 s):**

1. O monograma surge com um encaixe elástico (0–420 ms).
2. A perna do R dá um "chute" curto (380–800 ms) — o gesto que dá personalidade.
3. O R se desencaixa e desliza para a direita; o conjunto se recentraliza (700–1320 ms). O D
   mantém o próprio trecho reto e continua sendo um D.
4. O "e" nasce no espaço aberto entre D e R (820–1280 ms).
5. "esenha" sai de trás do R, letra a letra (1000–1700 ms).

Todas as letras do logotipo são desenhadas com o mesmo traço do monograma — por isso a
transformação é tipográfica e não uma troca de imagens. Com `prefers-reduced-motion`, o
logotipo aparece pronto com um fade de 250 ms.

## 5. Linguagem de movimento

| Nome | Quando | Duração / curva |
|---|---|---|
| Deslize | Troca de tela | 320 ms, `cubic-bezier(.22,1,.36,1)`, ≤16px + opacidade |
| Encaixe | Card vira tela, peça entra no lugar | 420 ms, `cubic-bezier(.34,1.56,.64,1)` |
| Afundar | Toque em botão | 90 ms, desce a espessura |
| Suspense | Antes de revelar número | 1,2–1,6 s, desaceleração em degraus |
| Queda | Palpites caindo no placar | 500 ms por peça, 180 ms entre peças |
| Piscar | Peças em espera | só em telas paradas, a cada 5–7 s |

Regras: só `transform` e `opacity`; nada em loop pesado; nenhuma animação bloqueia um botão;
movimento reduzido remove deslocamentos e mantém só mudanças de opacidade.

## 6. Personagens — "as peças"

| Peça | Forma | Cor | Função |
|---|---|---|---|
| Bolota | círculo | Chiclete | Recebe a turma: entradas, lobby, início de rodada |
| Tijolo | quadrado | Gema | O juiz: notas, placares, resultados |
| Pino | triângulo | Lilás | O desconfiado: segredos, Infiltrado, votos |
| Meia-Lua | meia-lua | Céu | A dramática: espia antes das revelações |
| Cápsula | cápsula | Menta | A animada: acertos e comemorações |

Expressões compartilhadas: neutra, feliz, surpresa, desconfiada, triste, dormindo. Olhos em
pílula vertical (a marca registrada da família), boca em um traço. Cada jogador recebe uma peça.

## 7. Estrutura de telas

```
Início ─┬─ Jogos (biblioteca, filtros) ── Detalhe do jogo ── Configurar ── Partida ── Resultado
        ├─ Entrar numa sala (Etapa 4)                          │
        └─ Marca (sistema visual)                               └─ fases por jogo:
                                                                   rodada → segredo → resposta
                                                                   → palpites → revelação → placar
```

## 8. O que o protótipo tem e o que não tem

**Funciona de verdade:** início com animação de assinatura, biblioteca com filtros, detalhe do
Jogo da Nota, configuração (jogadores, temas, rodadas, tempo, pontuação), partida completa nos
dois modos — Nota Secreta e Avaliação — no modo compartilhado, com revelação, placar e resultado.

**Ainda não existe (e a interface diz isso):** Modo Sala, Mímica, Infiltrado, Ranking às Cegas,
os jogos "em breve", sons, painel administrativo. O protótipo é HTML/JS puro para avaliação
visual; a implementação definitiva será em Next.js + TypeScript + Motion + Supabase, conforme a
Etapa 2 em diante.
