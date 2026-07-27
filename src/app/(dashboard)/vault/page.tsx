import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const memoryLabels: Record<string, { label: string; color: string }> = {
  PROMISE: { label: "Promise 💀", color: "text-yellow-500" },
  EXCUSE: { label: "Excuse 🙄", color: "text-orange-500" },
  LIE: { label: "Lie 🤥", color: "text-red-500" },
  EMBARRASSING: { label: "Embarrassing 😬", color: "text-pink-500" },
  FUNNY: { label: "Funny 😂", color: "text-green-500" },
  CONTRADICTION: { label: "Contradiction 🔄", color: "text-purple-500" },
}

export default async function VaultPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()
  if (!profile) redirect("/login")

  const [{ data: memories }, { data: quotes }, { data: summaries }] = await Promise.all([
    supabase.from("memories").select("*, target_user:allowed_users!target_user_id(name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("legendary_quotes").select("*, user:allowed_users(name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("daily_summaries").select("*").order("date", { ascending: false }).limit(10),
  ])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">The Vault</h1>
        <p className="text-sm text-muted-foreground -mt-4">AI-scanned memories, quotes & daily recaps</p>

        {summaries && summaries.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Daily Recaps</h2>
            <div className="space-y-3">
              {summaries.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s.date}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {s.content.winner && <p>🏆 <strong>Winner:</strong> {s.content.winner}</p>}
                    {s.content.most_active && <p>💬 <strong>Most Active:</strong> {s.content.most_active}</p>}
                    {s.content.funniest_quote && <p>😂 <strong>Funniest:</strong> {s.content.funniest_quote}</p>}
                    {s.content.best_comeback && <p>🔥 <strong>Comeback:</strong> {s.content.best_comeback}</p>}
                    {s.content.embarrassing_moment && <p>😬 <strong>Embarrassing:</strong> {s.content.embarrassing_moment}</p>}
                    {s.content.biggest_argument && <p>⚔️ <strong>Argument:</strong> {s.content.biggest_argument}</p>}
                    {s.content.weirdest_conversation && <p>🌀 <strong>Weirdest:</strong> {s.content.weirdest_conversation}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {memories && memories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Memories</h2>
            <div className="space-y-2">
              {memories.map((m) => {
                const meta = memoryLabels[m.type] ?? { label: m.type, color: "" }
                return (
                  <div key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground">— {m.target_user?.name}</span>
                      </div>
                      <p className="text-sm">{m.content}</p>
                      {m.context && <p className="text-xs text-muted-foreground mt-1">{m.context}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {quotes && quotes.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Legendary Quotes</h2>
            <div className="space-y-3">
              {quotes.map((q) => (
                <div key={q.id} className="border-l-4 border-primary pl-4 py-1">
                  <p className="text-sm italic">"{q.quote}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {q.user?.name}</p>
                  {q.context && <p className="text-xs text-muted-foreground">{q.context}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(!memories || memories.length === 0) && (!quotes || quotes.length === 0) && (!summaries || summaries.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nothing scanned yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "AI Scan" in the sidebar or wait for the nightly scan.</p>
          </div>
        )}
      </div>
    </div>
  )
}
