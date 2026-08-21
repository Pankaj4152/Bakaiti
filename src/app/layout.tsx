import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/components/notifications/provider"
import { RegisterSW } from "@/components/register-sw"
import { NetworkStatus } from "@/components/network-status"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Bakaiti",
  description: "Private chat for the squad",
  icons: {
    icon: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="dark h-full"
      suppressHydrationWarning
    >
      <body className="h-full antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NotificationProvider>
            {children}
          </NotificationProvider>
          <NetworkStatus />
          <RegisterSW />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
