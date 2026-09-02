"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  MessageSquare,
  Sparkles,
  Zap,
  Download,
  ShieldCheck,
  Palette,
  Mic,
  Send,
  Smartphone,
  Copy,
  Check,
  ChevronRight,
  BarChart3,
  Bot,
  ArrowRight,
  Flame,
  Search,
  Lock,
  Layers,
  ExternalLink
} from "lucide-react"

type CommandCategory = "all" | "ai" | "fun" | "analytics"

interface CommandInfo {
  name: string
  syntax: string
  description: string
  category: CommandCategory
  example: string
}

const COMMANDS: CommandInfo[] = [
  {
    name: "AI Roast",
    syntax: "/roast [message]",
    description: "Gemini AI roasts the conversation or context with squad humor.",
    category: "ai",
    example: "/roast why is Rahul always late?"
  },
  {
    name: "Chaos News",
    syntax: "/chaos [message]",
    description: "Turns chat banter into a breaking news report.",
    category: "ai",
    example: "/chaos Aditya lost his gaming mouse"
  },
  {
    name: "Memory Vault",
    syntax: "/remember @user",
    description: "Digs up past quotes and squad memories.",
    category: "ai",
    example: "/remember @pankaj"
  },
  {
    name: "Chat with Bakait",
    syntax: "@Bakait [prompt]",
    description: "Direct chat with squad AI assistant.",
    category: "ai",
    example: "@Bakait recommend dinner places"
  },
  {
    name: "AI Meme Generator",
    syntax: "/meme [prompt]",
    description: "Generates custom meme images directly in chat.",
    category: "ai",
    example: "/meme programmer debugging at 3 am"
  },
  {
    name: "Poll Creator",
    syntax: '/poll "Question" "Option A" "Option B"',
    description: "Create interactive polls with live vote tracking.",
    category: "fun",
    example: '/poll "Dinner?" "Biryani" "Pizza"'
  },
  {
    name: "Simp Meter",
    syntax: "/simps",
    description: "Leaderboard of who replies fastest to whom.",
    category: "analytics",
    example: "/simps"
  },
  {
    name: "Ghost Meter",
    syntax: "/ghost-meter",
    description: "Tracks who leaves messages on read most.",
    category: "analytics",
    example: "/ghost-meter"
  },
  {
    name: "Squad Fortune",
    syntax: "/fortune",
    description: "Bakait predicts your luck and daily squad fortune.",
    category: "fun",
    example: "/fortune"
  },
  {
    name: "Chat Mood",
    syntax: "/mood",
    description: "Analyzes the current chat vibe and mood.",
    category: "analytics",
    example: "/mood"
  },
  {
    name: "Spam Repeater",
    syntax: "/spam <message> <count>",
    description: "Repeats a message up to 10 times.",
    category: "fun",
    example: "/spam HYPE 5"
  },
  {
    name: "Confetti Rain",
    syntax: "/confetti [emojis]",
    description: "Full-screen confetti effect with emojis.",
    category: "fun",
    example: "/confetti 🎉🚀"
  }
]

