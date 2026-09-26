import { currentOrganiser } from "@/lib/admin";
import { Card, Chip } from "@/components/ui";
import { Field, field } from "@/components/form";
import { fmtDate } from "@/lib/format";
import type { Member, OrganiserSettings } from "@/lib/types";
import { inviteAdmin, removeAdmin, savePayments } from "./actions";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const { supabase, org, member } = await currentOrganiser();
  const [{ data: team }, { data: settings }] = await Promise.all([
    supabase.from("organiser_members").select("*").eq("organiser_id", org.id).is("removed_at", null).order("invited_at").returns<Member[]>(),
    supabase.from("organiser_settings").select("*").eq("organiser_id", org.id).maybeSingle<OrganiserSettings>(),
  ]);
  const owners = (team ?? []).filter((m) => m.role === "owner").length;

  return (
    <>
      <h1 className="text-4xl font-bold">Settings</h1>
      <p className="mt-1 text-muted">{org.name}</p>

      {/* ---------- team ---------- */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Team</h2>
        <p className="mt-1 text-sm text-muted">Admins see the organiser view and can do everything here, including adding other admins.</p>
        <Card className="mt-4 max-w-2xl">
          <ul className="divide-y divide-line">
            {team?.map((m) => {
              const canRemove = m.id !== member.id && (member.role === "owner" || m.role === "admin") && !(m.role === "owner" && owners <= 1);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-ink-strong">{m.name ?? m.email}{m.id === member.id ? <span className="text-muted"> (you)</span> : null}</div>
                    <div className="text-xs text-muted">{m.name ? `${m.email} · ` : ""}{m.role}{m.accepted_at ? "" : ` · invited ${fmtDate(m.invited_at.slice(0, 10))}`}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.accepted_at ? <Chip kind="appr">Active</Chip> : <Chip kind="req">Pending</Chip>}
                    {canRemove && (
                      <form action={removeAdmin}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost !py-1 text-xs">Remove</button></form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <form action={inviteAdmin} className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Add an admin"><input name="email" type="email" required placeholder="Email" className={field} /></Field>
            <Field label="Name"><input name="name" placeholder="Optional" className={field} /></Field>
            <button className="btn btn-primary">Add and email</button>
          </form>
        </Card>
      </section>

      {/* ---------- payments ---------- */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Payments</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          How traders pay pitch fees. Bank transfer is always on: the details below go on every invoice email, along with a reference like
          {" "}<b className="font-semibold text-ink">{settings?.reference_prefix ?? "TARP"}-0412</b> so payments are easy to match. Card payments arrive with Stripe or SumUp.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
          <Card>
            <h3 className="text-base font-semibold">Bank transfer</h3>
            <form action={savePayments} className="mt-3 grid gap-4">
              <Field label="Account name"><input name="bank_account_name" defaultValue={settings?.bank_account_name ?? ""} className={field} placeholder="CC Events UK Ltd" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sort code"><input name="bank_sort_code" inputMode="numeric" defaultValue={settings?.bank_sort_code ?? ""} className={field} placeholder="00-00-00" /></Field>
                <Field label="Account number"><input name="bank_account_number" inputMode="numeric" defaultValue={settings?.bank_account_number ?? ""} className={field} placeholder="12345678" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reference prefix" hint="Invoices are numbered PREFIX-0001 upwards.">
                  <input name="reference_prefix" defaultValue={settings?.reference_prefix ?? "TARP"} className={`${field} uppercase`} maxLength={8} />
                </Field>
                <Field label="Reply-to email" hint="Where trader replies to Tarp emails land.">
                  <input name="reply_to" type="email" defaultValue={settings?.reply_to ?? ""} className={field} placeholder="info@example.com" />
                </Field>
              </div>
              <Field label="Note to traders" hint="Shown under the bank details on invoices.">
                <textarea name="payment_note" rows={2} defaultValue={settings?.payment_note ?? ""} className={field} placeholder="Please pay within 14 days. Cash on the day is fine if you have arranged it with us." />
              </Field>
              <div><button className="btn btn-primary">Save</button></div>
            </form>
          </Card>

          <div className="flex flex-col gap-4">
            <Provider name="SumUp" blurb="A pay-by-link for each invoice, paid into your existing SumUp account. SumUp's online payment fee applies." />
            <Provider name="Stripe" blurb="A hosted payment link per invoice, so reminders can carry a Pay button. Stripe's UK card fee applies." />
          </div>
        </div>
      </section>
    </>
  );
}

function Provider({ name, blurb }: { name: string; blurb: string }) {
  return (
    <Card className="opacity-80">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{name}</h3>
        <Chip kind="avail">Not yet available</Chip>
      </div>
      <p className="mt-2 text-sm text-muted">{blurb}</p>
      <button className="btn btn-ghost mt-3 !py-1.5 text-xs" disabled>Connect {name}</button>
    </Card>
  );
}
