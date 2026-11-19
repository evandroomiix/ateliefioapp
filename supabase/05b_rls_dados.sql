-- 05b_rls_dados.sql · AteliêFio · RLS para tabelas de dados
-- Execute este script no SQL Editor do Supabase (parte 2 de 2 do RLS).

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