const THEME_PREVIEWS = [
  { id: "default", name: "Default Light", bg: "bg-white border-zinc-200", text: "text-zinc-900", bubbleUser: "bg-zinc-900 text-white", bubbleBot: "bg-zinc-100 border-zinc-200 text-zinc-800" },
  { id: "orange", name: "Warm Orange", bg: "bg-orange-50/50 border-orange-200", text: "text-orange-950", bubbleUser: "bg-orange-600 text-white", bubbleBot: "bg-orange-100/80 border-orange-200 text-orange-900" },
  { id: "cyberpunk", name: "Cyberpunk", bg: "bg-slate-900 border-cyan-500/40", text: "text-cyan-100", bubbleUser: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white", bubbleBot: "bg-slate-800 border-slate-700 text-cyan-200" },
  { id: "discord", name: "Discord", bg: "bg-[#313338] border-[#404249]", text: "text-slate-100", bubbleUser: "bg-[#5865F2] text-white", bubbleBot: "bg-[#2B2D31] border-[#383A40] text-slate-200" },
  { id: "whatsapp", name: "WhatsApp", bg: "bg-[#efeae2] border-[#d1c7b7]", text: "text-zinc-900", bubbleUser: "bg-[#005c4b] text-white", bubbleBot: "bg-white border-zinc-200 text-zinc-800" },
  { id: "terminal", name: "Terminal", bg: "bg-black border-emerald-500/40 font-mono", text: "text-emerald-400", bubbleUser: "bg-emerald-950 border border-emerald-500 text-emerald-300", bubbleBot: "bg-zinc-900 border border-zinc-800 text-emerald-400" }
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<CommandCategory>("all")
  const [activeTheme, setActiveTheme] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Interactive Demo Chat
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; isBot?: boolean; text: string; time: string }>>([
    { id: "1", sender: "Aditya", text: "Who's up for dinner tonight?", time: "08:15 PM" },
    { id: "2", sender: "Pankaj", text: "/roast Rahul for missing the match", time: "08:16 PM" },
    { id: "3", sender: "Bakait (AI)", isBot: true, text: "🔥 ROAST: Rahul claims he was busy studying, but his Discord status said 'Playing Valorant for 6 hours straight'.", time: "08:16 PM" }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const selectedTheme = THEME_PREVIEWS.find(t => t.id === activeTheme) || THEME_PREVIEWS[0]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleCopyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSimulateSend = (overrideText?: string) => {
    const textToSend = (overrideText || chatInput).trim()
    if (!textToSend) return

    const userMsg = {
      id: Date.now().toString(),
      sender: "You",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setChatInput("")
    setIsTyping(true)

    setTimeout(() => {
      let botResponse = "🤖 Bakait processed your message."
      const cmd = textToSend.toLowerCase()

      if (cmd.startsWith("/roast")) {
        botResponse = "🔥 ROAST: Your chat speed is slower than 2G Wi-Fi. Even your notification sounds are lagging!"
      } else if (cmd.startsWith("/chaos")) {
        botResponse = "📰 BREAKING NEWS: Unprecedented squad debate triggered after message: '" + textToSend.replace("/chaos", "").trim() + "'."
      } else if (cmd.startsWith("/remember")) {
        botResponse = "🧠 MEMORY: 'We will start working out from Monday' — Voted top squad quote of the year."
      } else if (cmd.startsWith("@bakait")) {
        botResponse = "🤖 Bakait: Online and ready. Type /roast, /chaos, or /simps to trigger commands."
      } else if (cmd.startsWith("/simps")) {
        botResponse = "⚡ RECOVERY SPEED: 1. Aditya (Avg 5s)  2. Pankaj (Avg 14s)  3. Rahul (Avg 2 hrs)"
      } else {
        botResponse = "🤖 Bakait: Received! Try typing /roast, /chaos, or /poll."
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "Bakait (AI)",
          isBot: true,
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
      setIsTyping(false)
    }, 1000)
  }

  const filteredCommands = COMMANDS.filter(c => {
    const matchesCategory = activeTab === "all" || c.category === activeTab
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.syntax.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
              B
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900">Bakaiti</span>
              <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                v2.0
              </span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#demo" className="hover:text-zinc-900 transition-colors">Demo</a>
            <a href="#commands" className="hover:text-zinc-900 transition-colors">Commands</a>
            <a href="#themes" className="hover:text-zinc-900 transition-colors">Themes</a>
            <a href="#download" className="hover:text-zinc-900 transition-colors">Download</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-16 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        
        {/* Simple Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Private friend group chat & AI tools</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 leading-tight">
          Private messaging built <br className="hidden sm:inline" /> for your inner circle.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Real-time group chat, Gemini AI roasts, custom sticker packs, voice notes, and squad analytics — clean, simple, and private.
        </p>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-lg shadow-sm transition-colors"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 px-5 py-3 rounded-lg transition-colors"
          >
            <span>Try Interactive Demo</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </a>
        </div>

      </section>

      {/* INTERACTIVE DEMO CHAT */}
      <section id="demo" className="py-8 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Card Header */}
          <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white">A</div>
                <div className="w-7 h-7 rounded-full bg-zinc-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white">P</div>
                <div className="w-7 h-7 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white">🤖</div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900">Squad Demo Room</h3>
                <p className="text-[11px] text-zinc-500">Live preview • Try slash commands</p>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSimulateSend("/roast squad")}
                className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium border border-zinc-200 transition-colors"
              >
                /roast
              </button>
              <button
                onClick={() => handleSimulateSend("/simps")}
                className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium border border-zinc-200 transition-colors"
              >
                /simps
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 sm:p-6 space-y-3 max-h-[320px] overflow-y-auto bg-white">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === "You" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-xs font-medium text-zinc-500">{m.sender}</span>
                  <span className="text-[10px] text-zinc-400">{m.time}</span>
                </div>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                  m.sender === "You"
                    ? "bg-zinc-900 text-white rounded-tr-none"
                    : m.isBot
                    ? "bg-amber-50 border border-amber-200 text-amber-950 rounded-tl-none font-medium"
                    : "bg-zinc-100 text-zinc-800 border border-zinc-200/60 rounded-tl-none"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="text-xs text-zinc-500 flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-200 w-fit">
                <Bot className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                <span>Bakait is replying...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type /roast, /chaos, /simps, or @Bakait..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimulateSend()}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
            <button
              onClick={() => handleSimulateSend()}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Core Features</h2>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900">Simple, powerful group tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Gemini AI Assistant</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Mention <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">@Bakait</code> in group chats for smart answers, roasts, memes, and squad context.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Slash Commands</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Instant command execution with <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/roast</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/chaos</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/poll</code>, and <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/remember</code>.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Theme Packs</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Customize your view with Default Light, Sunset Orange, Cyberpunk, Discord, WhatsApp, and Terminal presets.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Voice Notes & Media</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              One-tap iOS-compatible voice message recording, sticker upload packs, and full-screen media lightbox.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Squad Analytics</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Track reply speeds with <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/simps</code> and expose read-receipt ghosts with <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">/ghost-meter</code>.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Admin Approval</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Strictly private registration requiring squad admin authorization before access is granted.
            </p>
          </div>

        </div>
      </section>

      {/* THEME PREVIEW SECTION */}
      <section id="themes" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-200/80">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customization</h2>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900">Theme Switcher Preview</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {THEME_PREVIEWS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTheme === t.id
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Preview Card */}
        <div className="max-w-xl mx-auto">
          <div className={`p-5 rounded-xl border shadow-sm transition-all duration-300 ${selectedTheme.bg} ${selectedTheme.text}`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-current opacity-40">
              <span className="text-xs font-bold">Theme: {selectedTheme.name}</span>
              <span className="text-[10px] uppercase font-semibold">Live Preview</span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col items-start">
                <div className={`rounded-xl px-3.5 py-2 text-xs ${selectedTheme.bubbleBot}`}>
                  Check out how clean this chat theme looks!
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className={`rounded-xl px-3.5 py-2 text-xs ${selectedTheme.bubbleUser}`}>
                  Instant theme switching in Bakaiti 🚀
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMANDS DIRECTORY */}
      <section id="commands" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-200/80">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Slash Commands</h2>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900">Command Directory</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {(["all", "ai", "fun", "analytics"] as CommandCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  activeTab === cat
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {cat === "all" ? "All" : cat === "ai" ? "AI" : cat === "fun" ? "Fun" : "Analytics"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Command Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredCommands.map((cmd, idx) => (
            <div key={cmd.name} className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  {cmd.syntax}
                </code>
                <button
                  onClick={() => handleCopyCommand(cmd.example, idx)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                >
                  {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">{cmd.name}</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">{cmd.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOWNLOAD & APP ACCESS */}
      <section id="download" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-200/80">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-2xl font-bold text-zinc-900">Install Bakaiti App</h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              Available as a Progressive Web App (PWA) on iOS & Web or download the native Android APK build.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href="https://github.com/Pankaj4152/Bakaiti/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Android APK</span>
            </a>
            <Link
              href="/chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 font-medium text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              <span>Open Web App</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200/80 py-8 px-4 sm:px-6 max-w-5xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-900">Bakaiti</span>
          <span>© {new Date().getFullYear()} Private Friend Group Messaging</span>
        </div>

        <div className="flex items-center gap-4 text-zinc-600">
          <Link href="/login" className="hover:text-zinc-900 transition-colors">Sign In</Link>
          <Link href="/chat" className="hover:text-zinc-900 transition-colors">Web App</Link>
          <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
          <a href="#commands" className="hover:text-zinc-900 transition-colors">Commands</a>
        </div>
      </footer>

    </div>
  )
}
