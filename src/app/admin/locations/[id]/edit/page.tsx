import Link from "next/link";
import { notFound } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { DangerZone } from "@/components/danger-zone";
import { todayIso } from "@/lib/format";
import type { Market } from "@/lib/types";
import { LocationForm } from "../../location-form";
import { deleteLocation, updateLocation } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditLocation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await currentOrganiser();
  const { data: m } = await supabase.from("markets").select("*").eq("id", id).eq("organiser_id", org.id).is("deleted_at", null).maybeSingle<Market>();
  if (!m) notFound();
  const [{ count: future }, { count: attending }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("market_id", id).is("deleted_at", null).gte("date", todayIso()),
    supabase.from("requests").select("id, events!inner(market_id, date, deleted_at)", { count: "exact", head: true })
      .eq("state", "approved").eq("events.market_id", id).is("events.deleted_at", null).gte("events.date", todayIso()),
  ]);

  return (
    <>
      <Link href="/admin/locations" className="text-sm text-muted hover:underline">Locations</Link>
      <h1 className="mt-2 text-4xl font-bold">{m.name}</h1>
      <p className="mt-1 text-sm text-muted">Public page: /m/{m.slug}</p>
      <Card className="mt-6 max-w-2xl">
        <LocationForm action={updateLocation} initial={m} button="Save changes" />
      </Card>
      <DangerZone
        title="Delete this location"
        summary={future
          ? `${future} upcoming date${future === 1 ? "" : "s"} will be deleted with it${attending ? `, with ${attending} confirmed pitch${attending === 1 ? "" : "es"} and their unpaid invoices cancelled` : ""}. Past dates stay in the archive. Nobody is emailed. Restorable from the archive.`
          : "No upcoming dates. Past dates stay in the archive. Restorable from the archive."}
        action={deleteLocation} id={id} button="Delete location" />
    </>
  );
}
