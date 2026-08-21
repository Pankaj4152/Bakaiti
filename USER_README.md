# Bakaiti — User Guide

Private chat app for our friend group.

## Getting Started

Sign up with your email. An admin will approve your account. Set your name and username, then start chatting.

## DMs

Click **+** in the sidebar, choose **Add new friend**, find an exact username, and send a request. Search results show whether you are already friends, a request is pending, or an incoming request can be accepted. A direct chat becomes writable only after acceptance. Received requests, sent requests, and recent acceptances appear under the heart-shaped **Activity** button. Messages show read receipts (✓ / ✓✓).

Previous chats remain readable after unfriending, but sending is locked until a new request is accepted. If you deleted a chat from your own side, search for an accepted friend and choose **Open chat** to start fresh.

## Notifications

Notifications are enabled by default. On first use, click or press a key in the app and approve the browser permission prompt. If permission was previously blocked, re-enable it from the browser's site settings; a web app cannot override a browser-level denial.

Conversation previews, unread counts, friend acceptances, and new messages update automatically. Returning to the app or reconnecting the network also triggers a fresh sync.

The installed mobile app retries brief navigation failures automatically. If the connection remains unavailable, it shows Bakaiti's offline screen with a retry button instead of the phone's generic page-load error.

On mobile, the navigation drawer runs a single conversation connection. The desktop sidebar is not mounted invisibly in the background.

Swipe right starting near the left edge of the mobile screen to open the conversation sidebar. The menu button remains available as a fallback.

A message is marked seen only while the chat tab is visible and focused and the message is actually visible in the message area. Background or minimized apps do not send seen receipts.

The `/meme` command can send one generated meme every two minutes per user. If it is used too soon, the composer shows the exact number of seconds remaining.

React from the smile button beside a message, or double-click/double-tap a message to quickly add a heart. Tap an existing reaction pill to add or remove your own reaction.

Open the action menu on your own message and choose **Delete for everyone**. The option is available for two minutes after sending, and the server also enforces the deadline.

On desktop, left-click or right-click a message to open its actions. On mobile, long-press it. Keyboard users can focus messages with **Tab** and open actions using **Enter**, **Space**, the context-menu key, or **Shift+F10**.

Right-click a conversation on desktop or long-press it on mobile for chat actions. **Hide from chat list** preserves your history. **Delete chat for me** removes existing history only from your side; other participants keep their copy, and a future message brings the chat back with only newer messages.

## Groups

Click **+** in the sidebar and choose **Create a group**. Give it a name and add members. Group chats show stacked avatars in the header. Long-press/right-click a group to leave it; owners can delete the group for everyone.

## Commands

Type `/` in the chat input to see a popup with all available commands. Pick one to run it.

| Command | What it does |
|---------|-------------|
| `/roast` or `/roast <msg>` | AI roasts the chat (add text to send context first) |
| `/chaos` or `/chaos <msg>` | AI turns chat into dramatic news (add text to send context first) |
| `/remember @user` | AI digs up past memories and legendary quotes |
| `@Bakait <message>` | Chat directly with the AI |
| `/poll "Q" "A" "B"` | Create a poll (quote each option) |
| `/spam <msg> <N>` | Repeat a message N times (max 10) |
| `/mood` | AI analyzes the chat mood |
| `/meme` or `/meme <prompt>` | AI generates a meme IMAGE from chat context (native image generation) |
| `/fortune` | Bakait tells your fortune |
| `/simps` | Who replies fastest to whom |
| `/ghost-meter` | Who leaves on read the most |
| `/confetti <emojis>` | Rain confetti (add emojis: `/confetti 🚀💀🎉`) |
| `/fireworks <emojis>` | Fireworks effect (add emojis: `/fireworks ❤️🔥`) |
| `/rain <emojis>` | Rain effect (add emojis: `/rain 🌈💧🌊`) |

## Voice Messages

Tap the microphone button to record. Works on iOS too. If permission is denied, follow the on-screen instructions to enable it in your browser settings.

## Stickers

Tap the smiley-face icon in the input to open the sticker picker. Upload your own stickers or use existing packs.

## Reactions

Hover over a message and tap **+** to react with emojis (😂🔥💀❤️😭🥹).

## Themes

Go to your profile → Edit Profile → Chat Theme. Pick from Default, Orange, Cyberpunk, Discord, WhatsApp, or Terminal.

## Vault

Vault navigation is temporarily hidden while memories and recaps are being stabilized. Its data and implementation are preserved for a later profile integration.

## Profile

Click your avatar in the sidebar to see your stats, achievements, fun labels, and accepted Friends list. Friend entries provide profile and chat shortcuts. Edit your profile photo, name, username, and chat theme from the same page.

## Notifications

Push notifications are supported. Make sure to allow notifications when prompted by your browser.
