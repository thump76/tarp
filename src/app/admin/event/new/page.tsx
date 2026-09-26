import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import type { Market } from "@/lib/types";
import { EventForm } from "../event-form";
import { previousDates } from "../previous";

export const dynamic = "force-dynamic";

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ location?: string; month?: string }> }) {
  const { location, month } = await searchParams;
  const { supabase, org } = await currentOrganiser();
  const [{ data: markets }, previous] = await Promise.all([
    supabase.from("markets").select("*").eq("organiser_id", org.id).is("deleted_at", null).order("name").returns<Market[]>(),
    previousDates(supabase, org.id),
  ]);

  if (!markets?.length) {
    return (
      <>
        <h1 className="text-4xl font-bold">Create event date</h1>
        <Card className="mt-6 max-w-prose">
          <p>You need a location first. A location is a venue that has dates, like Royal Arsenal or Lesnes Abbey.</p>
          <Link href="/admin/locations/new" className="btn btn-primary mt-4">Add a location</Link>
        </Card>
      </>
    );
  }

  // a "No dates, add one" link from the calendar lands on the 1st of that month at 10am
  const starts = month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01T10:00` : "";
  const ends = starts ? `${month}-01T16:00` : "";

  return (
    <>
      <Link href="/admin" className="text-sm text-muted hover:underline">Calendar</Link>
      <h1 className="mt-2 text-4xl font-bold">Create event date</h1>
      <p className="mt-2 text-muted">Pitches and price start from the location&rsquo;s defaults. Traders see the date on the public calendar as soon as it is saved.</p>
      <Card className="mt-6 max-w-2xl">
        <EventForm markets={markets} previous={previous} initial={{ market_id: location, starts, ends }} />
      </Card>
    </>
  );
}
