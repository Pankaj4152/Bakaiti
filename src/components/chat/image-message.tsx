"use client"

import { useState } from "react"
import { ImageLightbox } from "./image-lightbox"

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

      <ImageLightbox
        images={[url]}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
