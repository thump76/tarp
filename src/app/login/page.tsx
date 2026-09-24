import { Shell, Card } from "@/components/ui";
import { LoginForm } from "./form";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; sent?: string }> }) {
  const { next, sent } = await searchParams;
  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-muted">No password. We email you a link that signs you in. Works for stallholders and organisers.</p>
        <Card className="mt-6">
          {sent ? (
            <p>Check your email for the sign-in link. It is valid for an hour.</p>
          ) : (
            <LoginForm next={next ?? "/"} />
          )}
        </Card>
      </div>
    </Shell>
  );
}
