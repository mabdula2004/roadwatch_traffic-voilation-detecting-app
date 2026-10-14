-- Allows email/password registration while phone and official identity checks
-- are pending. A contact phone supplied by a user is not an identity proof.
alter table public.base_users alter column phone drop not null;

-- The captured file has not been hashed by a trusted worker at upload time.
alter table public.evidence alter column sha256_hash drop not null;

-- Timestamp only after the signed upload is found in the private vault.
alter table public.reports alter column uploaded_at drop not null;
alter table public.reports alter column uploaded_at drop default;

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4', 'video/quicktime']
where id = 'evidence_vault';
