alter table public.wall_posts
  alter column body set default '';

alter table public.wall_posts
  drop constraint if exists wall_posts_body_check;

alter table public.wall_posts
  drop constraint if exists wall_posts_body_or_image_check;

alter table public.wall_posts
  add constraint wall_posts_body_or_image_check check (
    char_length(btrim(body)) between 1 and 280
    or (char_length(btrim(body)) = 0 and image_url is not null)
  );

drop policy if exists "anyone can share a wall post" on public.wall_posts;

create policy "anyone can share a wall post"
  on public.wall_posts for insert
  to anon, authenticated
  with check (
    (char_length(btrim(body)) between 1 and 280
      or (char_length(btrim(body)) = 0 and image_url is not null))
    and char_length(btrim(author)) between 1 and 50
    and (user_id is null or user_id = auth.uid())
  );
