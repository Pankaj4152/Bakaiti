-- Run this in Supabase SQL Editor

-- 1. Allowed users (who can access the app)
create table if not exists allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  username text unique,
  avatar_url text,
  status text not null default 'approved',
  created_at timestamptz default now()
);

-- 2. Conversations (DMs between two users or groups)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references allowed_users(id) on delete cascade,
  user2_id uuid references allowed_users(id) on delete cascade,
  name text,
  type text default 'dm',
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

-- Migration: add type and name columns to conversations
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'conversations' and column_name = 'type') then
    alter table conversations add column type text default 'dm';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'conversations' and column_name = 'name') then
    alter table conversations add column name text;
  end if;
end; $$;

-- Migration: make user2_id nullable (for group conversations)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'conversations' and column_name = 'user2_id' and is_nullable = 'NO'
  ) then
    alter table conversations alter column user2_id drop not null;
  end if;
end; $$;

-- Migration: admins/owners for group conversations (rename + manage members)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'conversations' and column_name = 'admin_id') then
    alter table conversations add column admin_id uuid references allowed_users(id) on delete set null;
  end if;
end; $$;

-- Backfill admin_id for groups using the creator (user1_id) as the default owner.
update conversations set admin_id = user1_id
  where type = 'group' and admin_id is null;

-- 2a. Friend requests. Direct chats may only begin after acceptance.
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references allowed_users(id) on delete cascade,
  recipient_id uuid not null references allowed_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_different_users check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create table if not exists meme_cooldowns (
  user_id uuid primary key references allowed_users(id) on delete cascade,
  next_allowed_at timestamptz not null
);

create or replace function claim_meme_cooldown(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_user uuid;
  seconds_left integer;
begin
  insert into meme_cooldowns (user_id, next_allowed_at)
  values (p_user_id, now() + interval '2 minutes')
  on conflict (user_id) do update
    set next_allowed_at = now() + interval '2 minutes'
    where meme_cooldowns.next_allowed_at <= now()
  returning user_id into claimed_user;

  if claimed_user is not null then return 0; end if;
  select greatest(1, ceil(extract(epoch from (next_allowed_at - now())))::integer)
    into seconds_left from meme_cooldowns where user_id = p_user_id;
  return coalesce(seconds_left, 1);
end;
$$;

create index if not exists idx_friend_requests_recipient_status on friend_requests(recipient_id, status);
create index if not exists idx_friend_requests_requester_status on friend_requests(requester_id, status);

insert into friend_requests (requester_id, recipient_id, status, responded_at)
select least(user1_id, user2_id), greatest(user1_id, user2_id), 'accepted', now()
from conversations
where type = 'dm' and user2_id is not null
on conflict (requester_id, recipient_id) do update
set status = 'accepted', responded_at = coalesce(friend_requests.responded_at, now());

-- 2b. Conversation participants (for group chats)
create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references allowed_users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- 3. Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references allowed_users(id) on delete cascade,
  content text,
  audio_url text,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- 4. Reactions
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references allowed_users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(user_id, message_id, emoji)
);

-- 5. Memories (replaces blackmail_evidence — stores promises, excuses, lies, etc.)
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  target_user_id uuid not null references allowed_users(id) on delete cascade,
  type text not null check (type in ('PROMISE', 'EXCUSE', 'LIE', 'EMBARRASSING', 'FUNNY', 'CONTRADICTION')),
  content text not null,
  context text,
  confidence float default 1.0,
  created_at timestamptz default now()
);

-- 6. Legendary quotes
create table if not exists legendary_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references allowed_users(id) on delete cascade,
  quote text not null,
  context text,
  rating float default 5.0,
  created_at timestamptz default now()
);

-- 7. Daily summaries
create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  date date not null default current_date,
  content jsonb not null,
  created_at timestamptz default now(),
  unique(conversation_id, date)
);

