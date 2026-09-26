import { field, Field } from "@/components/form";
import type { Market } from "@/lib/types";

/** Shared by new and edit. Plain server-action form; nothing here needs client state. */
export function LocationForm({ action, initial, button }: { action: (fd: FormData) => Promise<void>; initial?: Market; button: string }) {
  return (
    <form action={action} className="grid gap-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Name" hint="How it appears to traders, for example Royal Arsenal.">
        <input name="name" required defaultValue={initial?.name} className={field} maxLength={80} />
      </Field>
      <Field label="Venue" hint="The place itself, if different from the name. Artillery Square, Royal Arsenal.">
        <input name="venue" defaultValue={initial?.venue} className={field} maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Address"><input name="address" defaultValue={initial?.address ?? ""} className={field} maxLength={160} /></Field>
        <Field label="Postcode"><input name="postcode" defaultValue={initial?.postcode ?? ""} className={`${field} sm:w-32 uppercase`} maxLength={10} /></Field>
      </div>
      <Field label="When it usually runs" hint="Free text for traders. 2nd and 4th Saturday of the month. Dates are still added one by one.">
        <input name="recurrence_note" defaultValue={initial?.recurrence_note ?? ""} className={field} maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Usual number of pitches" hint="Starting value for new dates.">
          <input name="default_pitches" type="number" inputMode="numeric" min={1} max={500} defaultValue={initial?.default_pitches ?? 30} className={field} />
        </Field>
        <Field label="Usual price per pitch">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">£</span>
            <input name="default_fee_pounds" type="number" inputMode="decimal" min={0} step="0.5" defaultValue={(initial?.default_fee_pence ?? 4000) / 100} className={`${field} pl-7`} />
          </div>
        </Field>
        <Field label="Invoice due, days before" hint="A pitch confirmed inside this window is due straight away.">
          <input name="invoice_due_days_before" type="number" inputMode="numeric" min={0} max={90} defaultValue={initial?.invoice_due_days_before ?? 14} className={field} />
        </Field>
      </div>
      <div><button className="btn btn-primary">{button}</button></div>
    </form>
  );
}
