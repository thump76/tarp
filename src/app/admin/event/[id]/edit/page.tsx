import Link from "next/link";
import { notFound } from "next/navigation";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { fmtDate, toLocalInput } from "@/lib/format";
import type { Market, OrganiserEvent } from "@/lib/types";
import { EventForm } from "../../event-form";
import { deleteEvent } from "../../actions";
import { DangerZone } from "@/components/danger-zone";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await currentOrganiser();
  const [{ data: ev }, { data: markets }] = await Promise.all([
    supabase.from("organiser_events").select("*").eq("id", id).maybeSingle<OrganiserEvent>(),
    supabase.from("markets").select("*").eq("organiser_id", org.id).order("name").returns<Market[]>(),
  ]);
  if (!ev || ev.organiser_id !== org.id) notFound();

  const { count: unpaid } = await supabase.from("invoices").select("id, requests!inner(event_id)", { count: "exact", head: true })
    .eq("status", "unpaid").eq("requests.event_id", id);

  return (
    <>
      <Link href={`/admin/event/${id}`} className="text-sm text-muted hover:underline">{fmtDate(ev.date, { weekday: "long", day: "numeric", month: "long" })}, {ev.market_name}</Link>
      <h1 className="mt-2 text-4xl font-bold">Edit date</h1>
      <Card className="mt-6 max-w-2xl">
        <EventForm markets={markets ?? []} previous={{}} initial={{
          id: ev.id, market_id: ev.market_id, theme: ev.theme ?? "", note: ev.note ?? "",
          starts: toLocalInput(ev.date, ev.start_time), ends: toLocalInput(ev.date, ev.end_time),
          max_pitches: ev.max_pitches, fee_pounds: String(ev.fee_pence / 100),
        }} />
      </Card>

      <DangerZone
        title="Delete this date"
        summary={ev.approved
          ? `${ev.approved} trader${ev.approved === 1 ? " is" : "s are"} attending${unpaid ? ` and ${unpaid} unpaid invoice${unpaid === 1 ? "" : "s"} will be cancelled` : ""}. Nobody is emailed. You can restore it from the archive.`
          : "Nobody is attending yet. You can restore it from the archive."}
        action={deleteEvent} id={id} button="Delete date" />
    </>
  );
}
