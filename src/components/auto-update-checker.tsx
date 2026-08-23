"use client"

import { useEffect, useState } from "react"
import { Sparkles, Download, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

const CURRENT_NATIVE_VERSION = "1.0.1"

export function AutoUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isApkUpdate, setIsApkUpdate] = useState(false)
  const [apkUrl, setApkUrl] = useState<string | null>(null)
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const [changeNotes, setChangeNotes] = useState<string | null>(null)

  useEffect(() => {
    // Only check and display updates inside the Native APK / Mobile App, NOT on regular web browsers
    const isNativeApp =
      typeof window !== "undefined" &&
      ((window as any).Capacitor?.isNativePlatform?.() ||
        /Capacitor|BakaitiNative|Android/i.test(navigator.userAgent))

    if (!isNativeApp) return

    // Check for updates periodically & on focus
    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/app-version?t=${Date.now()}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const currentApplied = localStorage.getItem("bakaiti_applied_version") || CURRENT_NATIVE_VERSION

          if (data.version && data.version !== CURRENT_NATIVE_VERSION && data.version !== currentApplied) {
            setNewVersion(data.version)
            setChangeNotes(data.changeNotes ?? null)

            // 1. Mandatory Native APK Rebuild Update
            if (data.type === "apk_update" && data.apkUrl) {
              setIsApkUpdate(true)
              setApkUrl(data.apkUrl)
              setUpdateAvailable(true)
              return
            }

            // 2. Major Web Update
            if (data.type === "major") {
              setIsApkUpdate(false)
              setUpdateAvailable(true)
              return
            }

            // 3. Silent Web Update
            if ("serviceWorker" in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations()
              for (const reg of registrations) {
                await reg.update()
              }
            }
          } else {
            setUpdateAvailable(false)
          }
        }
      } catch {}
    }

    checkVersion()
    const interval = setInterval(checkVersion, 5 * 60 * 1000)
    window.addEventListener("focus", checkVersion)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", checkVersion)
    }
  }, [])

  const handleDownloadApk = () => {
    if (!apkUrl) return
    setDownloadStarted(true)
    // Direct browser navigation forces native APK download in Android WebView
    window.location.href = apkUrl
  }

  const handleWebUpdateNow = async () => {
    setUpdating(true)
    if (newVersion) {
      localStorage.setItem("bakaiti_applied_version", newVersion)
    }
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.update()
        }
      }
    } catch {}
    window.location.reload()
  }

  if (!updateAvailable) return null

  // Mandatory Fullscreen Modal for Critical APK Updates (Cannot be dismissed)
  if (isApkUpdate) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
        <div className="w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-purple-500/40 shadow-2xl text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-inner">
            <Sparkles className="h-8 w-8 text-purple-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
              Update Required {newVersion && `v${newVersion}`}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              New Version Available
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {changeNotes || "A major update with image upload fixes and native improvements is required to continue chatting."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
              <span>How to update:</span>
            </div>
            <ol className="text-[11px] text-zinc-400 space-y-1 pl-4 list-decimal">
              <li>Tap <strong className="text-purple-300">Download Update</strong> below</li>
              <li>Tap the downloaded file notification or check Downloads</li>
              <li>Tap <strong className="text-purple-300">Update</strong> to install</li>
            </ol>
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              onClick={handleDownloadApk}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/40 rounded-2xl gap-2 active:scale-95 transition-all"
            >
              <Download className="h-5 w-5" />
              {downloadStarted ? "Downloading Again..." : "Download Update (3.5 MB)"}
            </Button>
            {downloadStarted && (
              <p className="text-[11px] text-emerald-400 font-medium mt-2 animate-pulse">
                ✓ Download started! Check notification bar / Downloads.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Web Update Banner (Instant 1-tap reload)
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-3 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-black/90 text-white border border-purple-500/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold flex items-center gap-1.5 text-purple-200">
              New Update Ready! {newVersion && <span className="text-[10px] bg-purple-500/30 px-1.5 py-0.2 rounded-full border border-purple-400/30">v{newVersion}</span>}
            </p>
            <p className="text-[11px] text-muted-foreground truncate opacity-85">
              Tap Update to get latest Bakaiti features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={handleWebUpdateNow}
            disabled={updating}
            className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md gap-1.5 px-3 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Updating..." : "Update Now"}
          </Button>
        </div>
      </div>
    </div>
  )
}
