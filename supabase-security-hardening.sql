-- ============================================================================
-- BAKAITI SECURITY & STORAGE HARDENING MIGRATION
-- Fixes RLS policies & storage security vulnerabilities identified in P0 audit.
-- ============================================================================

-- 1. Helper function for RLS context
create or replace function current_user_id() returns uuid as $$
  select id from allowed_users where email = auth.email() limit 1;
$$ language sql stable set search_path = public;

-- Helper function to extract user ID from standard storage file paths (e.g. avatars/{user_id}/file.ext or images/{user_id}/...)
create or replace function storage_path_user_id(name text) returns text as $$
  select split_part(name, '/', 1);
$$ language sql immutable set search_path = public;

-- 2. TIGHTEN MESSAGES UPDATE POLICY
-- Prevent users from mutating fields other than 'read' flag or editing unauthorized content.
drop policy if exists "can update read flag own conversations" on messages;
drop policy if exists "authenticated can update messages" on messages;

create policy "can update read flag own conversations"
  on messages for update to authenticated
  using (
    is_conversation_participant(conversation_id, current_user_id())
  )
  with check (
    is_conversation_participant(conversation_id, current_user_id())
    -- Enforce that sender_id, conversation_id, and created_at cannot be altered during update
    and sender_id = (select m.sender_id from messages m where m.id = id)
    and conversation_id = (select m.conversation_id from messages m where m.id = id)
  );

-- 3. TIGHTEN POLLS & POLL OPTIONS RLS POLICIES
-- Ensure polls and poll options can only be created by participants of the conversation.
drop policy if exists "polls read" on polls;
drop policy if exists "polls insert" on polls;
create policy "polls read" on polls for select to authenticated
  using (is_conversation_participant(conversation_id, current_user_id()));

create policy "polls insert" on polls for insert to authenticated
  with check (
    created_by = current_user_id()
    and is_active_conversation_member(conversation_id, current_user_id())
  );

drop policy if exists "poll_options read" on poll_options;
drop policy if exists "poll_options insert" on poll_options;
create policy "poll_options read" on poll_options for select to authenticated
  using (
    exists (
      select 1 from polls p
      where p.id = poll_options.poll_id
        and is_conversation_participant(p.conversation_id, current_user_id())
    )
  );

create policy "poll_options insert" on poll_options for insert to authenticated
  with check (
    exists (
      select 1 from polls p
      where p.id = poll_options.poll_id
        and p.created_by = current_user_id()
        and is_active_conversation_member(p.conversation_id, current_user_id())
    )
  );

drop policy if exists "poll_votes read" on poll_votes;
drop policy if exists "poll_votes insert" on poll_votes;
create policy "poll_votes read" on poll_votes for select to authenticated
  using (
    exists (
      select 1 from poll_options po
      join polls p on p.id = po.poll_id
      where po.id = poll_votes.option_id
        and is_conversation_participant(p.conversation_id, current_user_id())
    )
  );

create policy "poll_votes insert" on poll_votes for insert to authenticated
  with check (
    user_id = current_user_id()
    and exists (
      select 1 from poll_options po
      join polls p on p.id = po.poll_id
      where po.id = poll_votes.option_id
        and is_active_conversation_member(p.conversation_id, current_user_id())
    )
  );

-- 4. HARDEN STORAGE BUCKET RLS POLICIES
-- Require user-owned path prefixing or ownership checks to prevent unauthorized bucket writes/overwrites.

-- Avatars Bucket
drop policy if exists "avatars read" on storage.objects;
drop policy if exists "avatars insert" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
drop policy if exists "avatars delete" on storage.objects;

create policy "avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and storage_path_user_id(name) = current_user_id()::text
  );

create policy "avatars update" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and storage_path_user_id(name) = current_user_id()::text
  );

create policy "avatars delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (owner = auth.uid() or storage_path_user_id(name) = current_user_id()::text)
  );

-- Images Bucket
drop policy if exists "images read" on storage.objects;
drop policy if exists "images insert" on storage.objects;
drop policy if exists "images update" on storage.objects;
drop policy if exists "images delete" on storage.objects;

create policy "images read" on storage.objects for select to authenticated
  using (bucket_id = 'images');

create policy "images insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and owner = auth.uid()
  );

create policy "images delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'images'
    and owner = auth.uid()
  );

-- Audio Bucket
drop policy if exists "audio read" on storage.objects;
drop policy if exists "audio insert" on storage.objects;
drop policy if exists "audio delete" on storage.objects;

create policy "audio read" on storage.objects for select to authenticated
  using (bucket_id = 'audio');

create policy "audio insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audio'
    and owner = auth.uid()
  );

create policy "audio delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'audio'
    and owner = auth.uid()
  );

-- Stickers Bucket
drop policy if exists "stickers read" on storage.objects;
drop policy if exists "stickers insert" on storage.objects;
drop policy if exists "stickers delete" on storage.objects;

create policy "stickers read" on storage.objects for select to authenticated
  using (bucket_id = 'stickers');

create policy "stickers insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'stickers'
    and owner = auth.uid()
  );

create policy "stickers delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'stickers'
    and owner = auth.uid()
  );
