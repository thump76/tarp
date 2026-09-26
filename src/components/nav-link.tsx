"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A nav pill that shows a bold border when its route is the current page. */
export function NavLink({ href, exact = false, also = [], children, className = "", title }: {
  href: string; exact?: boolean; also?: string[]; children: ReactNode; className?: string; title?: string;
}) {
  const path = usePathname();
  const under = (p: string) => path === p || path.startsWith(p + "/");
  const active = (exact ? path === href : under(href)) || also.some(under);
  return (
    <Link href={href} title={title} aria-label={title} aria-current={active ? "page" : undefined} className={`nav-item ${active ? "nav-active" : ""} ${className}`}>
      {children}
    </Link>
  );
}

/** Organiser / Trader switch. Rendered only for organiser members. */
export function AdminToggle() {
  const path = usePathname();
  const organiser = path.startsWith("/admin");
  return (
    <div className="seg" role="group" aria-label="Organiser or trader view">
      <Link href="/admin" className={organiser ? "seg-on" : ""} aria-current={organiser ? "page" : undefined}>Organiser</Link>
      <Link href="/me" className={!organiser ? "seg-on" : ""} aria-current={!organiser ? "page" : undefined}>Trader</Link>
    </div>
  );
}

export function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/** POSTs to /logout. An icon button so it sits quietly at the end of the nav. */
export function SignOut() {
  return (
    <form action="/logout" method="post">
      <button className="nav-item nav-icon" title="Sign out" aria-label="Sign out"><SignOutIcon /></button>
    </form>
  );
}
