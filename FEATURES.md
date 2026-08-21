# Bakaiti — Features Roadmap

## ✅ Completed

### Core
- [x] Auth (email/password signup + admin approval)
- [x] DMs (real-time, read receipts, unread tracking)
- [x] Group Chats (multi-user, participant management)
- [x] Audio Messages (record + send, iOS-compatible)
- [x] Image/Video Sharing (tap-to-expand lightbox)
- [x] Stickers (upload custom packs, sticker picker)

### AI / Bakait
- [x] `/roast` — AI roasts the conversation
- [x] `/roast <msg>` — sends context first, then roast
- [x] `/chaos` — dramatic BREAKING NEWS article
- [x] `/remember @user` — dig up memories & legendary quotes
- [x] `@Bakait` — chat with AI
- [x] Daily Scan — memories, quotes, summaries saved to Vault

### Chat Features
- [x] Emoji Reactions (😂🔥💀❤️😭🥹)
- [x] Polls (`/poll "Q" "A" "B"`)
- [x] Typing Indicators
- [x] Online Status / Last Seen (green dot)
- [x] Shared Media Dialog (Media / Audio / Links tabs)
- [x] Theme Packs (Orange, Cyberpunk, Discord, WhatsApp, Terminal)
- [x] AI message styling (dark + gold border)
- [x] Language-matching AI (responds in same language as chat)

### Profile
- [x] Profile page with stats
- [x] Achievements & fun labels
- [x] Avatar upload
- [x] Theme selector

### Infrastructure
- [x] Push Notifications (Service Worker + VAPID + Realtime fallback)
- [x] Notifications default on and request browser permission on the first valid user interaction
- [x] Composer retains keyboard focus after sending text, commands, stickers, and media
- [x] Slash-command keyboard selection automatically scrolls the active option into view
- [x] Conversation sidebar resyncs through realtime, reconnect, network, and tab-visibility events
- [x] Seen receipts require a focused, visible tab and the message to be visible in the chat viewport
- [x] Oversized messages become seen after filling at least half of the visible chat viewport
- [x] Meme generation is limited server-side to one successful send per user every two minutes
- [x] Instagram-inspired quick reactions with double-click/double-tap heart and realtime counts
- [x] Senders can delete a message for everyone within one minute, with server-side enforcement
- [x] Vault page (memories, recaps, legendary quotes)
- [x] PWA (icons, manifest, service worker)
- [x] Sidebar mobile sheet drawer
- [x] Accessible mobile navigation drawer opens without dialog-title runtime errors
- [x] Simple round loader centered on the full viewport, with compact local sidebar loading
- [x] Installed PWA retries failed navigations and shows a branded offline fallback instead of Android's generic load error
- [x] Sidebar suppresses invalid direct-message destinations before rendering navigation links
- [x] Mobile drawer mounts one lightweight sidebar only; hidden desktop realtime listeners are not created on mobile
- [x] Production builds use local system fonts and cannot fail because Google Fonts is unreachable
- [x] Scan advisory-lock migration uses valid PostgreSQL hashing and non-conflicting RPC names

### Friends and direct messages
- [x] Users send a friend request before starting a direct chat
- [x] Recipients can accept or reject requests from the Friends dialog
- [x] Accepting creates the DM; direct chat URLs cannot create one early
- [x] Existing direct conversations are migrated as accepted friendships
- [x] Friend relationships are unique by unordered user pair, including simultaneous reciprocal requests

### Friends and direct messages
- [x] Users send a friend request before starting a direct chat
- [x] Recipients can accept or reject requests from the Friends dialog
- [x] Accepting creates the DM; direct chat URLs cannot create one early
- [x] Existing direct conversations are migrated as accepted friendships
- [x] Friend relationships are unique by unordered user pair, including simultaneous reciprocal requests

## 🚧 Planned Features

### Chat Upgrades
- [ ] **Nicknames** — set custom nicknames for friends, displayed in chat bubbles
- [ ] **Message Effects** — `/confetti`, `/fireworks`, `/rain` — animated CSS effects on messages
- [ ] **Message Translation** — tap to translate any message
- [ ] **Pinned Messages** — pin important messages at top of conversation

### Command UI Forms
Every `/` command shows a UI popup/form instead of requiring manual syntax:

| Command | UI Form |
|---------|---------|
| `/poll` | Question input, dynamic Add Option buttons |
| `/roast <msg>` | Optional context textarea, Roast button |
| `/spam <msg> <n>` | Message input, Count slider |
| `/expose @user` | Target select, Expose button |
| `/translate <lang>` | Language picker dropdown |
| All others | Simple buttons for single-action commands |

### AI Bakait Upgrades
- [ ] **AI Sticker Generator** — `/sticker <prompt>` → Gemini generates description → sends as sticker
- [ ] **Bakait Auto-Reply** — Bakait randomly jumps into chat when things get boring/slow

### Group Upgrades
- [ ] **Group Admin** — add/remove members, edit group name from chat header
- [ ] **Group "Seen By"** — show who has read each message
- [ ] **Group Polls** — visible to all members

### Command Suggestions
- [ ] Type `/` in chat input → popup with all available commands + descriptions
- [ ] Fuzzy search as you type after `/`
- [ ] Select a command → executes or opens its UI form

### Fun Commands
- [ ] `/translate <lang>` — Translate last message
- [ ] `/rps` — Rock Paper Scissors with AI + fun commentary
- [ ] `/fortune` — Bakait tells your fortune
- [ ] `/mood` — AI analyzes chat mood
- [ ] `/ghost-meter` — Who leaves on read the most
- [ ] `/simps` — Leaderboard of who replies fastest
- [ ] `/confetti`, `/fireworks`, `/rain` — message effects
- [ ] `/spam <msg> <n>` — repeat message N times

## 📦 Deploy
Push to GitHub → Vercel → set all env vars → run `supabase-schema.sql` in Supabase SQL Editor.
