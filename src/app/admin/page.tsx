"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserX,
  MessageSquare,
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  Ban,
  Trash2,
  Crown,
  Database,
  Radio,
  Lock,
  KeyRound,
  LogOut,
} from "lucide-react"

interface Stats {
  totalUsers: number
  approvedUsers: number
  pendingUsers: number
  blockedUsers: number
  totalMessages: number
  totalConversations: number
  activeOnline: number
}

interface UserItem {
  id: string
  name: string
  username: string
  email: string
  status: "approved" | "pending" | "blocked"
  avatar_url: string | null
  created_at: string
  last_seen: string | null
}

interface ConvoItem {
  id: string
  name: string | null
  type: string
  created_at: string
  last_message_at: string
  user1: { name: string; email: string } | null
  user2: { name: string; email: string } | null
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [conversations, setConversations] = useState<ConvoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"metrics" | "users" | "conversations" | "broadcast">("metrics")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")

  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [publishingBroadcast, setPublishingBroadcast] = useState(false)

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return
    setPublishingBroadcast(true)
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage }),
      })
      if (res.ok) {
        setFeedback("📢 System Announcement Broadcasted to all squad members!")
        setBroadcastTitle("")
        setBroadcastMessage("")
        setTimeout(() => setFeedback(""), 4500)
      } else {
        const data = await res.json()
        setFeedback(data.error ?? "Failed to publish broadcast")
      }
    } catch {
      setFeedback("Failed to publish broadcast")
    } finally {
      setPublishingBroadcast(false)
    }
  }

  const [passwordInput, setPasswordInput] = useState("")
  const [authError, setAuthError] = useState("")
  const [authenticating, setAuthenticating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setAuthError("")
    try {
      const [statsRes, usersRes, convosRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery)}`),
        fetch("/api/admin/conversations"),
      ])

      if (statsRes.status === 401 || usersRes.status === 401) {
        setIsAuthenticated(false)
        return
      }

      if (statsRes.ok) {
        setStats(await statsRes.json())
        setIsAuthenticated(true)
      }

      if (usersRes.ok) {
        const uData = await usersRes.json()
        setUsers(uData.users ?? [])
      }

      if (convosRes.ok) {
        const cData = await convosRes.json()
        setConversations(cData.conversations ?? [])
      }
    } catch (err: any) {
      console.error("Failed to load admin data:", err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    setAuthenticating(true)
    setAuthError("")

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      })
      const data = await res.json()

      if (res.ok) {
        setIsAuthenticated(true)
        setPasswordInput("")
        loadData()
      } else {
        setAuthError(data.error ?? "Incorrect Admin Password")
      }
    } catch {
      setAuthError("Could not verify password")
    } finally {
      setAuthenticating(false)
    }
  }

  const handleAdminLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    setIsAuthenticated(false)
    setStats(null)
    setUsers([])
    setConversations([])
  }

  const [inspectUser, setInspectUser] = useState<UserItem | null>(null)
  const [inspectConvoId, setInspectConvoId] = useState<string | null>(null)
  const [inspectConvoName, setInspectConvoName] = useState<string>("")
  const [inspectMessages, setInspectMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const loadConvoMessages = async (convoId: string, name: string) => {
    setInspectConvoId(convoId)
    setInspectConvoName(name)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/admin/conversations/messages?conversationId=${convoId}`)
      const data = await res.json()
      if (res.ok) {
        setInspectMessages(data.messages ?? [])
      } else {
        setFeedback(data.error ?? "Failed to load messages")
      }
    } catch {
      setFeedback("Failed to load messages")
    } finally {
      setLoadingMessages(false)
    }
  }

  const deleteSingleMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/admin/conversations/messages?messageId=${messageId}`, { method: "DELETE" })
      if (res.ok) {
        setInspectMessages((prev) => prev.filter((m) => m.id !== messageId))
        setFeedback("✓ Message purged")
        setTimeout(() => setFeedback(""), 3000)
      }
    } catch {}
  }

  const startImpersonation = async (user: UserItem) => {
    setInspectUser(user)
    setFeedback(`🎭 Inspecting user: @${user.username} (${user.name})`)
    setTimeout(() => setFeedback(""), 4000)
  }

  const updateUserStatus = async (targetUserId: string, newStatus: "approved" | "pending" | "blocked") => {
    setActionLoading(targetUserId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback(`✓ Status updated to ${newStatus}`)
        loadData()
      } else {
        setFeedback(`Error: ${data.error ?? "Failed to update"}`)
      }
    } catch {
      setFeedback("Failed to update user status")
    } finally {
      setActionLoading(null)
      setTimeout(() => setFeedback(""), 3500)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Are you sure you want to purge this conversation and all its messages?")) return
    setActionLoading(conversationId)
    try {
      const res = await fetch(`/api/admin/conversations?conversationId=${conversationId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setFeedback("✓ Conversation purged")
        loadData()
      } else {
        setFeedback("Failed to delete conversation")
      }
    } catch {
      setFeedback("Failed to delete conversation")
    } finally {
      setActionLoading(null)
      setTimeout(() => setFeedback(""), 3500)
    }
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-purple-500/30 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Crown className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Bakaiti Admin Suite</h1>
            <p className="text-xs text-zinc-400">Enter Admin Secret Password to unlock dashboard</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Secret Password</span>
              </label>
              <input
                type="password"
                placeholder="Enter password (default: admin123)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-medium text-center bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                ⚠️ {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <p className="text-[11px] text-zinc-500 text-center">
            Set custom <code className="text-purple-400 font-mono">ADMIN_PASSWORD</code> in Vercel env vars.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Bakaiti Admin Suite</h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-semibold border border-purple-500/30">
                  PRIVATE ADMIN BRANCH
                </span>
              </div>
              <p className="text-xs text-zinc-400">Full system control, moderation, and squad analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Admin</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium text-center animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab("metrics")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "metrics"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Metrics & Health</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Moderation ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "conversations"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Conversations ({conversations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("broadcast")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "broadcast"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Radio className="w-4 h-4 text-purple-300" />
            <span>Broadcast Announcement 📢</span>
          </button>
        </div>

        {/* TAB 1: Metrics & Health */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Squad Users</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.totalUsers ?? 0}</div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="text-emerald-400 font-semibold">{stats?.approvedUsers ?? 0} Approved</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{stats?.pendingUsers ?? 0} Pending</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium uppercase tracking-wider">Active Online Now</span>
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">{stats?.activeOnline ?? 0}</div>
              <p className="text-[11px] text-zinc-400">Active in the last 5 minutes</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Messages Sent</span>
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.totalMessages ?? 0}</div>
              <p className="text-[11px] text-zinc-400">Across DMs and group chats</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Conversations</span>
                <Database className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats?.totalConversations ?? 0}</div>
              <p className="text-[11px] text-zinc-400">Active chat channels</p>
            </div>
          </div>
        )}

        {/* TAB 2: User Moderation */}
        {activeTab === "users" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Search squad members by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-zinc-100 placeholder-zinc-500 w-full"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-200">{u.name}</div>
                            <div className="text-[11px] text-zinc-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-zinc-400">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : u.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {u.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                          {u.status === "pending" && <ShieldAlert className="w-3 h-3" />}
                          {u.status === "blocked" && <UserX className="w-3 h-3" />}
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => startImpersonation(u)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white font-semibold text-[11px] transition-colors disabled:opacity-50"
                          title={`Inspect user details for ${u.name}`}
                        >
                          Inspect User 🎭
                        </button>
                        {u.status !== "approved" && (
                          <button
                            onClick={() => updateUserStatus(u.id, "approved")}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {u.status !== "blocked" && (
                          <button
                            onClick={() => updateUserStatus(u.id, "blocked")}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-medium text-[11px] transition-colors disabled:opacity-50"
                          >
                            Block
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Conversation Audit */}
        {activeTab === "conversations" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200">Active Conversations & Moderation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Type</th>
                    <th className="p-3">Name / Participants</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {conversations.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3 font-semibold uppercase text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {c.type}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-zinc-200">
                        {c.name ?? `${c.user1?.name ?? "User 1"} & ${c.user2?.name ?? "User 2"}`}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "No messages"}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() =>
                            loadConvoMessages(
                              c.id,
                              c.name ?? `${c.user1?.name ?? "User 1"} & ${c.user2?.name ?? "User 2"}`
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold transition-colors"
                        >
                          Inspect Chat 👁️
                        </button>
                        <button
                          onClick={() => deleteConversation(c.id)}
                          disabled={actionLoading === c.id}
                          className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-medium transition-colors"
                        >
                          Purge Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Broadcast System Announcement */}
        {activeTab === "broadcast" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                📢
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Broadcast System Announcement</h3>
                <p className="text-xs text-zinc-400">Publish a banner & push notification to all active squad members</p>
              </div>
            </div>

            <form onSubmit={sendBroadcast} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g., SYSTEM UPDATE, BACKEND MAINTENANCE, NEW FEATURE RELEASE"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Announcement Message</label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed broadcast message text to display across all active user screens..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={publishingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors shadow-lg shadow-purple-600/25 disabled:opacity-50"
                >
                  {publishingBroadcast ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Broadcast to Squad 🚀</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Conversation Inspector Modal */}
        {inspectConvoId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                    👁️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{inspectConvoName}</h3>
                    <p className="text-xs text-zinc-400">Live Conversation Message Inspection</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setInspectConvoId(null)
                    setInspectMessages([])
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Close ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-2 min-h-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12 text-zinc-400 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Fetching live conversation messages...</span>
                  </div>
                ) : inspectMessages.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No messages recorded in this conversation.
                  </div>
                ) : (
                  inspectMessages.map((m) => (
                    <div
                      key={m.id}
                      className="bg-zinc-950/80 border border-zinc-800 p-3.5 rounded-2xl space-y-1.5 group hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-purple-300">
                            {m.sender?.name ?? "Unknown User"}
                          </span>
                          <span className="text-[10px] text-zinc-500">@{m.sender?.username ?? "user"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                          <button
                            onClick={() => deleteSingleMessage(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                            title="Delete this message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {m.content && <p className="text-xs text-zinc-200 whitespace-pre-wrap">{m.content}</p>}

                      {m.media_url && (
                        <div className="mt-2">
                          {m.message_type === "image" || m.media_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img
                              src={m.media_url}
                              alt="Uploaded media"
                              className="max-h-48 rounded-xl object-cover border border-zinc-800"
                            />
                          ) : (
                            <a
                              href={m.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-purple-400 underline"
                            >
                              📎 View Attachment ({m.message_type ?? "media"})
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {/* User Inspector Modal */}
        {inspectUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30">
                    {inspectUser.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{inspectUser.name}</h3>
                    <p className="text-xs text-zinc-400">@{inspectUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Close ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Email</span>
                    <span className="font-mono text-zinc-200 truncate block">{inspectUser.email}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Account Status</span>
                    <span className="font-bold capitalize text-emerald-400">{inspectUser.status}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Joined Date</span>
                    <span className="text-zinc-300">{new Date(inspectUser.created_at).toLocaleString()}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Last Seen Active</span>
                    <span className="text-zinc-300">
                      {inspectUser.last_seen ? new Date(inspectUser.last_seen).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                {inspectUser.status !== "blocked" ? (
                  <button
                    onClick={() => {
                      updateUserStatus(inspectUser.id, "blocked")
                      setInspectUser(null)
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
                  >
                    Block User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      updateUserStatus(inspectUser.id, "approved")
                      setInspectUser(null)
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                  >
                    Approve / Unblock
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
