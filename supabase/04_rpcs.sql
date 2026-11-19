-- 04_rpcs.sql · AteliêFio · Funções RPC (criar loja, resgatar convites)
-- Execute este script QUARTO no SQL Editor do Supabase.

create or replace function public.criar_loja(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $body$
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
$body$;

create or replace function public.resgatar_convites()
returns integer
language plpgsql
security definer
set search_path = public
as $body$
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
$body$;

grant execute on function public.criar_loja(text) to authenticated;
grant execute on function public.resgatar_convites() to authenticated;
