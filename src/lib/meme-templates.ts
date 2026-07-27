export interface MemeTemplate {
  id: string
  url: string
  label: string
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  { id: "drake", label: "Drake", url: "https://i.imgflip.com/30b1gx.jpg" },
  { id: "distracted", label: "Distracted BF", url: "https://i.imgflip.com/1ur9b0.jpg" },
  { id: "buttons", label: "Two Buttons", url: "https://i.imgflip.com/1g8my4.jpg" },
  { id: "disaster", label: "Disaster Girl", url: "https://i.imgflip.com/23ls.jpg" },
  { id: "change-mind", label: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg" },
  { id: "pikachu", label: "Surprised Pikachu", url: "https://i.imgflip.com/2kbn1e.jpg" },
  { id: "guy", label: "This Is Fine", url: "https://i.imgflip.com/3v5x2.jpg" },
  { id: "doge", label: "Doge", url: "https://i.imgflip.com/4t0m5.jpg" },
  { id: "trade", label: "Trade Offer", url: "https://i.imgflip.com/5pmyy.jpg" },
  { id: "drew", label: "Drew Gooden", url: "https://i.imgflip.com/7w7xz.jpg" },
]

export function pickRandomTemplate(): MemeTemplate {
  return MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)]
}

function wrapText(text: string, maxChars: number): string {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current += (current ? " " : "") + word
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.join("\n")
}

async function imageToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const mime = res.headers.get("content-type") || "image/jpeg"
  return `data:${mime};base64,${btoa(binary)}`
}

export async function renderMemeSVG(topText: string, bottomText: string): Promise<string> {
  const template = pickRandomTemplate()
  const imgDataUri = await imageToBase64(template.url)

  const wrappedTop = wrapText(topText, 30)
  const wrappedBottom = wrapText(bottomText, 30)

  const textStyle = `font-family="Impact, Arial Black, sans-serif" font-size="42" fill="white" stroke="black" stroke-width="3" paint-order="stroke" text-anchor="middle" font-weight="bold"`

  const topLines = wrappedTop.split("\n")
  const bottomLines = wrappedBottom.split("\n")

  const topTspans = topLines.map((line, i) =>
    `      <tspan x="50%" dy="${i === 0 ? "0" : "1.2em"}">${escapeXml(line)}</tspan>`
  ).join("\n")

  const bottomTspans = bottomLines.map((line, i) =>
    `      <tspan x="50%" dy="${i === 0 ? "0" : "1.2em"}">${escapeXml(line)}</tspan>`
  ).join("\n")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <image href="${imgDataUri}" width="600" height="600" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="600" height="120" fill="rgba(0,0,0,0.5)"/>
  <text x="50%" y="60" ${textStyle}>
${topTspans}
  </text>
  <rect x="0" y="480" width="600" height="120" fill="rgba(0,0,0,0.5)"/>
  <text x="50%" y="540" ${textStyle}>
${bottomTspans}
  </text>
</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}
