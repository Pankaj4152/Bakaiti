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
  ExternalLink,
  Layers
} from "lucide-react"

type CommandCategory = "all" | "ai" | "fun" | "analytics"

interface CommandInfo {
  name: string
  syntax: string
  description: string
  category: CommandCategory
  example: string
  badge?: string
}

const COMMANDS: CommandInfo[] = [
  {
    name: "AI Roast",
    syntax: "/roast [message]",
    description: "Gemini AI roasts the conversation with sharp squad humor.",
    category: "ai",
    example: "/roast why is Rahul always late?",
    badge: "Popular 🔥"
  },
  {
    name: "Chaos News",
    syntax: "/chaos [message]",
    description: "Turns chat banter into a sensational breaking news report.",
    category: "ai",
    example: "/chaos Aditya lost his gaming mouse"
  },
  {
    name: "Memory Vault",
    syntax: "/remember @user",
    description: "Digs up past quotes, legendary moments, and squad history.",
    category: "ai",
    example: "/remember @pankaj"
  },
  {
    name: "Chat with Bakait",
    syntax: "@Bakait [prompt]",
    description: "Direct chat with squad AI assistant speaking your slang.",
    category: "ai",
    example: "@Bakait plan a trip to Goa for 5 people",
    badge: "AI Core 🤖"
  },
  {
    name: "AI Meme Generator",
    syntax: "/meme [prompt]",
    description: "Generates custom meme images directly inside the chat.",
    category: "ai",
    example: "/meme programmer debugging at 3 am"
  },
  {
    name: "Poll Creator",
    syntax: '/poll "Question" "Option A" "Option B"',
    description: "Interactive poll with real-time vote counters for squad decisions.",
    category: "fun",
    example: '/poll "Dinner tonight?" "Biryani" "Pizza"'
  },
  {
    name: "Simp Meter",
    syntax: "/simps",
    description: "Ranks who replies fastest to whom in the squad.",
    category: "analytics",
    example: "/simps",
    badge: "Stats ⚡"
  },
  {
    name: "Ghost Meter",
    syntax: "/ghost-meter",
    description: "Exposes who leaves people on read most often.",
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
    description: "AI scans chat energy and gives a real-time vibe check.",
    category: "analytics",
    example: "/mood"
  },
  {
    name: "Spam Repeater",
    syntax: "/spam <message> <count>",
    description: "Repeats a message up to 10 times for hype.",
    category: "fun",
    example: "/spam WE ARE BACK 5"
  },
  {
    name: "Confetti Rain",
    syntax: "/confetti [emojis]",
    description: "Triggers a full-screen confetti burst with emojis.",
    category: "fun",
    example: "/confetti 🎉🚀🔥"
  }
]

