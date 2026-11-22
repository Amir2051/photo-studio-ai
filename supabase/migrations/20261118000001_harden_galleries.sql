-- Gallery hardening: stop anonymous full-table reads and make photo storage
-- private-by-default. Share URLs are now minted by get-gallery-share as
-- short-lived signed URLs only for unexpired shares.

-- Anonymous listing previously returned ALL unexpired shares to anyone with
-- the publishable key. Reads now flow through the edge function instead.
drop policy if exists gallery_shares_public_read on public.gallery_shares;

-- Photos were world-readable forever via public bucket URLs. The bucket is
-- now private; anonymous access is impossible without a signed URL.
update storage.buckets set public = false where id = 'gallery-shares';
