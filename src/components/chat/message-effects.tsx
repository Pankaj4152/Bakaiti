"use client"

import { useEffect, useState } from "react"

const PARTICLES = {
  confetti: ["🎉", "🎊", "✨", "🌟", "💫", "⭐"],
  fireworks: ["🎆", "🎇", "✨", "💥", "🔥", "⭐"],
  rain: ["💧", "🌧️", "☔", "💦", "🌊"],
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function Particle({ emoji, index }: { emoji: string; index: number }) {
  const left = randomBetween(0, 100)
  const delay = randomBetween(0, 2)
  const duration = randomBetween(1.5, 3.5)
  const size = randomBetween(14, 28)

  return (
    <span
      className="absolute pointer-events-none animate-fall"
      style={{
        left: `${left}%`,
        top: `-${randomBetween(10, 30)}px`,
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        zIndex: 50,
      }}
    >
      {emoji}
    </span>
  )
}

export function MessageEffect({ effect }: { effect: string }) {
  const [show, setShow] = useState(true)
  const particles = PARTICLES[effect as keyof typeof PARTICLES] ?? PARTICLES.confetti
  const count = effect === "rain" ? 30 : 20

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 9999 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Particle key={i} emoji={particles[i % particles.length]} index={i} />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  )
}
