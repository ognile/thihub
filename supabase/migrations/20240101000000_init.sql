-- Create articles table
create table if not exists articles (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  subtitle text,
  content text,
  author text,
  reviewer text,
  date text,
  image text,
  cta_text text,
  cta_title text,
  cta_description text,
  pixel_id text,
  cta_url text,
  key_takeaways jsonb,
  comments jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create global_config table
create table if not exists global_config (
  id serial primary key,
  default_pixel_id text,
  default_cta_url text
);

-- Enable RLS
alter table articles enable row level security;
alter table global_config enable row level security;

-- Create policies
create policy "Public articles are viewable by everyone"
  on articles for select
  to public
  using (true);

create policy "Admins can insert articles"
  on articles for insert
  to authenticated
  with check (true);

create policy "Admins can update articles"
  on articles for update
  to authenticated
  using (true);

create policy "Admins can delete articles"
  on articles for delete
  to authenticated
  using (true);

create policy "Public config is viewable by everyone"
  on global_config for select
  to public
  using (true);

create policy "Admins can update config"
  on global_config for update
  to authenticated
  using (true);

create policy "Admins can insert config"
  on global_config for insert
  to authenticated
  with check (true);
