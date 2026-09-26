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
| `/admin` | organiser | this month and the next five; Create event date; finished dates greyed for 48 hours |
| `/admin/archive` | organiser | dates that finished more than 48 hours ago, plus deleted dates and locations with Restore |
| `/admin/event/new` | organiser | create a date: location, theme, start and end (native pickers), pitches, price, copy traders from a previous date |
| `/admin/event/[id]` | organiser | the market board: Pool, Requested, Invited, Attending, drag or tap to move; copy traders from any earlier date |
| `/admin/event/[id]/edit` | organiser | edit or delete a date |
| `/admin/locations` | organiser | venues with their upcoming dates and pool size |
| `/admin/locations/new`, `/admin/locations/[id]/edit` | organiser | add, edit or delete a location |
| `/admin/traders` | organiser | applications to approve, every trader with a tick per location, Edit per row |
| `/admin/traders/[id]/edit` | organiser | edit a trader's details and locations, or delete them |
| `/admin/traders/deleted` | organiser | deleted traders, with Restore |
| `/admin/traders/import` | organiser | paste or upload a spreadsheet of existing traders |
| `/admin/traders/new` | organiser | add one trader by hand |
| `/admin/requests` | organiser | waiting requests with mix check, approve or decline |
| `/admin/money` | organiser | unpaid invoices with their reference, grouped by event; mark paid, remind, release |
| `/admin/settings` | organiser | Team (add and remove admins) and Payments (bank details, reference prefix) |
| `/login` | anyone | email magic link |

## Set up

1. **Supabase project.** Create one at supabase.com. In the SQL editor run, in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/seed.sql` (The Producers Markets, 2026 dates)
   - `supabase/migrations/0002_traders_and_board.sql`
   - `supabase/migrations/0003_locations_dates_team.sql`
2. **Auth.** Authentication > Providers > Email: leave "Confirm email" on, turn "Enable email OTP / magic link" on. Under URL Configuration add your site URL and `http://localhost:3000/auth/callback` plus the Vercel URL `/auth/callback` to redirect URLs.
3. **Env.** `cp .env.example .env.local` and fill in the project URL and anon key from Project Settings > API.
4. **Run.** `npm install && npm run dev`, open http://localhost:3000.
5. **Admins.** Migration 0003 seeds `philipbrumpton@gmail.com` (Philip) and `info@cceventsuk.com` (Chris) as owners of The Producers Markets. Each signs in once at `/login` with that address and the organiser view is theirs. Further admins are added under Settings, Team; they get a sign-in link by email and the row attaches to them on first sign-in.

6. **Deploy.** `npx vercel` from the repo, set the same three env vars in the Vercel project, set `NEXT_PUBLIC_SITE_URL` to the Vercel URL.

## How traders get onto a market

1. **Apply once.** New traders fill in `/apply/producers-markets`. No account needed; they sign in later with the same email.
2. **Approve into markets.** In Traders, the organiser ticks the markets they may trade at and approves. The trader is emailed the list.
3. **Pool.** Everyone approved and ticked for a market is in its pool. Existing traders can be imported straight into pools.
4. **Build the date.** On the board, drag from Pool to Invited (drafts), or use "Copy line-up from" the previous date, then "Send invitations". Traders say yes in `/me` and move to Attending with an invoice. Traders can also request a date themselves; those land in Requested.
5. **Remove.** Dragging back to Pool declines a request, withdraws a draft, or releases a confirmed pitch and cancels its unpaid invoice (with Undo).

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` to send real email through Resend. Without them, every email (approvals, invitations, confirmations) is printed in the server log instead, so flows still work in development.

## Organiser and trader views

Anyone who is an admin sees an **Admin** toggle in the header: Organiser (`/admin`) or Trader (`/me`). It follows the current page and resets on reload. The nav marks the current page with a bold border.

## Dates and locations

- A **location** (`markets` in the database) is a venue with defaults for pitches, price and invoice due days. Add one under Locations; you go straight on to its first date.
- A **date** has a theme, a start and end (native date-time pickers, the end defaults to six hours after the start), pitches and a price. When creating one you can copy the attending traders from any earlier date at that location; they land in Invited as drafts, ready to send.
- The calendar shows six calendar months from the current one. A date is greyed out once its end time has passed and moves to the **Archive** 48 hours later.
- **Delete** is a soft delete everywhere (`deleted_at`). Deleting a date voids its unpaid invoices. Deleting a location takes its upcoming dates with it; past dates stay in the archive. Deleting a trader releases their upcoming pitches and removes them from every pool. Everything can be restored: dates and locations from the archive, traders from Deleted traders.

## Payments

Bank transfer is the default. Every invoice has a reference (`TARP-0001`, prefix editable under Settings, Payments) that appears on the invoice email, the Money page and the trader's My markets page next to the bank details. Traders quote it on the transfer; the organiser matches it against the bank feed and marks paid. SumUp and Stripe pay-by-link are the next step and have placeholder cards in Settings.

## How the data model works

- `organisers` own `markets` (locations), `categories` and `stallholders`. `organiser_members` is the admin list, keyed by email so admins can be invited before they have signed in; `claim_my_memberships()` attaches the auth user on first sign-in. `organiser_settings` holds bank details (members only; traders read them through `my_payment_details()`).
- `events` are explicit dated rows per market (no recurrence engine; the organiser confirms dates).
- `stallholders.status` is `applied`, `approved` or `rejected`. `stallholder_markets` holds the ticks, i.e. each market's pool.
- `requests` is a trader on a date: `requested` (trader asked), `invited` (organiser asked; `notified_at` null means draft), `approved` (Attending), and the exits `declined`, `withdrawn`, `released`.
- `place_trader(event, trader, 'pool' | 'invited' | 'approved')` is the single move used by the board. `respond_invite()` is the trader's answer. `copy_lineup(event, from_event)` drafts invitations from any other date at the location.
- `delete_event`, `restore_event`, `delete_market`, `restore_market` do the soft deletes and the invoice voiding that goes with them.
- `public_events` and `organiser_events` views carry `ends_at` (date + end time in London time) for the greyed and archived states.
- `invoices` hang off approved requests. `approve_request()` creates one in the same transaction with due date = event date minus `markets.invoice_due_days_before`.
- `public_events` view exposes counts only, so the public calendar never leaks names.
- `event_mix` view gives per-category approved and requested counts per event; `categories.cap` is the soft cap the mix check warns on.
- Row-level security: anyone reads markets and published events; stallholders read and create their own rows; organiser members do everything within their organiser.

## Not yet built

- SumUp and Stripe pay-by-link per invoice. Invoices are marked paid by hand for now.
- Bank statement CSV import to match references and bulk-mark paid.
- Reminder emails (Resend). "Send reminder" records the reminder; the email itself is next.
- Waiting list, layout map, documents (insurance expiry).
- iPad app (SwiftUI) against the same Supabase API.
