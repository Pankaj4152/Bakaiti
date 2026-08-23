// Micro-vibration / Haptic feedback utilities for native feel
export const haptics = {
  light: () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12)
      }
    } catch {}
  },
  medium: () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25)
      }
    } catch {}
  },
  heavy: () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([35, 20, 35])
      }
    } catch {}
  },
  success: () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([15, 30, 20])
      }
    } catch {}
  },
}
