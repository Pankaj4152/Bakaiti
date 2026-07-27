const API_KEY = process.env.GEMINI_API_KEY
const MODEL = "gemini-3.1-flash-lite"

interface MessageInput {
  sender_name: string
  content: string | null
  created_at: string
}

interface AnalysisResult {
  summary: {
    winner: string
    most_active: string
    funniest_quote: string
    embarrassing_moment: string
    biggest_argument: string
    best_comeback: string
    weirdest_conversation: string
  } | null
  memories: {
    type: "PROMISE" | "EXCUSE" | "LIE" | "EMBARRASSING" | "FUNNY" | "CONTRADICTION"
    target_user: string
    target_user_id: string | null
    content: string
    context: string
    confidence: number
  }[]
  legendary_quotes: {
    user: string
    user_id: string | null
    quote: string
    context: string
  }[]
}

function buildPrompt(messages: MessageInput[], date: string, allUsers: string[]): string {
  const userList = allUsers.join(", ")
  const chatLog = messages
    .map((m) => `[${m.sender_name}]: ${m.content ?? "🎤 Voice message"}`)
    .join("\n")

  return `You are analyzing a private group chat between these people: ${userList}

Below is the chat conversation from ${date}. Analyze it and return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "summary": {
    "winner": "who had the best comebacks/roasts today?",
    "most_active": "who sent the most messages?",
    "funniest_quote": "the funniest line said today",
    "embarrassing_moment": "most embarrassing moment for someone",
    "biggest_argument": "what was the main argument about?",
    "best_comeback": "best roast or comeback",
    "weirdest_conversation": "weirdest topic discussed"
  },
  "memories": [
    {
      "type": "PROMISE|EXCUSE|LIE|EMBARRASSING|FUNNY|CONTRADICTION",
      "target_user": "person's name",
      "content": "what was said",
      "context": "brief context around it",
      "confidence": 0.0-1.0
    }
  ],
  "legendary_quotes": [
    {
      "user": "who said it",
      "quote": "the exact quote",
      "context": "what prompted it"
    }
  ]
}

Rules:
- If nothing notable happened, set summary fields to empty strings and return empty arrays
- For memories: only include clear examples with confidence > 0.7
- For legendary_quotes: only include truly hilarious or iconic lines
- target_user/user must match exactly one of: ${userList}

Chat:
${chatLog}`
}

export async function generateChaos(
  recentMessages: MessageInput[],
  userNames: string[]
): Promise<string | null> {
  if (!API_KEY) return null

  const chatLog = recentMessages
    .map((m) => `[${m.sender_name}]: ${m.content ?? "🎤 Voice message"}`)
    .join("\n")

  const msgCount = recentMessages.length
  const lengthGuide = msgCount < 10 ? "very short, exactly 1-2 sentences." : msgCount < 30 ? "2-3 sentences." : "3-4 sentences."

  const prompt = `You are a dramatic news anchor reporting on the chat conversation between ${userNames.join(" and ")}. Match the language and tone of the chat messages exactly.

Here are their recent messages:
${chatLog}

Rewrite this conversation as an overdramatic BREAKING NEWS article. Use dramatic headlines like "BREAKING NEWS", "Sources confirm", "In a shocking turn of events". Keep it ${lengthGuide} Return ONLY the article text, no explanations or markdown.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return text?.trim() ?? null
}

export async function generateRoast(
  summaries: { date: string; content: string }[],
  recentMessages: MessageInput[],
  userNames: string[],
  triggerUserName: string,
  userText?: string
): Promise<string | null> {
  if (!API_KEY) return null

  const targetName = userNames.find((n) => n !== triggerUserName) ?? userNames[0] ?? "them"

  const summaryBlock = summaries
    .map((s) => `--- ${s.date} ---\n${typeof s.content === "string" ? s.content : JSON.stringify(s.content)}`)
    .join("\n\n")

  const chatLog = recentMessages
    .map((m) => `[${m.sender_name}]: ${m.content ?? "🎤 Voice message"}`)
    .join("\n")

  const extraText = userText ? `\n${triggerUserName} specifically calls out: "${userText}"` : ""

  const prompt = `You are a funny AI assistant named Bakait. ${triggerUserName} asked you to roast ${targetName}. Match the language and tone of the chat messages exactly.

Here's the recent conversation context:
${chatLog}
${extraText}

Generate a VERY SHORT playful roast about ${targetName}. Maximum 2 lines. Reference specific things they said or did. Make it punchy and funny, like a friend teasing them. Don't roast ${triggerUserName}, only roast ${targetName}. Return ONLY the roast text, no explanations or markdown.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return text?.trim() ?? null
}

