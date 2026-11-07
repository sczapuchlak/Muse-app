-- Private image uploads (#84 follow-up): Safari can't encode WebP, so Bucket List photos fall back to JPEG there.
-- Allow image/jpeg in the private bucket and `.jpg` names in the owner-only upload policy. Same folder rules as before
-- (owner id / record uuid / content-hash uuid). Constellation cards still validate WebP paths on save, unchanged.
update storage.buckets set allowed_mime_types=array['image/webp','image/jpeg'] where id='constellation-images';
drop policy constellation_upload on storage.objects;
create policy constellation_upload on storage.objects for insert to authenticated with check(
 bucket_id='constellation-images'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=2
 and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}(\.thumb)?\.(webp|jpg)$');
