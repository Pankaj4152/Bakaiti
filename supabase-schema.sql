-- Run this in Supabase SQL Editor

-- 1. Allowed users (who can access the app)
create table if not exists allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  username text unique,
  avatar_url text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 2. Conversations (DMs between two users)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references allowed_users(id) on delete cascade,
  user2_id uuid not null references allowed_users(id) on delete cascade,
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  unique(user1_id, user2_id)
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

-- Function to get conversation list with user info, last message, and unread count
create or replace function get_conversation_list(my_user_id uuid)
returns json as $$
  select coalesce(json_agg(json_build_object(
    'id', c.id,
    'otherUser', json_build_object(
      'id', u.id,
      'name', u.name,
      'username', u.username,
      'avatar_url', u.avatar_url
    ),
    'lastMessage', case when lm.content is not null or lm.audio_url is not null then json_build_object(
      'content', lm.content,
      'audio_url', lm.audio_url,
      'created_at', lm.created_at,
      'isMine', lm.sender_id = my_user_id
    ) else null end,
    'unreadCount', coalesce(uc.unread_count, 0)
  ) order by c.last_message_at desc), '[]'::json)
  from conversations c
  left join allowed_users u on u.id = case when c.user1_id = my_user_id then c.user2_id else c.user1_id end
  left join lateral (
    select content, audio_url, created_at, sender_id
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
  where c.user1_id = my_user_id or c.user2_id = my_user_id;
$$ language sql;

-- RLS: allow authenticated users to read/insert on all app tables
alter table allowed_users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;

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