export async function chatAsBakait(
  userMessage: string,
  recentMessages: { sender_name: string; content: string | null }[],
  userNames: string[]
): Promise<string | null> {
  if (!API_KEY) return null

  const chatLog = recentMessages
    .map((m) => `[${m.sender_name}]: ${m.content ?? "🎤 Voice message"}`)
    .join("\n")

  const prompt = `You are Bakait, a witty and playful AI friend in a private chat between ${userNames.join(" and ")}. Match the language and tone of the chat messages exactly.

Here's the recent conversation context:
${chatLog}

${userNames[0]} says: "${userMessage}"

Respond as Bakait — be funny, playful, and engaging. Keep it under 2 sentences. Reference inside jokes or recent topics if relevant. Return ONLY your response text, no explanations.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 256 },
      }),
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return text?.trim() ?? null
}

export async function generateMeme(
  recentMessages: MessageInput[],
  userNames: string[],
  userPrompt?: string
): Promise<{ topText: string; bottomText: string } | null> {
  if (!API_KEY) return null

  const chatLog = recentMessages
    .map((m) => `[${m.sender_name}]: ${m.content ?? "🎤 Voice message"}`)
    .join("\n")

  const prompt = `You are a meme caption generator for a chat between ${userNames.join(" and ")}. Match the language and tone of the chat messages exactly.

Here are their recent messages:
${chatLog}
${userPrompt ? `\nThe user also wants it to be about this topic: "${userPrompt}" — blend it with what's happening in chat.` : ""}

Generate a meme with TOP text and BOTTOM text (classic meme format).
- Both parts should be SHORT — 1-3 words each
- Make it specific to the chat context${userPrompt ? " and the user's topic" : ""}
- Funny and punchy

Return ONLY in this exact format:
TOP: <top text>
BOTTOM: <bottom text>`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 128 },
      }),
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) return null

  const topMatch = text.match(/TOP:\s*(.+)/i)
  const bottomMatch = text.match(/BOTTOM:\s*(.+)/i)
  if (!topMatch || !bottomMatch) return null

  return { topText: topMatch[1].trim(), bottomText: bottomMatch[1].trim() }
}

export async function analyzeDay(
  messages: MessageInput[],
  date: string,
  userNames: string[],
  userNameToId: Record<string, string>
): Promise<AnalysisResult> {
  if (!API_KEY) return { summary: null, memories: [], legendary_quotes: [] }
  if (messages.length < 3) return { summary: null, memories: [], legendary_quotes: [] }

  const prompt = buildPrompt(messages, date, userNames)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  )

  if (!res.ok) return { summary: null, memories: [], legendary_quotes: [] }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { summary: null, memories: [], legendary_quotes: [] }

  let parsed: any
  try {
    const cleaned = text.replace(/```json?/g, "").replace(/```/g, "").trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return { summary: null, memories: [], legendary_quotes: [] }
  }

  return {
    summary: parsed.summary?.winner ? parsed.summary : null,
    memories: (parsed.memories ?? []).map((m: any) => ({
      ...m,
      target_user_id: userNameToId[m.target_user] ?? null,
    })),
    legendary_quotes: (parsed.legendary_quotes ?? []).map((q: any) => ({
      ...q,
      user_id: userNameToId[q.user] ?? null,
    })),
  }
}
