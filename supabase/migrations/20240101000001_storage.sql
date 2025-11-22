-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

-- Set up access policies for the bucket
create policy "Public Access"
  on storage.objects for select
  to public
  using ( bucket_id = 'article-images' );

create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'article-images' );

create policy "Authenticated users can update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'article-images' );

create policy "Authenticated users can delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'article-images' );
