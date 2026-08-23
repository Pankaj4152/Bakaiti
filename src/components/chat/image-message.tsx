"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function ImageMessage({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const isVideo = url.match(/\.(mp4|webm|mov|avi)$/i)

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
            alt="Shared media"
            className={`max-w-[250px] max-h-[300px] object-cover cursor-pointer transition-all duration-500 ease-out hover:opacity-90 ${
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
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-0 select-none animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
            className="absolute top-4 right-4 z-50 h-10 w-10 text-white bg-black/50 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer border border-white/10"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <video src={url} controls autoPlay className="max-w-full max-h-full object-contain" />
            ) : (
              <img
                src={url}
                alt="Media"
                className="max-w-full max-h-full object-contain cursor-zoom-out"
                onClick={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
