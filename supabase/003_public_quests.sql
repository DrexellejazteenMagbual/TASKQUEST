-- TaskQuest – migration 003: admin-created public quests
-- Run once in Supabase → SQL Editor (safe to run again).

alter table public.tasks add column if not exists is_public boolean not null default false;
create index if not exists tasks_public_idx on public.tasks(is_public) where is_public;

create table if not exists public.task_completions (
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table public.task_completions enable row level security;

drop policy if exists "public tasks read" on public.tasks;
drop policy if exists "tasks own" on public.tasks;
create policy "public tasks read" on public.tasks for select
  using (is_public or user_id = auth.uid() or public.is_admin());
create policy "tasks own" on public.tasks for insert
  with check (user_id = auth.uid() and (not is_public or public.is_admin()));
create policy "tasks own update" on public.tasks for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "tasks own delete" on public.tasks for delete
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "task completions own" on public.task_completions;
create policy "task completions own" on public.task_completions for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.is_public)
  );
