create table public.wall_posts (
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

create index wall_posts_created_at_idx on public.wall_posts (created_at desc);
create index wall_posts_user_id_idx on public.wall_posts (user_id);

alter table public.wall_posts enable row level security;

create policy "wall_posts are readable by everyone"
  on public.wall_posts for select
  to anon, authenticated
  using (true);

create policy "anyone can share a wall post"
  on public.wall_posts for insert
  to anon, authenticated
  with check (
    (char_length(btrim(body)) between 1 and 280 or (char_length(btrim(body)) = 0 and image_url is not null))
    and char_length(btrim(author)) between 1 and 50
    and (user_id is null or user_id = auth.uid())
  );

grant select, insert on public.wall_posts to anon, authenticated;

alter publication supabase_realtime add table public.wall_posts;
