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
  content text not null,
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

-- Indexes for performance
create index if not exists idx_conversations_users on conversations(user1_id, user2_id);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_reactions_message on reactions(message_id);
create index if not exists idx_memories_target on memories(target_user_id);
create index if not exists idx_legendary_quotes_user on legendary_quotes(user_id);
create index if not exists idx_daily_summaries_date on daily_summaries(date);

-- Enable Realtime for messages and reactions
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;

-- Function to count late night messages (midnight to 5am)
create or replace function count_late_night_messages(user_id uuid)
returns int as $$
  select count(*)::int from messages
  where sender_id = user_id
    and extract(hour from created_at) >= 0
    and extract(hour from created_at) < 5;
$$ language sql;

-- RLS: allow authenticated users to read/insert on all app tables
alter table allowed_users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;

create policy "authenticated can read allowed_users"
  on allowed_users for select to authenticated using (true);
create policy "authenticated can insert own"
  on allowed_users for insert to authenticated with check (true);
create policy "authenticated can update own"
  on allowed_users for update to authenticated using (true);

create policy "authenticated can read conversations"
  on conversations for select to authenticated using (true);
create policy "authenticated can insert conversations"
  on conversations for insert to authenticated with check (true);

create policy "authenticated can read messages"
  on messages for select to authenticated using (true);
create policy "authenticated can insert messages"
  on messages for insert to authenticated with check (true);

create policy "authenticated can read reactions"
  on reactions for select to authenticated using (true);
create policy "authenticated can insert reactions"
  on reactions for insert to authenticated with check (true);
