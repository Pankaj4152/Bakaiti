export interface Command {
  command: string
  label: string
  description: string
  aliases?: string[]
}

export const COMMANDS: Command[] = [
  { command: "/roast", label: "Roast", description: "Roast the conversation (add text to send context first)" },
  { command: "/chaos", label: "Chaos", description: "Turn chat into dramatic breaking news (add text to send context first)", aliases: ["/news"] },
  { command: "/remember", label: "Remember", description: "Recall memories and quotes", aliases: ["/recall"] },
  { command: "/poll", label: "Poll", description: "Create a poll" },
  { command: "/flashpoll", label: "Flash Poll", description: "Create a 5-minute instant pop-up poll (/flashpoll Bunk? Yes No)", aliases: ["/flash"] },
  { command: "/ghost-meter", label: "Ghost Meter", description: "Who leaves on read the most" },
  { command: "/fortune", label: "Fortune", description: "Bakait tells your fortune" },
  { command: "/simps", label: "Simps", description: "Who replies fastest to whom" },
  { command: "/mood", label: "Mood Meter", description: "Analyze the chat mood" },
  { command: "/confetti", label: "Confetti", description: "Rain confetti (add emojis: /confetti 🚀💀)", aliases: ["/celebrate"] },
  { command: "/fireworks", label: "Fireworks", description: "Fireworks effect (add emojis: /fireworks 🎉❤️)", aliases: ["/blast"] },
  { command: "/rain", label: "Rain", description: "Rain effect (add emojis: /rain 🌈💧)", aliases: ["/pour"] },
  { command: "/spam", label: "Spam", description: "Repeat a message N times" },
  { command: "/meme", label: "Meme", description: "Generate a meme caption from chat (add text for prompt)", aliases: ["/caption"] },
  { command: "/expose", label: "Expose", description: "AI digs up the most embarrassing/funny message from a user", aliases: ["/air"] },
  { command: "/glitch", label: "Glitch", description: "Glitch the chat UI for 10-15 seconds" },
  { command: "/remind", label: "Remind", description: "Set a reminder (/remind @user|me <text> <time>)" },
  { command: "/calc", label: "Calc", description: "Calculate a math expression (/calc 450*3 + 120)" },
  { command: "/help", label: "Help", description: "Show available commands and how to use the app" },
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
