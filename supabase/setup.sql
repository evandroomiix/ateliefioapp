-- ============================================================================
-- AteliêFio · Permissões do Supabase
-- ============================================================================
-- Execute este script no SQL Editor do Supabase caso o app mostre
-- "permission denied for table ..." ou "Bucket not found".
--
-- IMPORTANTE: o AteliêFio não possui login nesta versão. Por isso as políticas
-- abaixo liberam acesso público (anon) às tabelas do ateliê. Use em um projeto
-- pessoal. Se o app for publicado para várias pessoas, adicione autenticação e
-- restrinja as políticas por usuário.
-- ============================================================================

-- 1. Permissões básicas do schema
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.materiais to anon, authenticated;
grant select, insert, update, delete on table public.pecas_projetos to anon, authenticated;
grant select, insert, update, delete on table public.peca_materiais to anon, authenticated;
grant select, insert, update, delete on table public.pedidos_producao to anon, authenticated;
-- Os presets de fios são somente leitura no app.
grant select on table public.presets_fios to anon, authenticated;

-- Sequências (caso as chaves sejam bigserial/serial)
grant usage, select on all sequences in schema public to anon, authenticated;

-- 2. RLS com acesso público para o app pessoal
alter table public.materiais enable row level security;
alter table public.pecas_projetos enable row level security;
alter table public.peca_materiais enable row level security;
alter table public.pedidos_producao enable row level security;
alter table public.presets_fios enable row level security;

drop policy if exists "ateliefio_materiais_all" on public.materiais;
create policy "ateliefio_materiais_all"
  on public.materiais
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "ateliefio_pecas_all" on public.pecas_projetos;
create policy "ateliefio_pecas_all"
  on public.pecas_projetos
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "ateliefio_peca_materiais_all" on public.peca_materiais;
create policy "ateliefio_peca_materiais_all"
  on public.peca_materiais
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "ateliefio_pedidos_all" on public.pedidos_producao;
create policy "ateliefio_pedidos_all"
  on public.pedidos_producao
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "ateliefio_presets_select" on public.presets_fios;
create policy "ateliefio_presets_select"
  on public.presets_fios
  for select
  to anon, authenticated
  using (true);

-- 3. Bucket público de fotos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'amostras',
  'amostras',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 4. Políticas do Storage para o bucket "amostras"
drop policy if exists "ateliefio_amostras_select" on storage.objects;
create policy "ateliefio_amostras_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'amostras');

drop policy if exists "ateliefio_amostras_insert" on storage.objects;
create policy "ateliefio_amostras_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'amostras');

drop policy if exists "ateliefio_amostras_update" on storage.objects;
create policy "ateliefio_amostras_update"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'amostras')
  with check (bucket_id = 'amostras');

drop policy if exists "ateliefio_amostras_delete" on storage.objects;
create policy "ateliefio_amostras_delete"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'amostras');

-- 5. Índices úteis (seguros para executar novamente)
create index if not exists ateliefio_peca_materiais_peca_idx
  on public.peca_materiais (peca_id);

create index if not exists ateliefio_peca_materiais_material_idx
  on public.peca_materiais (material_id);

create index if not exists ateliefio_pedidos_status_idx
  on public.pedidos_producao (status);

-- 6. Conferência opcional
-- select * from pg_policies where schemaname = 'public';
-- select id, name, public from storage.buckets where id = 'amostras';
