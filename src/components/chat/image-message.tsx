"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function ImageMessage({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const isVideo = url.match(/\.(mp4|webm|mov|avi)$/i)

  const [loaded, setLoaded] = useState(false)

  return (
    <>
      {isVideo ? (
        <video
          src={url}
          controls
          className="max-w-[250px] max-h-[300px] rounded-lg cursor-pointer"
          onClick={() => setOpen(true)}
        />
      ) : (
        <div className="relative overflow-hidden rounded-lg max-w-[250px] max-h-[300px] bg-muted/20">
          {!loaded && (
            <div className="absolute inset-0 bg-muted/40 animate-pulse flex items-center justify-center" />
          )}
          <img
            src={url}
            alt="Shared image"
            className={`max-w-[250px] max-h-[300px] object-cover cursor-pointer transition-all duration-500 ease-out ${
              loaded ? "blur-0 scale-100 opacity-100" : "blur-md scale-95 opacity-0"
            }`}
            onClick={() => setOpen(true)}
            onLoad={() => setLoaded(true)}
            loading="lazy"
          />
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          {isVideo ? (
            <video src={url} controls className="max-w-full max-h-full" autoPlay />
          ) : (
            <img src={url} alt="Shared image" className="max-w-full max-h-full object-contain" />
          )}
        </div>
      )}
    </>
  )
}