-- 8. Daily processing state (tracks what's been processed)
create table if not exists daily_processing_state (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  last_processed_message_id uuid references messages(id),
  last_processed_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(conversation_id)
);

-- 9. User stats (aggregated, updated nightly)
create table if not exists user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references allowed_users(id) on delete cascade,
  messages_sent int default 0,
  reply_time_avg float,
  ghost_count int default 0,
  emoji_count int default 0,
  startup_mentions int default 0,
  late_night_count int default 0,
  favorite_words jsonb default '[]',
  top_emojis jsonb default '[]',
  active_hours jsonb default '{}',
  longest_streak int default 0,
  conversation_starter_count int default 0,
  question_count int default 0,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 10. Push notification subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references allowed_users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(endpoint)
);

alter table push_subscriptions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'push_subs_select') then
    create policy "push_subs_select" on push_subscriptions for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'push_subs_insert') then
    create policy "push_subs_insert" on push_subscriptions for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'push_subs_update') then
    create policy "push_subs_update" on push_subscriptions for update to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'push_subs_delete') then
    create policy "push_subs_delete" on push_subscriptions for delete to authenticated using (true);
  end if;
end; $$;

-- 11. Polls
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  question text not null,
  created_by uuid not null references allowed_users(id),
  created_at timestamptz default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text text not null
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id uuid not null references allowed_users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(option_id, user_id)
);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'polls read') then
    create policy "polls read" on polls for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'polls insert') then
    create policy "polls insert" on polls for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'poll_options read') then
    create policy "poll_options read" on poll_options for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'poll_options insert') then
    create policy "poll_options insert" on poll_options for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'poll_votes read') then
    create policy "poll_votes read" on poll_votes for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'poll_votes insert') then
    create policy "poll_votes insert" on poll_votes for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'poll_votes delete') then
    create policy "poll_votes delete" on poll_votes for delete to authenticated using (user_id = (select id from allowed_users where email = auth.email()));
  end if;
end; $$;

-- Enable Realtime for polls
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poll_votes') then
    alter publication supabase_realtime add table poll_votes;
  end if;
end; $$;

-- Indexes for performance
create index if not exists idx_conversations_users on conversations(user1_id, user2_id);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_reactions_message on reactions(message_id);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
create index if not exists idx_memories_target on memories(target_user_id);
create index if not exists idx_legendary_quotes_user on legendary_quotes(user_id);
create index if not exists idx_daily_summaries_date on daily_summaries(date);

-- Enable Realtime for messages and reactions (idempotent)
do $$
  begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions') then
      alter publication supabase_realtime add table reactions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_requests') then
      alter publication supabase_realtime add table friend_requests;
    end if;
  end;
$$;

-- Function to count late night messages (midnight to 5am)
create or replace function count_late_night_messages(user_id uuid)
returns int as $$
  select count(*)::int from messages
  where sender_id = user_id
    and extract(hour from created_at) >= 0
    and extract(hour from created_at) < 5;
$$ language sql;

-- Ensure all columns used by get_conversation_list exist
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'image_url') then
    alter table messages add column image_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'sticker_url') then
    alter table messages add column sticker_url text;
  end if;
end; $$;

