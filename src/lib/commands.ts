export interface Command {
  command: string
  label: string
  description: string
  aliases?: string[]
}

export const COMMANDS: Command[] = [
  { command: "/roast", label: "Roast", description: "Roast the conversation (add text for context)" },
  { command: "/meme", label: "Meme", description: "Generate a meme caption from chat", aliases: ["/caption"] },
  { command: "/glitch", label: "Glitch", description: "Glitch the chat UI temporarily" },
  { command: "/expose", label: "Expose", description: "AI exposes funny/embarrassing chat moments", aliases: ["/air"] },
  { command: "/poll", label: "Poll", description: "Create an interactive poll" },
  { command: "/flashpoll", label: "Flash Poll", description: "Create a 5-minute instant poll", aliases: ["/flash"] },
]

export function findCommands(input: string): Command[] {
  if (!input.startsWith("/")) return []
  const q = input.toLowerCase().slice(1)
  if (!q) return COMMANDS
  return COMMANDS.filter((c) => {
    if (c.command.slice(1).toLowerCase().startsWith(q)) return true
    if (c.aliases?.some((a) => a.slice(1).toLowerCase().startsWith(q))) return true
    return false
  }).slice(0, 8)
}
