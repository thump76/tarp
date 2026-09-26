"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A ghost button link that shows a bold border when its route is the current page. */
export function NavLink({ href, exact = false, also = [], children, className = "" }: {
  href: string; exact?: boolean; also?: string[]; children: ReactNode; className?: string;
}) {
  const path = usePathname();
  const under = (p: string) => path === p || path.startsWith(p + "/");
  const active = (exact ? path === href : under(href)) || also.some(under);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`btn btn-ghost ${active ? "nav-active" : ""} ${className}`}>
      {children}
    </Link>
  );
}

/** Organiser / Trader switch. Rendered only for organiser members. */
export function AdminToggle() {
  const path = usePathname();
  const organiser = path.startsWith("/admin");
  return (
    <div className="flex items-center gap-2 text-sm" role="group" aria-label="Admin view">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Admin</span>
      <div className="seg">
        <Link href="/admin" className={organiser ? "seg-on" : ""} aria-current={organiser ? "page" : undefined}>Organiser</Link>
        <Link href="/me" className={!organiser ? "seg-on" : ""} aria-current={!organiser ? "page" : undefined}>Trader</Link>
      </div>
    </div>
  );
}