-- Function to get conversation list with user info, last message, and unread count
create or replace function get_conversation_list(my_user_id uuid)
returns json as $$
  select coalesce(json_agg(json_build_object(
    'id', c.id,
    'type', c.type,
    'name', c.name,
    'otherUser', case when c.type = 'group' then null else json_build_object(
      'id', u.id,
      'name', u.name,
      'username', u.username,
      'avatar_url', u.avatar_url
    ) end,
    'participants', case when c.type = 'group' then (
      select coalesce(json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'avatar_url', p.avatar_url
      )), '[]'::json)
      from conversation_participants cp
      join allowed_users p on p.id = cp.user_id
      where cp.conversation_id = c.id
    ) else null end,
    'lastMessage', case when lm.content is not null or lm.audio_url is not null or lm.image_url is not null or lm.sticker_url is not null then json_build_object(
      'content', lm.content,
      'audio_url', lm.audio_url,
      'image_url', lm.image_url,
      'sticker_url', lm.sticker_url,
      'created_at', lm.created_at,
      'isMine', lm.sender_id = my_user_id
    ) else null end,
    'unreadCount', coalesce(uc.unread_count, 0)
  ) order by c.last_message_at desc), '[]'::json)
  from conversations c
  left join allowed_users u on u.id = case when c.type = 'group' then null else case when c.user1_id = my_user_id then c.user2_id else c.user1_id end end
  left join lateral (
    select content, audio_url, image_url, sticker_url, created_at, sender_id
    from messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::int as unread_count
    from messages
    where conversation_id = c.id
      and read = false
      and sender_id != my_user_id
  ) uc on true
  where c.user1_id = my_user_id or c.user2_id = my_user_id or exists (
    select 1 from conversation_participants where conversation_id = c.id and user_id = my_user_id
  );
$$ language sql;

-- RLS: allow authenticated users to read/insert on all app tables
alter table allowed_users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;
alter table friend_requests enable row level security;
alter table meme_cooldowns enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'authenticated can read allowed_users') then
    create policy "authenticated can read allowed_users" on allowed_users for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can insert own') then
    create policy "authenticated can insert own" on allowed_users for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can update own') then
    create policy "authenticated can update own" on allowed_users for update to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can read conversations') then
    create policy "authenticated can read conversations" on conversations for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can insert conversations') then
    create policy "authenticated can insert conversations" on conversations for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can read messages') then
    create policy "authenticated can read messages" on messages for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can insert messages') then
    create policy "authenticated can insert messages" on messages for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can update messages') then
    create policy "authenticated can update messages" on messages for update to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can read reactions') then
    create policy "authenticated can read reactions" on reactions for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can insert reactions') then
    create policy "authenticated can insert reactions" on reactions for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'authenticated can delete reactions') then
    create policy "authenticated can delete reactions" on reactions for delete to authenticated using (user_id = (select id from allowed_users where email = auth.email()));
  end if;
end; $$;

-- Audio message support (idempotent migration)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'audio_url') then
    alter table messages add column audio_url text;
  end if;
  -- Make content nullable for audio-only messages
  if exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'content' and is_nullable = 'NO') then
    alter table messages alter column content drop not null;
  end if;
end; $$;

-- Storage bucket for audio messages
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'audio read') then
    create policy "audio read" on storage.objects for select to authenticated using (bucket_id = 'audio');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'audio insert') then
    create policy "audio insert" on storage.objects for insert to authenticated with check (bucket_id = 'audio');
  end if;
end; $$;

-- Online status / last seen
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'allowed_users' and column_name = 'last_seen') then
    alter table allowed_users add column last_seen timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'allowed_users' and column_name = 'theme') then
    alter table allowed_users add column theme text default 'default';
  end if;
end; $$;

-- Image/video message support
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'image_url') then
    alter table messages add column image_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'poll_id') then
    alter table messages add column poll_id uuid references polls(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'is_ai') then
    alter table messages add column is_ai boolean default false;
  end if;
end; $$;

-- Storage bucket for images
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'images read') then
    create policy "images read" on storage.objects for select to authenticated using (bucket_id = 'images');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'images insert') then
    create policy "images insert" on storage.objects for insert to authenticated with check (bucket_id = 'images');
  end if;
end; $$;

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'avatars read') then
    create policy "avatars read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'avatars insert') then
    create policy "avatars insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
  end if;
end; $$;

-- Conversation participants RLS
alter table conversation_participants enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'participants select') then
    create policy "participants select" on conversation_participants for select
      to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'participants insert') then
    create policy "participants insert" on conversation_participants for insert
      to authenticated with check (true);
  end if;
end; $$;

-- Sticker packs
create table if not exists sticker_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid references allowed_users(id) on delete cascade,
  is_public boolean default false,
  created_at timestamptz default now()
);

