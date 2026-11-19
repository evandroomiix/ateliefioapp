-- 02_funcoes.sql · AteliêFio · Funções auxiliares de permissão
-- Execute este script SEGUNDO no SQL Editor do Supabase.

create or replace function public.is_membro(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select exists (
    select 1
    from public.membros_loja
    where loja_id = p_loja
      and user_id = auth.uid()
  );
$body$;

create or replace function public.papel_na_loja(p_loja uuid)
returns text
language sql
stable
security definer
set search_path = public
as $body$
  select papel
  from public.membros_loja
  where loja_id = p_loja
    and user_id = auth.uid()
  limit 1;
$body$;

create or replace function public.pode_gerenciar(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select coalesce(public.papel_na_loja(p_loja) in ('administrador', 'gerente'), false);
$body$;

create or replace function public.is_admin(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select coalesce(public.papel_na_loja(p_loja) = 'administrador', false);
$body$;

create or replace function public.mesma_loja(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select exists (
    select 1
    from public.membros_loja a
    join public.membros_loja b on b.loja_id = a.loja_id
    where a.user_id = auth.uid()
      and b.user_id = p_user
  );
$body$;
