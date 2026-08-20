"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const PARTICLE_COUNT = 86
const TRAIL_SPAN = 0.28
const DURATION_MS = 7800
const PULSE_DURATION_MS = 6800

function point(progress: number, detailScale: number) {
  const t = progress * Math.PI * 2
  const angle = t * 4
  const radius = 8 + (1 - Math.cos(t)) * (8.5 + detailScale * 2.4)
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }
}

function normalize(progress: number) {
  return ((progress % 1) + 1) % 1
}

export function SpiralLoader({
  className,
  size = 92,
  label = "Refreshing",
}: {
  className?: string
  size?: number
  label?: string
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const particlesRef = useRef<Array<SVGCircleElement | null>>([])

  useEffect(() => {
    let frame = 0
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const render = (now: number) => {
      const time = now - startedAt
      const progress = reducedMotion ? 0.72 : (time % DURATION_MS) / DURATION_MS
      const pulseProgress = reducedMotion ? 0.4 : (time % PULSE_DURATION_MS) / PULSE_DURATION_MS
      const detailScale = 0.52 + ((Math.sin(pulseProgress * Math.PI * 2 + 0.55) + 1) / 2) * 0.48

      const path = Array.from({ length: 321 }, (_, index) => {
        const position = point(index / 320, detailScale)
        return `${index === 0 ? "M" : "L"} ${position.x.toFixed(2)} ${position.y.toFixed(2)}`
      }).join(" ")
      pathRef.current?.setAttribute("d", path)

      particlesRef.current.forEach((particle, index) => {
        if (!particle) return
        const tailOffset = index / (PARTICLE_COUNT - 1)
        const position = point(normalize(progress - tailOffset * TRAIL_SPAN), detailScale)
        const fade = Math.pow(1 - tailOffset, 0.56)
        particle.setAttribute("cx", position.x.toFixed(2))
        particle.setAttribute("cy", position.y.toFixed(2))
        particle.setAttribute("r", (0.9 + fade * 2.7).toFixed(2))
        particle.setAttribute("opacity", (0.04 + fade * 0.96).toFixed(3))
      })

      if (!reducedMotion) frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={cn("inline-flex flex-col items-center justify-center gap-3 text-primary", className)} role="status" aria-live="polite">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true" className="overflow-visible drop-shadow-[0_0_18px_hsl(var(--primary)/0.2)]">
        <path ref={pathRef} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.09" />
        {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
          <circle key={index} ref={(element) => { particlesRef.current[index] = element }} fill="currentColor" />
        ))}
      </svg>
      {label && <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</span>}
    </div>
  )
}