create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references sticker_packs(id) on delete cascade not null,
  image_url text not null,
  created_at timestamptz default now()
);

alter table sticker_packs enable row level security;
alter table stickers enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'sticker_packs select') then
    create policy "sticker_packs select" on sticker_packs for select
      to authenticated using (is_public = true or creator_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'sticker_packs insert') then
    create policy "sticker_packs insert" on sticker_packs for insert
      to authenticated with check (creator_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'stickers select') then
    create policy "stickers select" on stickers for select
      to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'stickers insert') then
    create policy "stickers insert" on stickers for insert
      to authenticated with check (exists (select 1 from sticker_packs where id = pack_id and creator_id = auth.uid()));
  end if;
end; $$;

-- Add sticker_url to messages
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'sticker_url') then
    alter table messages add column sticker_url text;
  end if;
end; $$;

-- Nicknames
create table if not exists nicknames (
  user_id uuid not null references allowed_users(id) on delete cascade,
  target_user_id uuid not null references allowed_users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz default now(),
  primary key (user_id, target_user_id)
);

alter table nicknames enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'nicknames select') then
    create policy "nicknames select" on nicknames for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'nicknames insert') then
    create policy "nicknames insert" on nicknames for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'nicknames update') then
    create policy "nicknames update" on nicknames for update to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'nicknames delete') then
    create policy "nicknames delete" on nicknames for delete to authenticated using (user_id = auth.uid());
  end if;
end; $$;

-- Pinned messages
create table if not exists pinned_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  pinned_by uuid not null references allowed_users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(conversation_id, message_id)
);

alter table pinned_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'pinned select') then
    create policy "pinned select" on pinned_messages for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'pinned insert') then
    create policy "pinned insert" on pinned_messages for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'pinned delete') then
    create policy "pinned delete" on pinned_messages for delete to authenticated using (true);
  end if;
end; $$;

-- Archived conversations
create table if not exists archived_conversations (
  user_id uuid not null references allowed_users(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  archived_at timestamptz default now(),
  primary key (user_id, conversation_id)
);

alter table archived_conversations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'archived select') then
    create policy "archived select" on archived_conversations for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'archived insert') then
    create policy "archived insert" on archived_conversations for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'archived delete') then
    create policy "archived delete" on archived_conversations for delete to authenticated using (user_id = auth.uid());
  end if;
end; $$;

-- Annoyance sessions
create table if not exists annoyance_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  target_user_id uuid not null references allowed_users(id) on delete cascade,
  created_by uuid not null references allowed_users(id) on delete cascade,
  status text default 'active' check (status in ('active', 'stopped', 'replied')),
  speed text default 'medium' check (speed in ('slow', 'medium', 'aggressive')),
  style text default 'funny' check (style in ('funny', 'sarcastic', 'desperate', 'dramatic')),
  msg_type text default 'texts' check (msg_type in ('texts', 'roasts', 'memes')),
  created_at timestamptz default now()
);

alter table annoyance_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'annoyance select') then
    create policy "annoyance select" on annoyance_sessions for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'annoyance insert') then
    create policy "annoyance insert" on annoyance_sessions for insert to authenticated with check (created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'annoyance update') then
    create policy "annoyance update" on annoyance_sessions for update to authenticated using (created_by = auth.uid());
  end if;
end; $$;

-- Stickers bucket + policies
insert into storage.buckets (id, name, public)
values ('stickers', 'stickers', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'stickers read') then
    create policy "stickers read" on storage.objects for select to authenticated using (bucket_id = 'stickers');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'stickers insert') then
    create policy "stickers insert" on storage.objects for insert to authenticated with check (bucket_id = 'stickers');
  end if;
end; $$;

