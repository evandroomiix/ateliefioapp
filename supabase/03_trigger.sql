-- 03_trigger.sql · AteliêFio · Criação automática de perfil + loja no primeiro login
-- Execute este script TERCEIRO no SQL Editor do Supabase.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $body$
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
$body$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
