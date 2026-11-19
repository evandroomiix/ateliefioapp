-- 05a_rls_lojas.sql · AteliêFio · RLS para tabelas de loja
-- Execute este script no SQL Editor do Supabase (parte 1 de 2 do RLS).

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
