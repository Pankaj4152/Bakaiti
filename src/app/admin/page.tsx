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
  ArrowLeft,
  Crown,
  Database,
  Radio,
} from "lucide-react"
import Link from "next/link"

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
  const [activeTab, setActiveTab] = useState<"metrics" | "users" | "conversations">("metrics")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")

  const [unauthorized, setUnauthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setUnauthorized(false)
    setErrorMessage("")
    try {
      const [statsRes, usersRes, convosRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery)}`),
        fetch("/api/admin/conversations"),
      ])

      if (statsRes.status === 401 || usersRes.status === 401) {
        setUnauthorized(true)
        return
      }

      if (statsRes.ok) setStats(await statsRes.json())
      else {
        const errJson = await statsRes.json().catch(() => ({}))
        setErrorMessage(errJson.error ?? "Failed to fetch admin stats")
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
      setErrorMessage(err?.message ?? "Error connecting to server")
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>

        {unauthorized && (
          <div className="bg-zinc-900 border border-purple-500/30 p-8 rounded-2xl text-center space-y-4 max-w-md mx-auto shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
              <Crown className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Admin Authentication Required</h2>
              <p className="text-xs text-zinc-400">
                You must sign in with an approved admin account to view live analytics, moderate users, and inspect conversations.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-600/25 w-full"
            >
              Sign In to Admin Panel
            </Link>
          </div>
        )}

        {errorMessage && !unauthorized && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center">
            ⚠️ {errorMessage}
          </div>
        )}

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
                      <td className="p-3 text-right">
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
      </div>
    </div>
  )
}
