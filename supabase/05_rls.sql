-- 05_rls.sql · AteliêFio · Row Level Security para tabelas de loja e dados
-- Execute este script QUINTO no SQL Editor do Supabase.

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

alter table public.materiais enable row level security;
alter table public.pecas_projetos enable row level security;
alter table public.peca_materiais enable row level security;
alter table public.pedidos_producao enable row level security;
alter table public.presets_fios enable row level security;

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
