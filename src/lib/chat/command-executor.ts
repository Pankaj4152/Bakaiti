export interface CommandContext {
  conversationId: string
  senderId: string
  args: string
  supabase: any
}

export interface CommandResult {
  handled: boolean
  feedback?: string
  clearInput?: boolean
  triggerPoll?: "standard" | "flash"
  triggerNickname?: boolean
  isAIResponse?: boolean
  aiContent?: string
}

export async function executeSlashCommand(
  rawCommand: string,
  context: CommandContext
): Promise<CommandResult> {
  const parts = rawCommand.trim().split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1).join(" ")

  const { conversationId, senderId, supabase } = context

  switch (command) {
    case "/roast": {
      try {
        const res = await fetch("/api/ai/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, extraContext: args || undefined }),
        })
        const data = await res.json()
        if (data.roast) {
          return { handled: true, isAIResponse: true, aiContent: data.roast, clearInput: true }
        }
        return { handled: true, feedback: data.error || "Failed to generate roast", clearInput: false }
      } catch {
        return { handled: true, feedback: "Error connecting to AI roast", clearInput: false }
      }
    }

    case "/meme":
    case "/caption": {
      try {
        const res = await fetch("/api/ai/meme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, prompt: args || undefined }),
        })
        const data = await res.json()
        if (data.meme) {
          return { handled: true, isAIResponse: true, aiContent: data.meme, clearInput: true }
        }
        return { handled: true, feedback: data.error || "Failed to generate meme", clearInput: false }
      } catch {
        return { handled: true, feedback: "Error connecting to meme generator", clearInput: false }
      }
    }

    case "/expose":
    case "/air": {
      try {
        const res = await fetch("/api/ai/expose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        })
        const data = await res.json()
        if (data.exposure) {
          return { handled: true, isAIResponse: true, aiContent: data.exposure, clearInput: true }
        }
        return { handled: true, feedback: data.error || "Failed to expose lore", clearInput: false }
      } catch {
        return { handled: true, feedback: "Error connecting to expose API", clearInput: false }
      }
    }

    case "/poll": {
      return { handled: true, triggerPoll: "standard", clearInput: true }
    }

    case "/flashpoll":
    case "/flash": {
      return { handled: true, triggerPoll: "flash", clearInput: true }
    }

    case "/glitch": {
      window.dispatchEvent(new CustomEvent("trigger-glitch"))
      return { handled: true, feedback: "⚡ Glitch activated!", clearInput: true }
    }

    default:
      return { handled: false }
  }
}
