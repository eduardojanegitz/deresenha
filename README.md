# DeResenha

Jogos para a turma reunida. Escolhe o jogo, coloca os nomes e começa. Sem cadastro.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # regras dos jogos (vitest)
npm run typecheck
npm run build
npm run db:migrate # cria/atualiza as tabelas no Postgres (Neon)
```

Variáveis em `.env` (veja `.env.example`): `DATABASE_URL` (com pooler) e `DATABASE_URL_UNPOOLED` (migrações).

## Estrutura

```
src/
  engine/     Motores puros: reduce(state, action, rng). Mesma regra no navegador e, na etapa 4, no servidor.
              nota.ts, mimica.ts, infiltrado.ts, ranking.ts, championship.ts (+ testes)
  content/    Modelo de desafios e conteúdo inicial em pt-BR (vira seed do banco na etapa 4)
  games/      Registro de jogos + uma tela por jogo
  brand/      Monograma, assinatura animada, peças (personagens)
  ui/         Componentes de interface, movimento, sons sintetizados
  rooms/      Modo Sala: regra pura da sala (permissões, anfitrião, prazos, projeção por jogador) e cliente
  server/     Acesso ao banco (db.ts é o único ponto que conhece o Neon) e serviço de salas
  app/        Rotas (Next.js App Router) e API em app/api/rooms
db/          Migrações SQL
docs/         Direção de produto e identidade
prototipo/    Protótipo HTML da etapa 1 (referência visual)
```

Adicionar um jogo: um motor em `src/engine`, uma entrada em `src/games/registry.ts`, uma tela em
`src/games/<id>` e uma linha em `src/app/jogos/[id]/jogar/GameHost.tsx`.

## Estado do plano

| Etapa | Situação |
|---|---|
| 1. Direção e identidade | Feita (`docs/01-direcao.md`) |
| 2. Fundação visual e funcional | Feita: início, biblioteca, detalhe, configuração, componentes, movimento, temas, modo compartilhado, sons opcionais, manifesto PWA |
| 3. Jogos prioritários | Feita no modo compartilhado: Jogo da Nota (Avaliação e Nota Secreta), Mímica, Infiltrado, Ranking às Cegas |
| 4. Multiplayer real (Modo Sala) | Feita para o Jogo da Nota (Nota Secreta e Avaliação): criar sala, código/link/QR, lobby, prontidão, configuração pelo anfitrião, sincronização, nota secreta só para quem pensa, palpites escondidos até a revelação, cronômetro controlado pelo servidor, reentrada, saída, transferência e recuperação do comando, encerramento e expiração (6 h). Os outros jogos ainda são só no modo compartilhado. |
| 5. Recursos adicionais | Não iniciada. Normalização da Noite de Jogos já existe e é testada (`championship.ts`). |

Também ainda não existem: painel administrativo, temas personalizados, service worker (offline).
