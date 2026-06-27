-- Schema de marketing: tabelas mkt_*

-- 1. Concorrentes monitorados
create table if not exists mkt_concorrentes (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  nome text not null,
  seguidores_texto text,
  seguidores_num integer,
  posts_count integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 2. Posts coletados por concorrente
create table if not exists mkt_posts (
  id uuid primary key default gen_random_uuid(),
  concorrente_id uuid references mkt_concorrentes(id) on delete cascade,
  data_coleta date,
  tipo text,
  titulo text,
  views integer,
  likes integer,
  comentarios integer,
  hook text,
  formato text,
  resumo_legenda text,
  hashtags text[],
  por_que_viralizou text,
  como_adaptar text,
  performance text,
  url text,
  transcricao text,
  criado_em timestamptz not null default now()
);

-- 3. Insights de marketing
create table if not exists mkt_insights (
  id uuid primary key default gen_random_uuid(),
  data date,
  insight text not null,
  criado_em timestamptz not null default now()
);

-- 4. Alertas e tendências
create table if not exists mkt_alertas (
  id uuid primary key default gen_random_uuid(),
  data date,
  titulo text not null,
  resumo text,
  fonte text,
  url text,
  como_usar_conteudo text,
  criado_em timestamptz not null default now()
);

-- 5. Roteiros gerados por IA
create table if not exists mkt_roteiros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo_original text,
  roteiro_gerado text,
  modo text,
  formato text,
  tipo_hook text,
  topico text,
  status text not null default 'rascunho',
  criado_em timestamptz not null default now()
);

-- RLS: habilitar em todas as tabelas
alter table mkt_concorrentes enable row level security;
alter table mkt_posts enable row level security;
alter table mkt_insights enable row level security;
alter table mkt_alertas enable row level security;
alter table mkt_roteiros enable row level security;

-- Políticas: acesso total para usuários autenticados
create policy "mkt_concorrentes_all" on mkt_concorrentes
  for all using (auth.uid() is not null);

create policy "mkt_posts_all" on mkt_posts
  for all using (auth.uid() is not null);

create policy "mkt_insights_all" on mkt_insights
  for all using (auth.uid() is not null);

create policy "mkt_alertas_all" on mkt_alertas
  for all using (auth.uid() is not null);

create policy "mkt_roteiros_all" on mkt_roteiros
  for all using (auth.uid() is not null);
