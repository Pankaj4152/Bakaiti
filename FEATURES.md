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
- [x] Language-matching AI (responds in Hindi/Hinglish/English based on chat)

### Profile
- [x] Profile page with stats
- [x] Achievements & fun labels
- [x] Avatar upload
- [x] Theme selector

### Infrastructure
- [x] Push Notifications (Service Worker + VAPID + Realtime fallback)
- [x] Vault page (memories, recaps, legendary quotes)
- [x] PWA (icons, manifest, service worker)
- [x] Sidebar mobile sheet drawer

## 🚧 Planned Features

### Command UI Forms
Every `/` command will show a UI popup/form instead of requiring manual syntax:

| Command | UI Form |
|---------|---------|
| `/irritate @user` | Target select, Speed (Slow/Medium/Aggressive), Style (Funny/Sarcastic/Desperate/Dramatic), Type (Texts/Roasts/Memes) |
| `/poll` | Question input, dynamic Add Option buttons |
| `/roast <msg>` | Optional context textarea, Roast button |
| `/spam <msg> <n>` | Message input, Count slider (1-10) |
| `/expose @user` | Target select, Expose button |
| `/translate <lang>` | Language picker dropdown |
| All others | Simple buttons for single-action commands |

### Chat Upgrades
- [ ] **Nicknames** — set custom nicknames for friends, displayed in chat bubbles
- [ ] **Message Effects** — `/confetti`, `/fireworks`, `/rain` — animated CSS effects on messages
- [ ] **Message Translation** — tap to translate any message (bhojpuri, marwari, hinglish, pirate mode, etc.)
- [ ] **Pinned Messages** — pin important messages at top of conversation
- [ ] **Message Search** — search through all messages in a conversation
- [ ] **Message Forwarding** — forward messages to other conversations
- [ ] **Conversation Archive** — hide DMs without deleting

### AI Bakait Upgrades
- [ ] **AI Sticker Generator** — `/sticker <prompt>` → Gemini generates description → sends as sticker
- [ ] **Bakait Auto-Reply** — Bakait randomly jumps into chat when things get boring/slow
- [ ] **Weekly Recap** — Bakait sends a Sunday recap as a message

### Group Upgrades
- [ ] **Group Admin** — add/remove members, edit group name from chat header
- [ ] **Group "Seen By"** — show who has read each message
- [ ] **Group Polls** — visible to all members

#### ⌨️ Command Suggestions
- [ ] Type `/` in chat input → popup with all available commands + descriptions
- [ ] Fuzzy search as you type after `/`
- [ ] Select a command → opens its UI form (no manual syntax needed)
- [ ] Works like Discord/Telegram command system

## 😤 Annoy Meter / Irritate Bot
- [ ] `/irritate @user` — Bakait analyzes target's behavior (reply time, active hours, ghosting pattern)
- [ ] Calculates optimal intervals and keeps sending messages until target replies or `/stfu`
- [ ] Every message changes tone/style — never predictable
- [ ] Configurable: `--speed slow|medium|aggressive`, `--style funny|sarcastic|desperate|dramatic`, `--type texts|roasts|memes`
- [ ] Config via UI form — no need to remember syntax

## 😈 Evil Bakait (Mastikhor Features)

| Command | What it does |
|---------|-------------|
| `/expose @user` | Bakait fetches every contradiction, lie, or excuse that user ever said — case file compiled |
| `/ghost-meter` | Leaderboard: who takes longest to reply, who leaves on read, who texts "ok" the most |
| `/crime` | AI scans last 100 messages and assigns "jail time" for cringey messages, bad comebacks, overused emojis |
| `/sin` | AI judges last message — rates it on a "sin scale" (1-10) with funny reason |
| `/toxic @user` | AI rates how toxic/chaotic that user is being today |
| `/callbhabhi` | Sends an automated "Bhabhiji kya bolti hain" style roast |
| `/receipt @user` | Lists every embarrassing thing that user said, formatted like a store receipt |
| `/spam <msg> <count>` | Sends same message N times (capped at 10) — pure chaos |
| `/mood` | AI analyzes entire chat and says "aaj sab mood me hain / sab chidhe hue hain" |

### Non-evil but fun
| Command | What it does |
|---------|-------------|
| `/translate <lang>` | Translate last message to bhojpuri, marwari, hinglish, pirate, etc. |
| `/rps` | Rock Paper Scissors with AI + fun commentary |
| `/fortune` | Bakait tells your fortune |
| `/simps` | Leaderboard of who replies fastest to whom |

## 📦 Deploy

Push to GitHub → Vercel → set all env vars → run `supabase-schema.sql` in Supabase SQL Editor.
