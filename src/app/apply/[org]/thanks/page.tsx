import Link from "next/link";
import { Shell, Card } from "@/components/ui";

export default async function Thanks({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  return (
    <Shell>
      <div className="max-w-xl">
        {r === "exists" ? (
          <>
            <h1 className="text-4xl font-bold">You are already approved</h1>
            <Card className="mt-6">
              <p>There is already an approved trader with that email. Sign in with it to see your markets and request dates.</p>
              <Link href="/login?next=/me" className="btn btn-primary mt-4">Sign in</Link>
            </Card>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold">Application sent</h1>
            <Card className="mt-6">
              <p>Thank you. The organiser will review it and email you. If you are approved, the email lists the markets you can book.</p>
              <p className="mt-3 text-sm text-muted">You can sign in with the same email at any time to see where your application is.</p>
              <Link href="/" className="btn btn-ghost mt-4">Back to the markets</Link>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}
