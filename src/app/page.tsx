"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Sparkles,
  MessageSquare,
  Flame,
  Zap,
  Download,
  ShieldCheck,
  Palette,
  Mic,
  Smile,
  Users,
  Bot,
  Send,
  CheckCheck,
  Terminal,
  Smartphone,
  Copy,
  Check,
  ChevronRight,
  Gift,
  HelpCircle,
  BarChart3,
  Moon,
  Volume2,
  Lock,
  ArrowRight,
  ExternalLink,
  Layers
} from "lucide-react"

// Types
type CommandCategory = "all" | "ai" | "fun" | "analytics" | "social"

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
    description: "Gemini AI roasts the recent chat or your specific message with brutal squad humor.",
    category: "ai",
    example: "/roast why is Rahul always 2 hours late?",
    badge: "Popular 🔥"
  },
  {
    name: "Chaos News",
    syntax: "/chaos [message]",
    description: "Turns squad chat drama into an unhinged sensational breaking news report.",
    category: "ai",
    example: "/chaos Aditya lost his gaming mouse",
    badge: "Wild 📰"
  },
  {
    name: "Memory Vault",
    syntax: "/remember @user",
    description: "Digs up past memories, legendary quotes, and unforgotten moments.",
    category: "ai",
    example: "/remember @pankaj"
  },
  {
    name: "Chat with Bakait",
    syntax: "@Bakait [prompt]",
    description: "Direct chat with squad AI assistant that speaks your group's slang & language.",
    category: "ai",
    example: "@Bakait plan a trip to Goa for 5 people",
    badge: "AI Core 🤖"
  },
  {
    name: "AI Meme Generator",
    syntax: "/meme [prompt]",
    description: "Generates custom meme images directly inside the chat stream using AI.",
    category: "ai",
    example: "/meme programmer debugging at 3 am",
    badge: "Image Gen 🎨"
  },
  {
    name: "Poll Creator",
    syntax: '/poll "Question" "Option A" "Option B"',
    description: "Interactive real-time poll with instant voting counts for squad decisions.",
    category: "social",
    example: '/poll "Dinner tonight?" "Biryani" "Pizza" "Dosa"'
  },
  {
    name: "Simp Meter",
    syntax: "/simps",
    description: "Ranks who replies fastest to whom in the squad with funny speed stats.",
    category: "analytics",
    example: "/simps",
    badge: "Stats ⚡"
  },
  {
    name: "Ghost Meter",
    syntax: "/ghost-meter",
    description: "Exposes who leaves people on read the most and total unseen message counts.",
    category: "analytics",
    example: "/ghost-meter"
  },
  {
    name: "Squad Fortune",
    syntax: "/fortune",
    description: "Bakait predicts your fortune, luck level, and squad fate for the day.",
    category: "fun",
    example: "/fortune"
  },
  {
    name: "Chat Mood Analysis",
    syntax: "/mood",
    description: "AI scans chat energy and gives a real-time vibe check & mood breakdown.",
    category: "analytics",
    example: "/mood"
  },
  {
    name: "Spam Repeater",
    syntax: "/spam <message> <count>",
    description: "Repeats a hype message up to 10 times for maximum squad attention.",
    category: "fun",
    example: "/spam WE ARE BACK 5"
  },
  {
    name: "Confetti Rain",
    syntax: "/confetti [emojis]",
    description: "Triggers a full-screen confetti burst with custom emojis across all devices.",
    category: "fun",
    example: "/confetti 🎉🚀🔥"
  },
  {
    name: "Fireworks Display",
    syntax: "/fireworks [emojis]",
    description: "Explodes celebratory fireworks across the screen for big wins.",
    category: "fun",
    example: "/fireworks ❤️🔥✨"
  },
  {
    name: "Rain Effect",
    syntax: "/rain [emojis]",
    description: "Creates atmospheric falling rain of emojis across the chat window.",
    category: "fun",
    example: "/rain 🌧️💙🌊"
  }
]

