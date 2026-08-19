"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { COMMANDS, findCommands, type Command } from "@/lib/commands"
import { cn } from "@/lib/utils"

export function CommandSuggestions({
  text,
  onSelect,
  onClose,
}: {
  text: string
  onSelect: (cmd: Command) => void
  onClose: () => void
}) {
  const [suggestions, setSuggestions] = useState<Command[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const results = findCommands(text)
    setSuggestions(results)
    setSelectedIndex(0)
  }, [text])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIndex]) {
          e.preventDefault()
          onSelect(suggestions[selectedIndex])
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    },
    [suggestions, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [handleKeyDown])

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const visible = suggestions.length > 0 && text.startsWith("/")

  if (!visible) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-2 mx-2 z-50 bg-popover border rounded-lg shadow-xl overflow-hidden"
    >
      <div className="max-h-48 overflow-y-auto">
        {suggestions.map((cmd, i) => (
          <button
            key={cmd.command}
            ref={(element) => { itemRefs.current[i] = element }}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(i)}
            aria-selected={i === selectedIndex}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
              i === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {cmd.command}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground truncate block">{cmd.description}</span>
            </div>
            {cmd.command === "/poll" || cmd.command === "/spam" ? <span className="text-[10px] text-muted-foreground shrink-0">UI</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}
