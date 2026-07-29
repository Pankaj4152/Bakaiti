"use client"

import { useEffect, useState } from "react"

export function GlitchEffect() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 12000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!show) return
    document.documentElement.classList.add("glitch-active")
    return () => {
      document.documentElement.classList.remove("glitch-active")
    }
  }, [show])

  if (!show) return null

  return (
    <style>{`
      .glitch-active {
        filter: invert(1) hue-rotate(180deg) !important;
        transition: filter 0.05s ease;
      }
      .glitch-active .overflow-y-auto {
        animation: glitch-slide 0.15s ease-in-out infinite alternate;
      }
      .glitch-active .overflow-y-auto > div {
        animation: glitch-text 0.1s linear infinite;
      }
      @keyframes glitch-slide {
        0% { transform: translateX(0); }
        20% { transform: translateX(-4px); }
        40% { transform: translateX(3px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
        100% { transform: translateX(-1px); }
      }
      @keyframes glitch-text {
        0% { letter-spacing: 0; opacity: 1; }
        25% { letter-spacing: 2px; opacity: 0.8; }
        50% { letter-spacing: -1px; opacity: 0.9; }
        75% { letter-spacing: 1px; opacity: 0.7; }
        100% { letter-spacing: 0; opacity: 1; }
      }
    `}</style>
  )
}
