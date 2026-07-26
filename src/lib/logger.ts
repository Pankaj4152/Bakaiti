const isDev = process.env.NODE_ENV === "development"

export const log = {
  info: (label: string, ...args: unknown[]) => {
    if (isDev) console.log(`[${label}]`, ...args)
  },
  warn: (label: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[${label}]`, ...args)
  },
  error: (label: string, ...args: unknown[]) => {
    console.error(`[${label}]`, ...args)
  },
}
