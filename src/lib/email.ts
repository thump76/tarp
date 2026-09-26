/**
 * Transactional email via Resend (https://resend.com). If RESEND_API_KEY is not set,
 * emails are logged to the server console instead, so every flow still works in development.
 */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Tarp <onboarding@resend.dev>";
  if (!key) {
    console.log(`[email not sent: no RESEND_API_KEY] to=${to} subject="${subject}"\n${text}`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return { sent: res.ok };
}

export function siteUrl(path = "") {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

type Bank = { bank_account_name: string | null; bank_sort_code: string | null; bank_account_number: string | null; payment_note: string | null } | null;

/** The "how to pay" paragraph for invoice emails. Empty when no bank details are set. */
export function paymentBlock(bank: Bank, reference: string) {
  if (!bank?.bank_account_number) return `Payment reference: ${reference}. The organiser will tell you how to pay.`;
  return [
    `Pay by bank transfer, quoting the reference ${reference}:`,
    `  ${bank.bank_account_name ?? ""}`,
    `  Sort code ${bank.bank_sort_code ?? ""}, account ${bank.bank_account_number}`,
    bank.payment_note ? `\n${bank.payment_note}` : "",
  ].filter(Boolean).join("\n");
}