-- 12. Performance Indexes for Scale
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_conversations_user1 on conversations(user1_id);
create index if not exists idx_conversations_user2 on conversations(user2_id);
create index if not exists idx_conversations_last_message on conversations(last_message_at desc);
create index if not exists idx_conv_part_user on conversation_participants(user_id, conversation_id);
create index if not exists idx_reactions_message on reactions(message_id);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);
create index if not exists idx_memories_target_user on memories(target_user_id);
create index if not exists idx_memories_conversation on memories(conversation_id);
create index if not exists idx_legendary_quotes_user on legendary_quotes(user_id);

-- 13. Reminders
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references allowed_users(id) on delete cascade,
  created_by uuid not null references allowed_users(id) on delete cascade,
  text text not null,
  remind_at timestamptz not null,
  notified boolean default false,
  created_at timestamptz default now()
);

alter table reminders enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'reminders select') then
    create policy "reminders select" on reminders for select to authenticated using (user_id = (select id from allowed_users where email = auth.email()));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reminders insert') then
    create policy "reminders insert" on reminders for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reminders update') then
    create policy "reminders update" on reminders for update to authenticated using (user_id = (select id from allowed_users where email = auth.email()));
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reminders delete') then
    create policy "reminders delete" on reminders for delete to authenticated using (user_id = (select id from allowed_users where email = auth.email()));
  end if;
end; $$;

create index if not exists idx_reminders_user on reminders(user_id, remind_at);

-- ============================================================================
-- 14. SECURITY & CORRECTNESS MIGRATIONS (apply after the above)
-- ============================================================================

-- Drop the removed /irritate + /stfu feature.
drop table if exists annoyance_sessions;

-- Scan watermark: add a created_at timestamp column so the scan can resume in
-- time order (raw UUID comparison skips ~half of new messages).
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'daily_processing_state' and column_name = 'last_processed_at') then
    alter table daily_processing_state add column last_processed_at timestamptz;
  end if;
end; $$;

-- Advisory locks for the scan cron to prevent concurrent duplicate processing.
create or replace function pg_try_advisory_lock(key bigint) returns boolean
language sql as $$ select pg_try_advisory_lock(hashtextext('bakaiti_scan'), key) $$;

create or replace function pg_advisory_unlock(key bigint) returns boolean
language sql as $$ select pg_advisory_unlock(hashtextextended('bakaiti_scan', 0), key) $$;

-- 14a. Prevent duplicate DM conversations (race condition).
create unique index if not exists idx_conversations_dm_unique
  on conversations (user1_id, user2_id)
  where type = 'dm';

-- 14b. Tighten ROW LEVEL SECURITY.

-- Helper function: allow RLS to resolve auth user -> allowed_users id by email.
create or replace function current_user_id() returns uuid as $$
  select id from allowed_users where email = auth.email() limit 1;
$$ language sql stable set search_path = public;

create or replace function current_allowed_user_id() returns uuid as $$
  select current_user_id();
$$ language sql stable set search_path = public;

drop policy if exists "users can read own friend requests" on friend_requests;
create policy "users can read own friend requests" on friend_requests for select to authenticated
  using (requester_id = current_user_id() or recipient_id = current_user_id());

drop policy if exists "authenticated can read conversations" on conversations;
create policy "users can read own conversations" on conversations for select to authenticated
  using (
    user1_id = current_user_id() or user2_id = current_user_id()
    or exists (select 1 from conversation_participants p where p.conversation_id = conversations.id and p.user_id = current_user_id())
  );

drop policy if exists "authenticated can insert conversations" on conversations;
create policy "friends can create direct conversations" on conversations for insert to authenticated
  with check (
    type = 'dm'
    and current_user_id() in (user1_id, user2_id)
    and exists (
      select 1 from friend_requests f
      where f.status = 'accepted'
        and ((f.requester_id = user1_id and f.recipient_id = user2_id)
          or (f.requester_id = user2_id and f.recipient_id = user1_id))
    )
  );

