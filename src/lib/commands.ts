export interface Command {
  command: string
  label: string
  description: string
  aliases?: string[]
  hasForm?: boolean
  evil?: boolean
}

export const COMMANDS: Command[] = [
  { command: "/roast", label: "Roast", description: "Roast the conversation or a specific message", hasForm: true },
  { command: "/chaos", label: "Chaos", description: "Turn chat into dramatic breaking news" },
  { command: "/remember", label: "Remember", description: "Recall memories and quotes", aliases: ["/recall"] },
  { command: "/poll", label: "Poll", description: "Create a poll", hasForm: true },
  { command: "/irritate", label: "Irritate", description: "Annoy someone until they reply", hasForm: true },
  { command: "/ghost-meter", label: "Ghost Meter", description: "Who leaves on read the most" },
  { command: "/translate", label: "Translate", description: "Translate last message", hasForm: true },
  { command: "/rps", label: "Rock Paper Scissors", description: "Play RPS with Bakait" },
  { command: "/fortune", label: "Fortune", description: "Bakait tells your fortune" },
  { command: "/simps", label: "Simps", description: "Who replies fastest to whom" },
  { command: "/mood", label: "Mood Meter", description: "Analyze the chat mood" },
  { command: "/confetti", label: "Confetti", description: "Rain confetti (add emoji for custom: /confetti 🚀)", hasForm: true },
  { command: "/fireworks", label: "Fireworks", description: "Fireworks effect (add emoji for custom: /fireworks 🎉)", hasForm: true },
  { command: "/rain", label: "Rain", description: "Rain effect (add emoji for custom: /rain 🌈)", hasForm: true },
  { command: "/spam", label: "Spam", description: "Spam a message N times", hasForm: true },
  { command: "/stfu", label: "STFU", description: "Stop the irritate bot" },
]

export function findCommands(input: string): Command[] {
  if (!input.startsWith("/")) return []
  const q = input.toLowerCase()
  return COMMANDS.filter((c) => {
    if (c.command.toLowerCase().startsWith(q)) return true
    if (c.aliases?.some((a) => a.toLowerCase().startsWith(q))) return true
    return false
  }).slice(0, 8)
}
