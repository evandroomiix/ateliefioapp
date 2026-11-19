-- ============================================================================
-- AteliêFio · Login Google + múltiplas lojas + papéis
-- ============================================================================
-- Execute este script no SQL Editor do Supabase (depois de configurar o
-- provider Google em Authentication > Providers).
--
-- O script é idempotente: pode ser executado mais de uma vez.
--
-- Papéis:
--   administrador -> tudo, inclusive equipe, convites e exclusões
--   gerente       -> cadastros, ajustes, exclusões e operação
--   usuario       -> consulta e operação (pedidos, baixas de estoque)
-- ============================================================================

-- 1. Tabelas de loja, perfil, vínculo e convite -----------------------------

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

-- 2. Vínculo dos dados com a loja -------------------------------------------

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

-- 3. Funções auxiliares de permissão ----------------------------------------

create or replace function public.is_membro(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membros_loja
    where loja_id = p_loja
      and user_id = auth.uid()
  );
$$;

create or replace function public.papel_na_loja(p_loja uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel
  from public.membros_loja
  where loja_id = p_loja
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.pode_gerenciar(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.papel_na_loja(p_loja) in ('administrador', 'gerente'), false);
$$;

create or replace function public.is_admin(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.papel_na_loja(p_loja) = 'administrador', false);
$$;

create or replace function public.mesma_loja(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membros_loja a
    join public.membros_loja b on b.loja_id = a.loja_id
    where a.user_id = auth.uid()
      and b.user_id = p_user
  );
$$;

-- 4. Criação automática de perfil + loja no primeiro login ------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_loja uuid;
begin
  v_nome := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, 'atelie'), '@', 1)
  );

  insert into public.perfis (id, nome, email, avatar_url)
  values (
    new.id,
    v_nome,
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email,
        avatar_url = coalesce(excluded.avatar_url, public.perfis.avatar_url);

  if not exists (select 1 from public.membros_loja where user_id = new.id) then
    insert into public.lojas (nome, criada_por)
    values ('Ateliê de ' || v_nome, new.id)
    returning id into v_loja;

    insert into public.membros_loja (loja_id, user_id, papel)
    values (v_loja, new.id, 'administrador');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. RPCs -------------------------------------------------------------------

-- Cria uma nova loja para o usuário logado (ele entra como administrador).
create or replace function public.criar_loja(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para criar uma loja.';
  end if;

  insert into public.lojas (nome, criada_por)
  values (coalesce(nullif(trim(p_nome), ''), 'Meu ateliê'), auth.uid())
  returning id into v_loja;

  insert into public.membros_loja (loja_id, user_id, papel)
  values (v_loja, auth.uid(), 'administrador');

  return v_loja;
end;
$$;

-- Aceita automaticamente os convites pendentes para o e-mail do usuário.
create or replace function public.resgatar_convites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_total integer := 0;
  r record;
begin
  if auth.uid() is null then
    return 0;
  end if;

  v_email := lower(coalesce(auth.email(), ''));
  if v_email = '' then
    return 0;
  end if;

  for r in
    select *
    from public.convites_loja
    where lower(email) = v_email
      and status = 'pendente'
  loop
    insert into public.membros_loja (loja_id, user_id, papel)
    values (r.loja_id, auth.uid(), r.papel)
    on conflict (loja_id, user_id) do update
      set papel = excluded.papel;

    update public.convites_loja
      set status = 'aceito'
      where id = r.id;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

grant execute on function public.criar_loja(text) to authenticated;
grant execute on function public.resgatar_convites() to authenticated;

-- 6. RLS das novas tabelas --------------------------------------------------

alter table public.perfis enable row level security;
alter table public.lojas enable row level security;
alter table public.membros_loja enable row level security;
alter table public.convites_loja enable row level security;

drop policy if exists "perfis_select" on public.perfis;
create policy "perfis_select"
  on public.perfis for select
  to authenticated
  using (id = auth.uid() or public.mesma_loja(id));

drop policy if exists "perfis_update" on public.perfis;
create policy "perfis_update"
  on public.perfis for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "lojas_select" on public.lojas;
create policy "lojas_select"
  on public.lojas for select
  to authenticated
  using (public.is_membro(id));

drop policy if exists "lojas_update" on public.lojas;
create policy "lojas_update"
  on public.lojas for update
  to authenticated
  using (public.is_admin(id))
  with check (public.is_admin(id));

drop policy if exists "membros_select" on public.membros_loja;
create policy "membros_select"
  on public.membros_loja for select
  to authenticated
  using (public.is_membro(loja_id));

drop policy if exists "membros_insert" on public.membros_loja;
create policy "membros_insert"
  on public.membros_loja for insert
  to authenticated
  with check (public.is_admin(loja_id));

drop policy if exists "membros_update" on public.membros_loja;
create policy "membros_update"
  on public.membros_loja for update
  to authenticated
  using (public.is_admin(loja_id))
  with check (public.is_admin(loja_id));

drop policy if exists "membros_delete" on public.membros_loja;
create policy "membros_delete"
  on public.membros_loja for delete
  to authenticated
  using (public.is_admin(loja_id));

drop policy if exists "convites_select" on public.convites_loja;
create policy "convites_select"
  on public.convites_loja for select
  to authenticated
  using (
    public.is_admin(loja_id)
    or lower(email) = lower(coalesce(auth.email(), ''))
  );

drop policy if exists "convites_insert" on public.convites_loja;
create policy "convites_insert"
  on public.convites_loja for insert
  to authenticated
  with check (public.is_admin(loja_id));

drop policy if exists "convites_update" on public.convites_loja;
create policy "convites_update"
  on public.convites_loja for update
  to authenticated
  using (public.is_admin(loja_id))
  with check (public.is_admin(loja_id));

drop policy if exists "convites_delete" on public.convites_loja;
create policy "convites_delete"
  on public.convites_loja for delete
  to authenticated
  using (public.is_admin(loja_id));

-- 7. RLS das tabelas de dados ----------------------------------------------

alter table public.materiais enable row level security;
alter table public.pecas_projetos enable row level security;
alter table public.peca_materiais enable row level security;
alter table public.pedidos_producao enable row level security;
alter table public.presets_fios enable row level security;

-- Remove as políticas antigas de acesso público.
drop policy if exists "ateliefio_materiais_all" on public.materiais;
drop policy if exists "ateliefio_pecas_all" on public.pecas_projetos;
drop policy if exists "ateliefio_peca_materiais_all" on public.peca_materiais;
drop policy if exists "ateliefio_pedidos_all" on public.pedidos_producao;

drop policy if exists "materiais_select" on public.materiais;
create policy "materiais_select"
  on public.materiais for select
  to authenticated
  using (public.is_membro(loja_id));

drop policy if exists "materiais_insert" on public.materiais;
create policy "materiais_insert"
  on public.materiais for insert
  to authenticated
  with check (public.pode_gerenciar(loja_id));

-- Atualização liberada para membros porque a baixa de estoque altera o saldo.
drop policy if exists "materiais_update" on public.materiais;
create policy "materiais_update"
  on public.materiais for update
  to authenticated
  using (public.is_membro(loja_id))
  with check (public.is_membro(loja_id));

drop policy if exists "materiais_delete" on public.materiais;
create policy "materiais_delete"
  on public.materiais for delete
  to authenticated
  using (public.pode_gerenciar(loja_id));

drop policy if exists "pecas_select" on public.pecas_projetos;
create policy "pecas_select"
  on public.pecas_projetos for select
  to authenticated
  using (public.is_membro(loja_id));

drop policy if exists "pecas_insert" on public.pecas_projetos;
create policy "pecas_insert"
  on public.pecas_projetos for insert
  to authenticated
  with check (public.pode_gerenciar(loja_id));

drop policy if exists "pecas_update" on public.pecas_projetos;
create policy "pecas_update"
  on public.pecas_projetos for update
  to authenticated
  using (public.pode_gerenciar(loja_id))
  with check (public.pode_gerenciar(loja_id));

drop policy if exists "pecas_delete" on public.pecas_projetos;
create policy "pecas_delete"
  on public.pecas_projetos for delete
  to authenticated
  using (public.pode_gerenciar(loja_id));

drop policy if exists "peca_materiais_select" on public.peca_materiais;
create policy "peca_materiais_select"
  on public.peca_materiais for select
  to authenticated
  using (
    exists (
      select 1 from public.pecas_projetos p
      where p.id = peca_materiais.peca_id
        and public.is_membro(p.loja_id)
    )
  );

drop policy if exists "peca_materiais_insert" on public.peca_materiais;
create policy "peca_materiais_insert"
  on public.peca_materiais for insert
  to authenticated
  with check (
    exists (
      select 1 from public.pecas_projetos p
      where p.id = peca_materiais.peca_id
        and public.pode_gerenciar(p.loja_id)
    )
  );

drop policy if exists "peca_materiais_update" on public.peca_materiais;
create policy "peca_materiais_update"
  on public.peca_materiais for update
  to authenticated
  using (
    exists (
      select 1 from public.pecas_projetos p
      where p.id = peca_materiais.peca_id
        and public.pode_gerenciar(p.loja_id)
    )
  )
  with check (
    exists (
      select 1 from public.pecas_projetos p
      where p.id = peca_materiais.peca_id
        and public.pode_gerenciar(p.loja_id)
    )
  );

drop policy if exists "peca_materiais_delete" on public.peca_materiais;
create policy "peca_materiais_delete"
  on public.peca_materiais for delete
  to authenticated
  using (
    exists (
      select 1 from public.pecas_projetos p
      where p.id = peca_materiais.peca_id
        and public.pode_gerenciar(p.loja_id)
    )
  );

drop policy if exists "pedidos_select" on public.pedidos_producao;
create policy "pedidos_select"
  on public.pedidos_producao for select
  to authenticated
  using (public.is_membro(loja_id));

drop policy if exists "pedidos_insert" on public.pedidos_producao;
create policy "pedidos_insert"
  on public.pedidos_producao for insert
  to authenticated
  with check (public.is_membro(loja_id));

drop policy if exists "pedidos_update" on public.pedidos_producao;
create policy "pedidos_update"
  on public.pedidos_producao for update
  to authenticated
  using (public.is_membro(loja_id))
  with check (public.is_membro(loja_id));

drop policy if exists "pedidos_delete" on public.pedidos_producao;
create policy "pedidos_delete"
  on public.pedidos_producao for delete
  to authenticated
  using (public.pode_gerenciar(loja_id));

drop policy if exists "ateliefio_presets_select" on public.presets_fios;
drop policy if exists "presets_select" on public.presets_fios;
create policy "presets_select"
  on public.presets_fios for select
  to authenticated
  using (true);

-- 8. Permissões -------------------------------------------------------------

revoke all on table public.materiais from anon;
revoke all on table public.pecas_projetos from anon;
revoke all on table public.peca_materiais from anon;
revoke all on table public.pedidos_producao from anon;
revoke all on table public.presets_fios from anon;
revoke all on table public.perfis from anon;
revoke all on table public.lojas from anon;
revoke all on table public.membros_loja from anon;
revoke all on table public.convites_loja from anon;

grant select, insert, update, delete on table public.materiais to authenticated;
grant select, insert, update, delete on table public.pecas_projetos to authenticated;
grant select, insert, update, delete on table public.peca_materiais to authenticated;
grant select, insert, update, delete on table public.pedidos_producao to authenticated;
grant select on table public.presets_fios to authenticated;
grant select, insert, update on table public.perfis to authenticated;
grant select, insert, update on table public.lojas to authenticated;
grant select, insert, update, delete on table public.membros_loja to authenticated;
grant select, insert, update, delete on table public.convites_loja to authenticated;

-- 9. Storage: fotos só para usuários logados --------------------------------

drop policy if exists "ateliefio_amostras_select" on storage.objects;
drop policy if exists "ateliefio_amostras_insert" on storage.objects;
drop policy if exists "ateliefio_amostras_update" on storage.objects;
drop policy if exists "ateliefio_amostras_delete" on storage.objects;

create policy "ateliefio_amostras_select"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('amostras', 'pecas'));

create policy "ateliefio_amostras_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('amostras', 'pecas'));

create policy "ateliefio_amostras_update"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('amostras', 'pecas'))
  with check (bucket_id in ('amostras', 'pecas'));

create policy "ateliefio_amostras_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('amostras', 'pecas'));

-- Garante o bucket de peças.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pecas',
  'pecas',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 10. Conferência -----------------------------------------------------------
-- select * from public.lojas;
-- select * from public.membros_loja;
-- select * from public.convites_loja;
