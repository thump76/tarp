# Tarp

Booking, invoicing and calendar for market organisers. First customer: The Producers Markets (CC Events UK).

The core loop: an event has N pitches. A stallholder requests one. The organiser approves it, which creates the invoice. The calendar shows what is approved, requested, available and paid.

## Stack

- Next.js 16 (App Router, server actions), Tailwind 4
- Supabase (Postgres, magic-link auth, row-level security)
- Vercel for hosting

## Routes

| Route | Who | What |
|---|---|---|
| `/` | anyone | list of markets with next date and pitches left, Apply to trade |
| `/apply/[org]` | anyone | trader application: business, category, products, links, markets wanted |
| `/m/[slug]` | anyone | public calendar for one market; approved traders ticked for it can request a pitch |
| `/me` | trader | their markets, invitations (yes / can't make it), bookings and invoices |
| `/admin` | organiser | next three months; tap a date to build it |
| `/admin/event/[id]` | organiser | the market board: Pool, Requested, Invited, Attending, drag or tap to move |
| `/admin/traders` | organiser | applications to approve, every trader with a tick per market |
| `/admin/traders/import` | organiser | paste or upload a spreadsheet of existing traders |
| `/admin/traders/new` | organiser | add one trader by hand |
| `/admin/requests` | organiser | waiting requests with mix check, approve or decline |
| `/admin/money` | organiser | unpaid invoices grouped by event, mark paid, remind, release |
| `/login` | anyone | email magic link |

## Set up

1. **Supabase project.** Create one at supabase.com. In the SQL editor run, in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/seed.sql` (The Producers Markets, 2026 dates)
   - `supabase/migrations/0002_traders_and_board.sql`
2. **Auth.** Authentication > Providers > Email: leave "Confirm email" on, turn "Enable email OTP / magic link" on. Under URL Configuration add your site URL and `http://localhost:3000/auth/callback` plus the Vercel URL `/auth/callback` to redirect URLs.
3. **Env.** `cp .env.example .env.local` and fill in the project URL and anon key from Project Settings > API.
4. **Run.** `npm install && npm run dev`, open http://localhost:3000.
5. **Make yourself an organiser member.** Sign in once at `/login` so your auth user exists, then in the SQL editor:

   ```sql
   insert into organiser_members (organiser_id, user_id)
   select '11111111-1111-1111-1111-111111111111', id from auth.users where email = 'philipbrumpton@gmail.com';
   ```

   Repeat with CC Events' email when they are ready. `/admin` then works for that account.

6. **Deploy.** `npx vercel` from the repo, set the same three env vars in the Vercel project, set `NEXT_PUBLIC_SITE_URL` to the Vercel URL.

## How traders get onto a market

1. **Apply once.** New traders fill in `/apply/producers-markets`. No account needed; they sign in later with the same email.
2. **Approve into markets.** In Traders, the organiser ticks the markets they may trade at and approves. The trader is emailed the list.
3. **Pool.** Everyone approved and ticked for a market is in its pool. Existing traders can be imported straight into pools.
4. **Build the date.** On the board, drag from Pool to Invited (drafts), or use "Copy line-up from" the previous date, then "Send invitations". Traders say yes in `/me` and move to Attending with an invoice. Traders can also request a date themselves; those land in Requested.
5. **Remove.** Dragging back to Pool declines a request, withdraws a draft, or releases a confirmed pitch and cancels its unpaid invoice (with Undo).

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` to send real email through Resend. Without them, every email (approvals, invitations, confirmations) is printed in the server log instead, so flows still work in development.

## How the data model works

- `organisers` own `markets`, `categories` and `stallholders`.
- `events` are explicit dated rows per market (no recurrence engine; the organiser confirms dates).
- `stallholders.status` is `applied`, `approved` or `rejected`. `stallholder_markets` holds the ticks, i.e. each market's pool.
- `requests` is a trader on a date: `requested` (trader asked), `invited` (organiser asked; `notified_at` null means draft), `approved` (Attending), and the exits `declined`, `withdrawn`, `released`.
- `place_trader(event, trader, 'pool' | 'invited' | 'approved')` is the single move used by the board. `respond_invite()` is the trader's answer. `copy_lineup()` drafts invitations from the previous date.
- `invoices` hang off approved requests. `approve_request()` creates one in the same transaction with due date = event date minus `markets.invoice_due_days_before`.
- `public_events` view exposes counts only, so the public calendar never leaks names.
- `event_mix` view gives per-category approved and requested counts per event; `categories.cap` is the soft cap the mix check warns on.
- Row-level security: anyone reads markets and published events; stallholders read and create their own rows; organiser members do everything within their organiser.

## Not yet built

- Stripe Invoicing (hosted invoice page and card payment). Invoices are marked paid by hand for now.
- Reminder emails (Resend). "Send reminder" records the reminder; the email itself is next.
- Waiting list, layout map, documents (insurance expiry).
- iPad app (SwiftUI) against the same Supabase API.
