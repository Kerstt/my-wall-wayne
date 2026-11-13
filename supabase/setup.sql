-- Paste this entire file into the Supabase SQL Editor and click Run.

create table if not exists public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author text not null default 'Anonymous' check (char_length(btrim(author)) between 1 and 50),
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  constraint wall_posts_body_or_image_check check (
    char_length(btrim(body)) between 1 and 280
    or (char_length(btrim(body)) = 0 and image_url is not null)
  )
);

alter table public.wall_posts add column if not exists image_url text;
alter table public.wall_posts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.wall_posts alter column body set default '';
alter table public.wall_posts drop constraint if exists wall_posts_body_check;
alter table public.wall_posts drop constraint if exists wall_posts_body_or_image_check;
alter table public.wall_posts add constraint wall_posts_body_or_image_check check (
  char_length(btrim(body)) between 1 and 280
  or (char_length(btrim(body)) = 0 and image_url is not null)
);
create index if not exists wall_posts_created_at_idx on public.wall_posts (created_at desc);
create index if not exists wall_posts_user_id_idx on public.wall_posts (user_id);
alter table public.wall_posts enable row level security;

drop policy if exists "wall_posts are readable by everyone" on public.wall_posts;
create policy "wall_posts are readable by everyone"
  on public.wall_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "anyone can share a wall post" on public.wall_posts;
create policy "anyone can share a wall post"
  on public.wall_posts for insert
  to anon, authenticated
  with check (
    (char_length(btrim(body)) between 1 and 280 or (char_length(btrim(body)) = 0 and image_url is not null))
    and char_length(btrim(author)) between 1 and 50
    and (user_id is null or user_id = auth.uid())
  );

grant select, insert on public.wall_posts to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wall_posts'
  ) then
    alter publication supabase_realtime add table public.wall_posts;
  end if;
end
$$;

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
drop policy if exists "wall profile is readable by everyone" on public.wall_profile;
drop policy if exists "wall profile can be created by everyone" on public.wall_profile;
drop policy if exists "wall profile can be updated by everyone" on public.wall_profile;

create policy "wall profile is readable by everyone"
  on public.wall_profile for select to anon, authenticated using (true);
create policy "wall profile can be created by everyone"
  on public.wall_profile for insert to anon, authenticated with check (id = 'default');
create policy "wall profile can be updated by everyone"
  on public.wall_profile for update to anon, authenticated
  using (id = 'default') with check (id = 'default');

grant select, insert, update on public.wall_profile to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('wall-images', 'wall-images', true)
on conflict (id) do update set public = true;

drop policy if exists "wall images are publicly readable" on storage.objects;
drop policy if exists "wall images can be uploaded" on storage.objects;
create policy "wall images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'wall-images');
create policy "wall images can be uploaded"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wall-images');

grant select, insert on storage.objects to anon, authenticated;
