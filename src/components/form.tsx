import type { ReactNode } from "react";

/** Input styling shared by every form. Safe to import from client components. */
export const field = "w-full rounded-xl border border-line bg-white/60 px-3 py-2 text-base";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
