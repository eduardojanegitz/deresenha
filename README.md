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
npm run db:seed    # copia o conteúdo inicial para o banco (não sobrescreve edições)
npm run admin:password  # gera a senha do painel (hash + segredo de sessão)
```

Variáveis em `.env` (veja `.env.example`): `DATABASE_URL` (com pooler), `DATABASE_URL_UNPOOLED` (migrações), `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET` (painel).

## Painel administrativo

Em `/admin`. Login por senha (hash scrypt na variável de ambiente), sessão em cookie assinado (HttpOnly, SameSite=Strict, 8 h), bloqueio depois de 5 senhas erradas em 15 minutos por IP (registrado no banco). Permite criar e editar desafios dos quatro jogos, publicar, despublicar e arquivar, criar, renomear e desativar temas, pausar jogos e mudar as rodadas padrão, e ver as quantidades por jogo e tema. O que é salvo vale nos jogos em até 30 segundos; se o banco cair, os jogos usam o conteúdo embutido.

## Estrutura

```
src/
  engine/     Motores puros: reduce(state, action, rng). Mesma regra no navegador e, na etapa 4, no servidor.
              nota.ts, mimica.ts, infiltrado.ts, ranking.ts, championship.ts (+ testes)
  content/    Modelo de desafios, conteúdo inicial em pt-BR (seed do banco e reserva offline)
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
| 4. Multiplayer real (Modo Sala) | Feita para o Jogo da Nota (Nota Secreta e Avaliação) e o Infiltrado: criar sala, código/link/QR, lobby, prontidão, configuração pelo anfitrião, sincronização, nota secreta só para quem pensa, palpites escondidos até a revelação, cronômetro controlado pelo servidor, reentrada, saída, transferência e recuperação do comando, encerramento e expiração (6 h). No Infiltrado, cada celular recebe só a própria palavra e o voto é secreto no aparelho. Limite de tentativas por IP nas rotas (em memória, por instância). Depois entraram o Quiz Relâmpago e o Você Prefere? (escolha secreta no próprio celular, revelação automática quando todos escolhem). Mímica, Ranking e Quem Sou Eu? ainda são só no modo compartilhado. |
| 5. Recursos adicionais | Feita: Você Prefere? (jogo novo), temas personalizados da turma (guardados no aparelho, para os cinco jogos), Noite de Jogos (sequência de jogos com pontuação normalizada de 0 a 100 por jogo, com ou sem classificação), histórico e estatísticas no aparelho, compartilhar o resultado como imagem. Depois: Quem Sou Eu? (modo compartilhado, com temas da turma e na Noite de Jogos) e Quiz Relâmpago (só no Modo Sala: tempo de resposta medido pelo servidor, alternativa correta enviada só depois que a pergunta fecha, pontos por acerto e rapidez). Ainda não: Adivinhe a Música (depende de um catálogo de áudios licenciados), compartilhar temas entre turmas. |

Também ainda não existem: service worker (offline), contas de administrador individuais, contas de jogador (histórico e temas sincronizados entre aparelhos), Modo Sala para Mímica, Ranking e Você Prefere.
