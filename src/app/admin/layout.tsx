import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shell, Card } from "@/components/ui";

/** Organiser area. Requires membership of an organiser; the first organiser the user belongs to is used. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: membership } = await supabase.from("organiser_members").select("organiser_id, organisers(name)").eq("user_id", user.id).limit(1).maybeSingle();

  if (!membership) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold">Organiser</h1>
        <Card className="mt-6 max-w-prose">
          <p>Your account ({user.email}) is not attached to an organiser yet.</p>
          <p className="mt-2 text-sm text-muted">Ask Philip to add you, or if this is your own project, run the SQL in the README under &ldquo;Make yourself an organiser member&rdquo;.</p>
        </Card>
      </Shell>
    );
  }

  const orgName = (membership as unknown as { organisers: { name: string } }).organisers?.name;
  const nav = (
    <nav className="flex flex-wrap gap-2 text-sm">
      <Link href="/admin" className="btn btn-ghost">Calendar</Link>
      <Link href="/admin/requests" className="btn btn-ghost">Requests</Link>
      <Link href="/admin/money" className="btn btn-ghost">Money</Link>
      <Link href="/" className="btn btn-ghost">Public site</Link>
    </nav>
  );

  return (
    <Shell nav={nav}>
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">{orgName}</div>
      {children}
    </Shell>
  );
}
