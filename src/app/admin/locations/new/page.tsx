import Link from "next/link";
import { currentOrganiser } from "@/lib/admin";
import { Card } from "@/components/ui";
import { LocationForm } from "../location-form";
import { createLocation } from "../actions";

export default async function NewLocation() {
  await currentOrganiser();
  return (
    <>
      <Link href="/admin/locations" className="text-sm text-muted hover:underline">Locations</Link>
      <h1 className="mt-2 text-4xl font-bold">Add a location</h1>
      <p className="mt-2 text-muted">Once saved you go straight on to its first date. Traders can be approved for it from the Traders page.</p>
      <Card className="mt-6 max-w-2xl">
        <LocationForm action={createLocation} button="Save and add a date" />
      </Card>
    </>
  );
}
