import Link from "next/link";
import type { ReactNode } from "react";
import { currentMembership } from "@/lib/admin";
import { AdminToggle, NavLink } from "./nav-link";

export function Shell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href="/" className="display text-2xl font-bold">Tarp</Link>
        <AdminBar />
        {nav}
      </header>
      <main>{children}</main>
      <footer className="mt-16 text-xs text-muted">Tarp, early access. Questions to philipbrumpton@gmail.com</footer>
    </div>
  );
}

/** The Admin toggle, only for organiser members. Server component so the check never reaches the client. */
async function AdminBar() {
  const { member } = await currentMembership();
  if (!member) return null;
  return <AdminToggle />;
}

export function PitchBar({ approved, requested, max }: { approved: number; requested: number; max: number }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-cream-deep" aria-hidden="true">
      <i className="block h-full bg-green" style={{ width: `${(approved / max) * 100}%` }} />
      <i className="block h-full bg-amber" style={{ width: `${(requested / max) * 100}%` }} />
    </div>
  );
}

export function Chip({ kind, children }: { kind: "req" | "appr" | "avail" | "due"; children: ReactNode }) {
  return <span className={`chip chip-${kind}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card p-4 ${className}`}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="display mt-1 text-2xl font-semibold leading-tight">
        {value}
        {sub && <span className="ml-2 font-sans text-sm font-medium text-muted">{sub}</span>}
      </div>
    </Card>
  );
}

export function AuthNav({ signedIn }: { signedIn: boolean }) {
  return (
    <nav className="flex gap-2 text-sm">
      {signedIn ? (
        <>
          <NavLink href="/" exact>Markets</NavLink>
          <NavLink href="/me">My markets</NavLink>
        </>
      ) : (
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      )}
    </nav>
  );
}
