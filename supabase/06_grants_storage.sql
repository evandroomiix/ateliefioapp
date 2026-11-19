-- 06_grants_storage.sql · AteliêFio · Permissões e Storage
-- Execute este script SEXTO (último) no SQL Editor do Supabase.

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
