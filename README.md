# Bakaiti

Private group chat for close friends. Built with Next.js 16, Supabase, and Gemini AI.

## Features

- **Auth**: email/password signup with admin approval
- **DMs**: real-time messaging with read receipts and unread tracking
- **Groups**: multi-user conversations with participant management
- **Audio Messages**: record and send voice messages (iOS-compatible)
- **Image/Video**: share with tap-to-expand lightbox
- **Stickers**: upload and send custom sticker packs
- **Polls**: create polls with `/poll "Q" "A" "B"` command
- **Reactions**: emoji reactions (😂🔥💀❤️😭🥹)
- **Theme Packs**: Orange, Cyberpunk, Discord, WhatsApp, Terminal
- **AI Features**:
  - `/roast @user` — roast your friends
  - `/chaos` — dramatic breaking news about the chat
  - `/remember @user` — dig up memories and legendary quotes
  - `@Bakait` — chat with the AI
  - Daily scan (memories, quotes, summaries)
- **Vault**: browse AI-generated memories, recaps, and legendary quotes
- **Push Notifications**: via Service Worker + VAPID (with Realtime fallback)
- **Typing Indicators**, **Online Status**, **Shared Media Gallery**
- **Profile**: stats, achievements, fun labels

## Tech Stack

- **Framework**: Next.js 16.2.12 (App Router)
- **Database**: Supabase (Postgres + Realtime + Storage)
- **AI**: Google Gemini 2.0 Flash
- **Auth**: Supabase Auth (email/password)
- **Push**: web-push (VAPID) + Service Worker
- **Styling**: Tailwind CSS + shadcn/ui

## Getting Started

```bash
npm install
cp .env.example .env.local  # fill in your Supabase and Gemini keys
npm run dev
```

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor.

### Env Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | mailto: for VAPID |

### Deploy to Vercel

Push to GitHub → import project → set all env vars → deploy.
