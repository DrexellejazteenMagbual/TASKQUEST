-- =====================================================================
-- TaskQuest – migration 002: real email on sign-up + login by username OR email
-- Run once in Supabase → SQL Editor (safe to run again).
-- =====================================================================

-- store the email on the profile (visible to the user and admins only, via RLS)
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and p.email is null;

-- usernames are unique regardless of upper/lower case
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- new sign-ups: copy username + email into the profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

-- Is a username free? (used by the sign-up form)
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

-- Login by username: returns the account's email ONLY when the password is
-- correct, so it cannot be used to discover other people's emails.
create or replace function public.login_email(p_username text, p_password text)
returns text language sql stable security definer set search_path = public, extensions as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username))
    and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
  limit 1;
$$;

revoke all on function public.username_available(text) from public;
revoke all on function public.login_email(text, text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.login_email(text, text) to anon, authenticated;
