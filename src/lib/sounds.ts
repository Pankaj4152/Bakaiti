"use client"

class SoundManager {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public isEnabled(): boolean {
    if (typeof window === "undefined") return true
    try {
      const val = localStorage.getItem("bakaiti_sound_effects")
      return val !== "false"
    } catch {
      return true
    }
  }

  public setEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem("bakaiti_sound_effects", enabled ? "true" : "false")
    } catch {}
  }

  // Sent message pop sound (Short ascending tone)
  public playSentSound(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {}
  }

  // Received message chime sound (Pleasant double chime)
  public playReceivedSound(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = "sine"
      osc2.type = "sine"
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc2.frequency.setValueAtTime(880, now + 0.07) // A5

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.07)
      osc2.start(now + 0.07)
      osc2.stop(now + 0.25)
    } catch {}
  }

  // Reaction pop sound (Bubble pop)
  public playReactionSound(): void {
    if (!this.isEnabled()) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    } catch {}
  }
}

export const sounds = new SoundManager()
