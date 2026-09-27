import Image from "next/image";
import { HOME_PHOTOS, type PhotoSlot } from "@/lib/photos";

const DEV = process.env.NODE_ENV !== "production";

/**
 * A photo from src/lib/photos.ts, filling its box (set the shape with an aspect-* class).
 * Shows a striped placeholder until the file is marked ready.
 */
export function Photo({ slot, className = "", sizes, preload = false, dark = false }: {
  slot: PhotoSlot; className?: string; sizes: string; preload?: boolean; dark?: boolean;
}) {
  const p = HOME_PHOTOS[slot];
  if (p.ready) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={`/images/home/${p.file}`} alt={p.alt} fill sizes={sizes} preload={preload} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={p.alt}
      className={`relative flex overflow-hidden ${dark ? "bg-ink" : "bg-cream-deep"} ${className}`}
      style={{ backgroundImage: `repeating-linear-gradient(135deg, transparent 0 14px, ${dark ? "rgb(255 255 255 / 0.04)" : "rgb(38 38 47 / 0.05)"} 14px 15px)` }}
    >
      <div className={`m-auto max-w-xs p-5 text-center text-xs ${dark ? "text-cream/60" : "text-muted"}`}>
        <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" />
        </svg>
        <div className="font-semibold">{p.alt}</div>
        {DEV && (
          <div className="mt-2 opacity-80">
            public/images/home/<b>{p.file}</b>, {p.ratio}
            <details className="mt-1 text-left">
              <summary className="cursor-pointer text-center underline">Prompt</summary>
              <p className="mt-1 select-all">{p.prompt}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