const THEME_PREVIEWS = [
  { id: "default", name: "Sapphire Indigo", bg: "bg-white border-slate-200", text: "text-slate-900", bubbleUser: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm", bubbleBot: "bg-indigo-50/80 border-indigo-100 text-indigo-950 font-medium" },
  { id: "orange", name: "Sunset Ember", bg: "bg-orange-50/60 border-orange-200", text: "text-orange-950", bubbleUser: "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm", bubbleBot: "bg-orange-100/70 border-orange-200 text-orange-950 font-medium" },
  { id: "cyberpunk", name: "Neon Cyberpunk", bg: "bg-slate-950 border-cyan-500/40", text: "text-cyan-100", bubbleUser: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.3)]", bubbleBot: "bg-slate-900 border-cyan-500/30 text-cyan-200 font-medium" },
  { id: "discord", name: "Discord Midnight", bg: "bg-[#313338] border-[#404249]", text: "text-slate-100", bubbleUser: "bg-[#5865F2] text-white shadow-sm", bubbleBot: "bg-[#2B2D31] border-[#383A40] text-slate-200 font-medium" },
  { id: "whatsapp", name: "WhatsApp Emerald", bg: "bg-[#efeae2] border-[#d1c7b7]", text: "text-zinc-900", bubbleUser: "bg-[#005c4b] text-white shadow-sm", bubbleBot: "bg-white border-zinc-200 text-zinc-800 font-medium" },
  { id: "terminal", name: "Matrix Terminal", bg: "bg-black border-emerald-500/50 font-mono", text: "text-emerald-400", bubbleUser: "bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-sm", bubbleBot: "bg-zinc-900 border border-zinc-800 text-emerald-400 font-medium" }
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<CommandCategory>("all")
  const [activeTheme, setActiveTheme] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Interactive Demo Chat
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; isBot?: boolean; text: string; time: string }>>([
    { id: "1", sender: "Aditya", text: "Hey squad! Who's up for gaming tonight?", time: "08:15 PM" },
    { id: "2", sender: "Pankaj", text: "/roast Rahul for joining 2 hours late yesterday 😂", time: "08:16 PM" },
    { id: "3", sender: "Bakait (AI)", isBot: true, text: "🔥 ROAST: Rahul doesn't join late, he just operates on GMT+2 (Grind Time + 2 Hours of Excuses). Last night he claimed Wi-Fi was down while playing CS2!", time: "08:16 PM" }
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
        botResponse = "🔥 ROAST: Your chat speed is slower than 2G Wi-Fi in 2010. Even your notification sounds are lagging!"
      } else if (cmd.startsWith("/chaos")) {
        botResponse = "📰 BREAKING NEWS: Unprecedented squad debate triggered after message: '" + textToSend.replace("/chaos", "").trim() + "'."
      } else if (cmd.startsWith("/remember")) {
        botResponse = "🧠 MEMORY VAULT [2026-08-14]: 'I will start working out from Monday' — Unanimously voted cap statement of the year."
      } else if (cmd.startsWith("@bakait")) {
        botResponse = "🤖 Bakait: Online and active 24/7. Ready for roasts, memes, and squad banter."
      } else if (cmd.startsWith("/simps")) {
        botResponse = "⚡ RECOVERY SPEED: 1. Aditya (Avg 4s) 🚀  2. Pankaj (Avg 12s)  3. Rahul (Avg 3 hrs)"
      } else {
        botResponse = "🤖 Bakait: Received! Try typing /roast, /chaos, or /simps."
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
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* Background Subtle Accent Gradients */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-200/20 via-pink-100/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                Bakaiti
              </span>
              <span className="text-[10px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                v2.0
              </span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">Live Demo</a>
            <a href="#commands" className="hover:text-indigo-600 transition-colors">Commands</a>
            <a href="#themes" className="hover:text-indigo-600 transition-colors">Themes</a>
            <a href="#download" className="hover:text-indigo-600 transition-colors">Download</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-950 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="group text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:opacity-95 px-4.5 py-2 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-16 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        
        {/* Sleek Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm text-xs font-semibold text-indigo-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Private Squad Messenger & AI Intelligence</span>
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Where Your Squad Banter <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Becomes Legendary.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Real-time group chat, Gemini AI roasts, meme generators, custom sticker packs, voice notes & squad analytics — crafted for your inner circle.
        </p>

        {/* CTA Buttons */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:brightness-110 px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Join Squad / Sign In</span>
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 px-6 py-3.5 rounded-xl shadow-xs transition-colors"
          >
            <span>Try Live Demo</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>
        </div>

        {/* Minimal Feature Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Squad Isolated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Gemini AI Integrated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-purple-600" />
            <span>6 Aesthetic Themes</span>
          </div>
        </div>

      </section>

      {/* INTERACTIVE DEMO CHAT */}
      <section id="demo" className="py-6 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          
          {/* Card Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">A</div>
                <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">P</div>
                <div className="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">R</div>
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-bold ring-2 ring-slate-900">🤖</div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>OG Squad Room</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </h3>
                <p className="text-[11px] text-slate-400">4 Online • Try commands below</p>
              </div>
            </div>

            {/* Quick Command Action Chips */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSimulateSend("/roast squad speed")}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                🔥 /roast
              </button>
              <button
                onClick={() => handleSimulateSend("/simps")}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                ⚡ /simps
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="p-4 sm:p-6 space-y-3 max-h-[340px] overflow-y-auto bg-slate-50/40">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === "You" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-xs font-semibold ${m.isBot ? "text-amber-700 flex items-center gap-1" : "text-slate-500"}`}>
                    {m.isBot && <Sparkles className="w-3 h-3 text-amber-500" />}
                    {m.sender}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.time}</span>
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === "You"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-sm"
                    : m.isBot
                    ? "bg-amber-500/10 border border-amber-500/25 text-amber-950 rounded-tl-none font-medium"
                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="text-xs text-amber-800 flex items-center gap-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200/80 w-fit animate-pulse">
                <Bot className="w-4 h-4 animate-spin text-amber-600" />
                <span>Bakait is typing response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type /roast, /chaos, /remember, or @Bakait..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimulateSend()}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleSimulateSend()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Built For Squads</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Everything your group needs</p>
          <p className="text-sm text-slate-500">Designed strictly for friend group banter — clean, private, and fast.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Gemini AI Assistant</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mention <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">@Bakait</code> in chats for answers, squad context memory, and automated roasts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-4 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Slash Commands</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Run <code className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono">/roast</code>, <code className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono">/chaos</code>, <code className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono">/poll</code>, or <code className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono">/remember</code> right from composer.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-pink-300 hover:shadow-md hover:shadow-pink-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 mb-4 group-hover:scale-105 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Aesthetic Theme Packs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Switch themes anytime: Sapphire Indigo, Sunset Ember, Neon Cyberpunk, Discord Night, and Matrix Terminal.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-4 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Voice Notes & Media</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              HD audio message recorder compatible with Web and iOS Safari, sticker packs, and image lightbox.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Squad Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Uncover secret stats! Track who replies fastest with <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">/simps</code> and who ghosts with <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">/ghost-meter</code>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/5 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4 group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Admin Approval</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict private registration requiring admin approval so only your verified squad can join.
            </p>
          </div>

        </div>
      </section>

      {/* THEME PREVIEW SECTION */}
      <section id="themes" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80 bg-slate-900 text-white rounded-3xl my-8 shadow-xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Customization</h2>
          <p className="text-3xl font-extrabold text-white">Interactive Theme Switcher</p>
          <p className="text-xs text-slate-400">Click any theme preset below to test live chat styling.</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {THEME_PREVIEWS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTheme === t.id
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md scale-105"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Preview Card */}
        <div className="max-w-xl mx-auto">
          <div className={`p-6 rounded-2xl border shadow-xl transition-all duration-300 ${selectedTheme.bg} ${selectedTheme.text}`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-current opacity-40">
              <span className="text-xs font-bold">Theme: {selectedTheme.name}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">Live Preview</span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col items-start">
                <div className={`rounded-xl px-4 py-2.5 text-xs ${selectedTheme.bubbleBot}`}>
                  Check out how clean this chat theme looks!
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className={`rounded-xl px-4 py-2.5 text-xs ${selectedTheme.bubbleUser}`}>
                  Instant theme switching in Bakaiti 🚀
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMANDS DIRECTORY */}
      <section id="commands" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Command Center</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Slash Commands Directory</p>
          <p className="text-xs text-slate-500">Type <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">/</code> in any conversation to bring up the command menu.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {(["all", "ai", "fun", "analytics"] as CommandCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  activeTab === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat === "all" ? "All Commands" : cat === "ai" ? "🤖 AI Commands" : cat === "fun" ? "🎉 Fun & Effects" : "📊 Squad Stats"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Command Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredCommands.map((cmd, idx) => (
            <div key={cmd.name} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5 hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <code className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
                  {cmd.syntax}
                </code>
                <button
                  onClick={() => handleCopyCommand(cmd.example, idx)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{cmd.name}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{cmd.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOWNLOAD & APP ACCESS */}
      <section id="download" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile & PWA Supported</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Install Bakaiti on Mobile</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Use as an installable Progressive Web App (PWA) on iOS & Web, or download the native Android APK build.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href="https://github.com/Pankaj4152/Bakaiti/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Android APK</span>
            </a>
            <Link
              href="/chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Open Web App</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 py-10 px-4 sm:px-6 max-w-5xl mx-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            B
          </div>
          <span className="font-bold text-slate-900">Bakaiti</span>
          <span>© {new Date().getFullYear()} Private Squad Messenger</span>
        </div>

        <div className="flex items-center gap-5 text-slate-600 font-semibold">
          <Link href="/login" className="hover:text-indigo-600 transition-colors">Sign In</Link>
          <Link href="/chat" className="hover:text-indigo-600 transition-colors">Web App</Link>
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#commands" className="hover:text-indigo-600 transition-colors">Commands</a>
        </div>
      </footer>

    </div>
  )
}