-- allowed_users: users may only ever update their OWN row (prevents self-approval
-- via the anon client and profile tampering of other accounts).
drop policy if exists "authenticated can update own" on allowed_users;
create policy "can update own"
  on allowed_users for update to authenticated
  using (email = auth.email())
  with check (email = auth.email());

-- messages: inserts must claim an own-sender id; only read conversations you belong to.
drop policy if exists "authenticated can insert messages" on messages;
create policy "can insert own messages"
  on messages for insert to authenticated
  with check (
    sender_id in (select id from allowed_users where email = auth.email())
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user1_id = sender_id or c.user2_id = sender_id
             or exists (select 1 from conversation_participants p
                        where p.conversation_id = c.id and p.user_id = sender_id))
    )
  );

drop policy if exists "authenticated can read messages" on messages;
create policy "can read own conversations messages"
  on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user1_id = current_user_id() or c.user2_id = current_user_id()
             or exists (select 1 from conversation_participants p
                        where p.conversation_id = c.id and p.user_id = current_user_id()))
    )
  );

drop policy if exists "authenticated can update messages" on messages;
create policy "can update read flag own conversations"
  on messages for update to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user1_id = current_user_id() or c.user2_id = current_user_id()
             or exists (select 1 from conversation_participants p
                        where p.conversation_id = c.id and p.user_id = current_user_id()))
    )
  );

drop policy if exists "users can delete own recent messages" on messages;
create policy "users can delete own recent messages" on messages for delete to authenticated
  using (sender_id = current_user_id() and created_at >= now() - interval '1 minute');

-- reactions: only read reactions in conversations you belong to; only react within them.
drop policy if exists "authenticated can read reactions" on reactions;
create policy "can read own conversation reactions"
  on reactions for select to authenticated
  using (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = reactions.message_id
        and (c.user1_id = current_user_id() or c.user2_id = current_user_id()
             or exists (select 1 from conversation_participants p
                        where p.conversation_id = c.id and p.user_id = current_user_id()))
    )
  );

drop policy if exists "authenticated can insert reactions" on reactions;
create policy "can insert own conversation reactions"
  on reactions for insert to authenticated
  with check (
    user_id = current_user_id()
    and exists (select 1 from conversations c where c.id = (select conversation_id from messages where id = reactions.message_id) and (c.type = 'dm' or exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = current_user_id())))
  );

-- push_subscriptions: users may only see/delete their own subscriptions.
drop policy if exists "push_subs_select" on push_subscriptions;
drop policy if exists "push_subs_update" on push_subscriptions;
drop policy if exists "push_subs_delete" on push_subscriptions;
create policy "push_subs_select" on push_subscriptions
  for select to authenticated using (user_id = current_user_id());
create policy "push_subs_update" on push_subscriptions
  for update to authenticated using (user_id = current_user_id());
create policy "push_subs_delete" on push_subscriptions
  for delete to authenticated using (user_id = current_user_id());

-- reminders: users may only read/update their own reminders.
drop policy if exists "reminders select" on reminders;
drop policy if exists "reminders update" on reminders;
drop policy if exists "reminders delete" on reminders;
create policy "reminders select" on reminders
  for select to authenticated using (user_id = current_user_id());
create policy "reminders update" on reminders
  for update to authenticated using (user_id = current_user_id());
create policy "reminders delete" on reminders
  for delete to authenticated using (user_id = current_user_id());

-- poll_votes: a user may only manage their own votes.
drop policy if exists "poll_votes delete" on poll_votes;
create policy "poll_votes delete" on poll_votes
  for delete to authenticated using (user_id = current_user_id());

-- Distinct conversation count for a user (DMs + groups without double-counting
-- a group creator who is both user1_id and a participant).
create or replace function count_user_conversations(p_user_id uuid)
returns int as $$
  select (
    (select count(*)::int from conversations
     where type = 'dm' and (user1_id = p_user_id or user2_id = p_user_id))
    +
    (select count(distinct conversation_id)::int from conversation_participants
     where user_id = p_user_id)
  );
$$ language sql stable set search_path = public;