const THEME_PREVIEWS = [
  { id: "default", name: "Default Dark", bg: "bg-slate-950 border-slate-800", text: "text-slate-100", accent: "from-orange-500 to-amber-500", bubbleUser: "bg-orange-600 text-white", bubbleBot: "bg-slate-800 border-slate-700 text-slate-200" },
  { id: "orange", name: "Sunset Orange", bg: "bg-gradient-to-br from-orange-950 via-slate-950 to-pink-950 border-orange-800/40", text: "text-orange-100", accent: "from-orange-500 to-pink-500", bubbleUser: "bg-gradient-to-r from-orange-500 to-pink-500 text-white", bubbleBot: "bg-orange-900/40 border-orange-700/50 text-orange-100" },
  { id: "cyberpunk", name: "Cyberpunk Neon", bg: "bg-slate-950 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]", text: "text-cyan-300", accent: "from-fuchsia-500 to-cyan-400", bubbleUser: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.3)]", bubbleBot: "bg-slate-900 border-cyan-500/40 text-cyan-200" },
  { id: "discord", name: "Discord Night", bg: "bg-[#313338] border-[#404249]", text: "text-slate-100", accent: "from-indigo-500 to-blue-500", bubbleUser: "bg-[#5865F2] text-white", bubbleBot: "bg-[#2B2D31] border-[#383A40] text-slate-200" },
  { id: "whatsapp", name: "WhatsApp Emerald", bg: "bg-[#0b141a] border-[#1f2c34]", text: "text-emerald-50", accent: "from-emerald-500 to-teal-500", bubbleUser: "bg-[#005c4b] text-emerald-100", bubbleBot: "bg-[#202c33] border-[#2a3942] text-slate-200" },
  { id: "terminal", name: "Terminal Matrix", bg: "bg-black border-emerald-500/60 font-mono", text: "text-emerald-400", accent: "from-emerald-400 to-green-500", bubbleUser: "bg-emerald-950 border border-emerald-500 text-emerald-300", bubbleBot: "bg-zinc-900 border border-emerald-800 text-emerald-400" }
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<CommandCategory>("all")
  const [activeTheme, setActiveTheme] = useState("cyberpunk")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  // Interactive Chat State
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; isBot?: boolean; text: string; time: string; reaction?: string }>>([
    { id: "1", sender: "Aditya", text: "Hey squad! Who is up for gaming tonight?", time: "10:42 PM" },
    { id: "2", sender: "Pankaj", text: "/roast Rahul for joining 2 hours late yesterday 😂", time: "10:43 PM" },
    { id: "3", sender: "Bakait (AI)", isBot: true, text: "🔥 ROAST: Rahul doesn't join late, he just operates in GMT+2 (Grind Time + 2 Hours of Excuses). Last night he claimed his Wi-Fi was down, but his Steam profile was active playing CS2!", time: "10:43 PM", reaction: "🔥 4" },
    { id: "4", sender: "Rahul", text: "Yo Bakait didn't have to call me out like that 💀💀", time: "10:44 PM", reaction: "💀 3" }
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

  const handleSimulateSend = (inputOverride?: string) => {
    const textToSend = (inputOverride || chatInput).trim()
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

    // Simulate AI response logic
    setTimeout(() => {
      let botResponse = "⚡ Bakait is analyzing squad vibes..."
      const cmd = textToSend.toLowerCase()

      if (cmd.startsWith("/roast")) {
        botResponse = "🔥 ROAST: Your chat speed is slower than 2G internet in 2010. Even your notifications are asking if you're still alive!"
      } else if (cmd.startsWith("/chaos")) {
        botResponse = "📰 BREAKING NEWS: Squad chat reaches critical level of banter after user sends: '" + textToSend.replace("/chaos", "").trim() + "'. Authorities advise immediate emoji responses!"
      } else if (cmd.startsWith("/remember")) {
        botResponse = "🧠 MEMORY VAULT [2026-08-14]: 'I will definitely start working out from Monday' — Unanimously voted the most cap statement of the year."
      } else if (cmd.startsWith("@bakait")) {
        botResponse = "🤖 Bakait: I'm monitoring this chat 24/7. All vibes are optimal, roasting potential is at 98%!"
      } else if (cmd.startsWith("/simps")) {
        botResponse = "⚡ SPEED LEADERBOARD: 1. Aditya (Avg 4s) 🚀  2. Pankaj (Avg 12s)  3. Rahul (Avg 3 hrs 42 mins) 🐢"
      } else if (cmd.startsWith("/meme")) {
        botResponse = "🎨 MEME GENERATED: [Image: Spongebob Looking at Code] 'When your squad command executes on the first try without errors!'"
      } else if (cmd.startsWith("/fortune")) {
        botResponse = "🔮 SQUAD FORTUNE: Luck 99%. Tonight will yield maximum banter, zero sleep, and +50 legendary squad quotes."
      } else {
        botResponse = `🤖 Bakait: Got your message! Try slash commands like /roast, /chaos, /remember, or /simps!`
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "Bakait (AI)",
          isBot: true,
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reaction: "🔥 2"
        }
      ])
      setIsTyping(false)
    }, 1200)
  }

  const filteredCommands = activeTab === "all" 
    ? COMMANDS 
    : COMMANDS.filter(c => c.category === activeTab)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-400 group-hover:rotate-6 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Bakaiti
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Squad Chat Hub</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-orange-400 transition-colors">Features</a>
            <a href="#sandbox" className="hover:text-orange-400 transition-colors">Live Sandbox</a>
            <a href="#commands" className="hover:text-orange-400 transition-colors">AI Commands</a>
            <a href="#themes" className="hover:text-orange-400 transition-colors">Themes</a>
            <a href="#download" className="hover:text-orange-400 transition-colors">Download APK</a>
          </nav>

          {/* Auth & App Launch Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="group relative inline-flex items-center gap-2 text-sm font-bold text-slate-950 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 hover:brightness-110 px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-95"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-orange-400 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Private Friend Group Messaging & AI Assistant</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Where Your Squad Banter <br />
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Becomes Legendary.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Real-time chat, Gemini-powered roasts, meme generators, custom sticker packs, voice notes & squad analytics — engineered exclusively for your inner circle.
          </p>

          {/* Action CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 text-base font-bold text-white bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 hover:opacity-95 px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Join Squad / Sign In</span>
            </Link>
            
            <a
              href="#sandbox"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-6 py-4 rounded-2xl transition-colors"
            >
              <span>Try Live Demo Chat</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Key Feature Highlights Pill Bar */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Squad Isolated</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Gemini AI Integrated</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-400" />
              <span>6 Theme Packs</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>PWA & Android APK</span>
            </div>
          </div>
        </div>

        {/* HERO INTERACTIVE MOCK CHAT SANDBOX */}
        <div id="sandbox" className="mt-14 max-w-4xl mx-auto">
          <div className="relative rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            
            {/* Header of Mock Chat */}
            <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-950">A</div>
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-950">P</div>
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-950">R</div>
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950 ring-2 ring-slate-950">🤖</div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>OG Squad Room</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">4 Members Online • AI Bakait Active</p>
                </div>
              </div>

              {/* Quick Command Action Chips */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateSend("/roast squad speed")}
                  className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/30 transition-colors"
                >
                  ⚡ /roast
                </button>
                <button
                  onClick={() => handleSimulateSend("/chaos drama")}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold border border-purple-500/30 transition-colors"
                >
                  📰 /chaos
                </button>
                <button
                  onClick={() => handleSimulateSend("/simps")}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition-colors"
                >
                  📊 /simps
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[380px] overflow-y-auto font-sans bg-slate-950/40">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender === "You" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-xs font-bold ${m.isBot ? "text-amber-400 flex items-center gap-1" : "text-slate-400"}`}>
                      {m.isBot && <Sparkles className="w-3 h-3 text-amber-400" />}
                      {m.sender}
                    </span>
                    <span className="text-[10px] text-slate-500">{m.time}</span>
                  </div>

                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender === "You"
                      ? "bg-orange-600 text-white rounded-tr-none shadow-md shadow-orange-600/10"
                      : m.isBot
                      ? "bg-slate-900 border border-amber-500/30 text-amber-100 rounded-tl-none shadow-lg shadow-amber-500/5"
                      : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none"
                  }`}>
                    {m.text}
                    {m.reaction && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700/80 text-xs text-amber-300">
                        {m.reaction}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-amber-500/20 w-fit animate-pulse">
                  <Bot className="w-4 h-4 animate-spin" />
                  <span>Bakait is composing AI response...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type /roast, /chaos, /remember, or @Bakait..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSimulateSend()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <button
                onClick={() => handleSimulateSend()}
                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-bold flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID ("ALL THE THINGS") */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">Packed With Features</h2>
          <p className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Everything Your Squad Needs in One Place
          </p>
          <p className="text-slate-400 text-base sm:text-lg">
            Built from the ground up for friend group culture — no public discovery, zero noise, pure squad vibes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-orange-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">AI Squad Assistant (@Bakait)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Powered by Google Gemini. Responds in your exact language, remembers squad history, roasts slacking friends, and generates memes on demand.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Slash Commands & Roasts</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Run <code className="text-pink-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/roast</code>, <code className="text-pink-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/chaos</code>, or <code className="text-pink-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/remember</code> to instantly ignite the group chat with hilarity.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Custom Theme Packs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Personalize your view with 6 curated themes: Default Dark, Sunset Orange, Cyberpunk Neon, Discord Night, WhatsApp Emerald, and Matrix Terminal.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">HD Voice Notes & Audio</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              One-tap audio recording compatible across Web and iOS Safari. Built-in sound effects and media lightbox player for high quality sharing.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Squad Analytics & Simp Meter</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Uncover squad secret stats! Track response speeds with <code className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/simps</code> and expose read-receipt ghosts with <code className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/ghost-meter</code>.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Admin Approval & Privacy</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No random strangers. Registration requires explicit admin approval. Direct chats require friend request acceptance first.
            </p>
          </div>
        </div>
      </section>

      {/* THEMES DEMO SHOWCASE */}
      <section id="themes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 bg-slate-950/40">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-pink-400">Custom Aesthetic</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">Interactive Theme Switcher</p>
          <p className="text-slate-400 text-sm sm:text-base">
            Click any theme below to preview how Bakaiti dynamically transforms its entire interface for your squad!
          </p>
        </div>

        {/* Theme Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {THEME_PREVIEWS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(t.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTheme === t.id
                  ? "bg-slate-800 text-white ring-2 ring-orange-500 shadow-lg scale-105"
                  : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${t.accent}`} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {/* Theme Preview Box */}
        <div className="max-w-2xl mx-auto">
          <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-500 shadow-2xl ${selectedTheme.bg} ${selectedTheme.text}`}>
            <div className="flex items-center justify-between border-b pb-4 mb-6 opacity-80 border-current">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">S</div>
                <div>
                  <h4 className="font-bold text-sm">Preview: {selectedTheme.name}</h4>
                  <span className="text-[11px] opacity-75">Theme active</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full border border-current font-semibold">Active</span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-start">
                <span className="text-[10px] opacity-60 mb-1">Aditya</span>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${selectedTheme.bubbleBot}`}>
                  Check out this new theme preset! Looks sick right? 🔥
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] opacity-60 mb-1">You</span>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${selectedTheme.bubbleUser}`}>
                  Hell yeah! Switching chat themes in Bakaiti is instant! 🚀
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI COMMANDS CHEAT SHEET */}
      <section id="commands" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Command Center</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">All Bakaiti Slash Commands</p>
          <p className="text-slate-400 text-sm sm:text-base">
            Type <code className="text-orange-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">/</code> in any conversation composer to bring up the instant command picker!
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {(["all", "ai", "fun", "analytics", "social"] as CommandCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === cat
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat === "ai" ? "🤖 AI Intelligence" : cat === "fun" ? "🎉 Fun & Effects" : cat === "analytics" ? "📊 Squad Stats" : cat === "social" ? "👥 Social & Polls" : "All Commands"}
            </button>
          ))}
        </div>

        {/* Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommands.map((cmd, idx) => (
            <div
              key={cmd.name}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <code className="text-sm font-bold text-orange-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {cmd.syntax}
                  </code>
                  {cmd.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {cmd.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mb-1">{cmd.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{cmd.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[70%] font-mono text-[11px] text-slate-500">
                  e.g. {cmd.example}
                </span>
                <button
                  onClick={() => handleCopyCommand(cmd.example, idx)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DOWNLOAD APK & PWA SECTION */}
      <section id="download" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-12 relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Ready</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Install Bakaiti on Mobile or Desktop
              </h2>

              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Enjoy full native Android app support built with Capacitor or install as a Progressive Web App (PWA) on iOS & Web with offline fallbacks and push notifications.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href="https://github.com/Pankaj4152/Bakaiti/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Android APK</span>
                </a>

                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>Open Web PWA App</span>
                </Link>
              </div>
            </div>

            {/* Install Guide Card */}
            <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <span>Quick Installation Steps</span>
              </h3>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-400">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">1</span>
                  <span><strong>Sign Up:</strong> Create an account with your email and set your display username.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">2</span>
                  <span><strong>Admin Approval:</strong> An existing squad admin approves your account access.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">3</span>
                  <span><strong>Add Friends:</strong> Search exact usernames, send friend requests, and start chatting!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
            B
          </div>
          <span className="font-bold text-slate-300">Bakaiti Hub</span>
          <span>© {new Date().getFullYear()} Private Friend Group Chat</span>
        </div>

        <div className="flex items-center gap-6 text-slate-400">
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/chat" className="hover:text-white transition-colors">Launch Chat</Link>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#commands" className="hover:text-white transition-colors">AI Commands</a>
        </div>
      </footer>

    </div>
  )
}
