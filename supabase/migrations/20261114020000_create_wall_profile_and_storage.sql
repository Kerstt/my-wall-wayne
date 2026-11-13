create table if not exists public.wall_profile (
  id text primary key default 'default',
  name text not null check (char_length(btrim(name)) between 1 and 50),
  city text not null default '',
  about text not null default '' check (char_length(about) <= 280),
  avatar_url text,
  updated_at timestamptz not null default now()
);

insert into public.wall_profile (id, name, city, about)
values (
  'default',
  'Wayne Harper',
  'Palo Alto, CA',
  'Photographer, diver, and maker. Always up for a good walk and a better conversation.'
)
on conflict (id) do nothing;

alter table public.wall_profile enable row level security;

create policy "wall profile is readable by everyone"
  on public.wall_profile for select
  to anon, authenticated
  using (true);

create policy "wall profile can be created by everyone"
  on public.wall_profile for insert
  to anon, authenticated
  with check (id = 'default');

create policy "wall profile can be updated by everyone"
  on public.wall_profile for update
  to anon, authenticated
  using (id = 'default')
  with check (id = 'default');

grant select, insert, update on public.wall_profile to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('wall-images', 'wall-images', true)
on conflict (id) do update set public = true;

create policy "wall images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'wall-images');

create policy "wall images can be uploaded"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'wall-images');

grant select, insert on storage.objects to anon, authenticated;
