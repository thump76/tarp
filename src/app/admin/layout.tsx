import { redirect } from "next/navigation";
import { currentMembership } from "@/lib/admin";
import { Shell, Card } from "@/components/ui";
import { CogIcon, NavLink, SignOut } from "@/components/nav-link";

/** Organiser area. Requires a live membership of an organiser; the first one the user belongs to is used. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, member, org } = await currentMembership();
  if (!user) redirect("/login?next=/admin");

  if (!member || !org) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold">Organiser</h1>
        <Card className="mt-6 max-w-prose">
          <p>Your account ({user.email}) is not an admin for any organiser yet.</p>
          <p className="mt-2 text-sm text-muted">An existing admin can add you under Settings, Team. Make sure they use this exact email address.</p>
        </Card>
      </Shell>
    );
  }

  const { count: applications } = await supabase.from("stallholders").select("id", { count: "exact", head: true })
    .eq("organiser_id", org.id).eq("status", "applied").is("deleted_at", null);
  const nav = (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <NavLink href="/admin" exact also={["/admin/event", "/admin/archive"]}>Calendar</NavLink>
      <NavLink href="/admin/locations">Locations</NavLink>
      <NavLink href="/admin/traders">Traders{applications ? <span className="chip chip-req !py-0 !px-2">{applications}</span> : null}</NavLink>
      <NavLink href="/admin/requests">Requests</NavLink>
      <NavLink href="/admin/money">Money</NavLink>
      <NavLink href="/admin/settings" className="nav-icon" title="Settings"><CogIcon /></NavLink>
      <SignOut />
    </nav>
  );

  return (
    <Shell nav={nav}>
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">{org.name}</div>
      {children}
    </Shell>
  );
}
