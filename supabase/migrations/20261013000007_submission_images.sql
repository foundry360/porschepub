-- =============================================================================
-- Photos attached to "Tell Your Story" submissions
--
-- Privacy: these are unpublished, contributor-owned images. They live in a
-- PRIVATE bucket and are only ever shown to editorial staff through short-lived
-- signed URLs. Files are re-encoded on the server before storage, which strips
-- EXIF metadata (including GPS location). Anonymous visitors have no direct
-- access to the table or the bucket; the server writes with the service role.
-- =============================================================================

create table public.submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position smallint not null default 0 check (position between 0 and 9),
  created_at timestamptz not null default now()
);

create index submission_images_submission_idx on public.submission_images (submission_id, position);

alter table public.submission_images enable row level security;

revoke all on public.submission_images from public, anon, authenticated;
grant select, delete on public.submission_images to authenticated;
grant all on public.submission_images to service_role;

create policy "submission_images: editors read" on public.submission_images
  for select to authenticated using (public.is_editor());
create policy "submission_images: admin delete" on public.submission_images
  for delete to authenticated using (public.is_admin());

-- Storage ---------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-images', 'submission-images', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Editors may read (to mint signed URLs); only admins may delete. No one but
-- the service role may write.
create policy "submission-images: editors read" on storage.objects
  for select to authenticated
  using (bucket_id = 'submission-images' and public.is_editor());
create policy "submission-images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submission-images' and public.is_admin());
