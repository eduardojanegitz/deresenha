-- Conteúdo dos jogos e painel administrativo.

create table if not exists themes (
  id          text primary key,
  label       text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um desafio pertence a um jogo e a um tema. O formato do conteúdo varia por jogo e fica em
-- `data` (texto do Jogo da Nota/Mímica, par de palavras do Infiltrado, lista do Ranking).
-- `origin` prepara temas da comunidade e moderação no futuro.
create table if not exists challenges (
  id          text primary key,
  game        text not null,
  theme       text not null references themes (id) on update cascade,
  difficulty  text not null default 'medio' check (difficulty in ('facil', 'medio', 'dificil')),
  min_age     integer check (min_age between 0 and 21),
  status      text not null default 'draft' check (status in ('published', 'draft', 'archived')),
  lang        text not null default 'pt-BR',
  data        jsonb not null,
  origin      text not null default 'oficial',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists challenges_game_status_idx on challenges (game, status);
create index if not exists challenges_theme_idx on challenges (theme);

-- Configuração de cada jogo editável pelo painel.
create table if not exists game_settings (
  game            text primary key,
  enabled         boolean not null default true,
  default_rounds  integer not null default 3 check (default_rounds between 1 and 20),
  updated_at      timestamptz not null default now()
);

-- Tentativas de login no painel, para bloquear força bruta entre todas as instâncias.
create table if not exists admin_login_attempts (
  id      bigserial primary key,
  ip      text not null,
  ok      boolean not null,
  at      timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_at_idx on admin_login_attempts (ip, at);
