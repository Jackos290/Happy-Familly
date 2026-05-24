create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Happy Familly public read" on public.app_state;
create policy "Happy Familly public read"
on public.app_state
for select
to anon
using (true);

drop policy if exists "Happy Familly public insert" on public.app_state;
create policy "Happy Familly public insert"
on public.app_state
for insert
to anon
with check (true);

drop policy if exists "Happy Familly public update" on public.app_state;
create policy "Happy Familly public update"
on public.app_state
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.app_state;
