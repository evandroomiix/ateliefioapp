-- 01_tabelas.sql · AteliêFio · Tabelas e índices
-- Execute este script PRIMEIRO no SQL Editor do Supabase.

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  email text,
  avatar_url text,
  criado_em timestamptz not null default now()
);

create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criada_por uuid references auth.users (id) on delete set null,
  criada_em timestamptz not null default now()
);

create table if not exists public.membros_loja (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'usuario'
    check (papel in ('administrador', 'gerente', 'usuario')),
  criado_em timestamptz not null default now(),
  primary key (loja_id, user_id)
);

create table if not exists public.convites_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas (id) on delete cascade,
  email text not null,
  papel text not null default 'usuario'
    check (papel in ('administrador', 'gerente', 'usuario')),
  status text not null default 'pendente'
    check (status in ('pendente', 'aceito', 'cancelado')),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (loja_id, email)
);

alter table public.materiais
  add column if not exists loja_id uuid references public.lojas (id) on delete cascade;

alter table public.pecas_projetos
  add column if not exists loja_id uuid references public.lojas (id) on delete cascade;

alter table public.pedidos_producao
  add column if not exists loja_id uuid references public.lojas (id) on delete cascade;

create index if not exists ateliefio_materiais_loja_idx
  on public.materiais (loja_id);
create index if not exists ateliefio_pecas_loja_idx
  on public.pecas_projetos (loja_id);
create index if not exists ateliefio_pedidos_loja_idx
  on public.pedidos_producao (loja_id);
create index if not exists ateliefio_membros_user_idx
  on public.membros_loja (user_id);
create index if not exists ateliefio_convites_email_idx
  on public.convites_loja (lower(email), status);
