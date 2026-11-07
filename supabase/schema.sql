-- =====================================================================
-- TaskQuest – Supabase schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- PROFILES -------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text,
  avatar_url        text,
  bio               text,
  theme             text not null default 'sakura',
  role              text not null default 'user' check (role in ('user','admin')),
  xp                integer not null default 0,
  location_consent  boolean not null default false,
  camera_consent    boolean not null default false,
  last_lat          double precision,
  last_lng          double precision,
  last_seen         timestamptz,
  created_at        timestamptz not null default now()
);

-- ---------- TASKS ----------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  priority      text not null default 'normal' check (priority in ('easy','normal','hard','boss')),
  status        text not null default 'todo' check (status in ('todo','done')),
  due_at        timestamptz,
  lat           double precision,
  lng           double precision,
  place_name    text,
  xp_reward     integer not null default 20,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks(user_id);

-- ---------- CAMERA REQUESTS / SNAPSHOTS (consent based) --------------
create table if not exists public.camera_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  requested_by  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','approved','denied')),
  message       text,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);

create table if not exists public.camera_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  request_id  uuid references public.camera_requests(id) on delete set null,
  path        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- HELPERS --------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Normal users cannot promote themselves to admin
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ---------- ROW LEVEL SECURITY ---------------------------------------
alter table public.profiles          enable row level security;
alter table public.tasks             enable row level security;
alter table public.camera_requests   enable row level security;
alter table public.camera_snapshots  enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "tasks own"        on public.tasks;
drop policy if exists "tasks admin read" on public.tasks;
create policy "tasks own"        on public.tasks for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks admin read" on public.tasks for select using (public.is_admin());

drop policy if exists "camreq read"         on public.camera_requests;
drop policy if exists "camreq admin insert" on public.camera_requests;
drop policy if exists "camreq respond"      on public.camera_requests;
create policy "camreq read"         on public.camera_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "camreq admin insert" on public.camera_requests for insert with check (
  public.is_admin() and requested_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = user_id and p.camera_consent)
);
create policy "camreq respond"      on public.camera_requests for update using (user_id = auth.uid());

drop policy if exists "snap read"   on public.camera_snapshots;
drop policy if exists "snap insert" on public.camera_snapshots;
drop policy if exists "snap delete" on public.camera_snapshots;
create policy "snap read"   on public.camera_snapshots for select using (user_id = auth.uid() or public.is_admin());
create policy "snap insert" on public.camera_snapshots for insert with check (user_id = auth.uid());
create policy "snap delete" on public.camera_snapshots for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- STORAGE --------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('snapshots', 'snapshots', false)
  on conflict (id) do nothing;

-- files are stored as  <user-id>/<file>
drop policy if exists "avatar read"   on storage.objects;
drop policy if exists "avatar write"  on storage.objects;
drop policy if exists "avatar update" on storage.objects;
drop policy if exists "snap file read"  on storage.objects;
drop policy if exists "snap file write" on storage.objects;
create policy "avatar read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar write"  on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "snap file read"  on storage.objects for select using (bucket_id = 'snapshots' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "snap file write" on storage.objects for insert with check (bucket_id = 'snapshots' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "snap file delete" on storage.objects;
create policy "snap file delete" on storage.objects for delete using (bucket_id = 'snapshots' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- REALTIME -------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.camera_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.camera_snapshots;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;
