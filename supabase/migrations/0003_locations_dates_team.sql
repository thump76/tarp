-- Tarp 0003: locations and dates the organiser manages themselves, soft deletes, an admin team,
-- copy-from any previous date, invoice references and bank transfer details.
--
-- Changes
--   * events.theme, and every event ends at a real moment (date + end_time, London time) so the
--     calendar can grey out finished markets and archive them 48 hours later.
--   * deleted_at on markets, events and stallholders. Nothing is hard-deleted; deleted traders
--     appear under "Deleted traders", deleted dates and locations under the archive, all restorable.
--   * organiser_members is now an invite list keyed by email. Admins add other admins by email;
--     the row is attached to their auth user when they first sign in (claim_my_memberships()).
--   * copy_lineup(ev, from_ev) takes the date to copy from instead of always using the previous one.
--   * invoices.reference (TARP-0001 style) for traders to quote on bank transfers.
--   * organiser_settings holds bank details, readable only by members and by traders with an invoice.

-- ---------- events: theme and soft delete ----------
alter table events
  add column theme text,
  add column deleted_at timestamptz;
update events set theme = note, note = null where theme is null and note is not null;

alter table markets add column deleted_at timestamptz;
alter table stallholders add column deleted_at timestamptz;

create index on events (deleted_at) where deleted_at is not null;

-- ---------- team ----------
alter table organiser_members
  add column id uuid not null default gen_random_uuid(),
  add column email text,
  add column name text,
  add column invited_by uuid references auth.users(id) on delete set null,
  add column invited_at timestamptz not null default now(),
  add column accepted_at timestamptz,
  add column removed_at timestamptz;
update organiser_members m set email = lower(u.email), accepted_at = now() from auth.users u where u.id = m.user_id;
alter table organiser_members drop constraint organiser_members_pkey;
alter table organiser_members add primary key (id);
alter table organiser_members alter column user_id drop not null;
alter table organiser_members alter column email set not null;
create unique index organiser_members_live_email on organiser_members (organiser_id, lower(email)) where removed_at is null;

-- the two admins for The Producers Markets
insert into organiser_members (organiser_id, email, name, role, user_id, accepted_at)
select '11111111-1111-1111-1111-111111111111', e.email, e.name, 'owner', u.id, case when u.id is not null then now() end
from (values ('philipbrumpton@gmail.com', 'Philip'), ('info@cceventsuk.com', 'Chris')) as e(email, name)
left join auth.users u on lower(u.email) = e.email
where exists (select 1 from organisers where id = '11111111-1111-1111-1111-111111111111')
  and not exists (select 1 from organiser_members m where m.organiser_id = '11111111-1111-1111-1111-111111111111' and lower(m.email) = e.email and m.removed_at is null);

create or replace function is_organiser_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organiser_members where organiser_id = org and user_id = auth.uid() and removed_at is null);
$$;

-- Attach the signed-in user to any invite with their email. Called from the auth callback.
create or replace function claim_my_memberships() returns int
language plpgsql security definer set search_path = public as $$
declare n int; em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or em = '' then return 0; end if;
  update organiser_members set user_id = auth.uid(), accepted_at = coalesce(accepted_at, now())
  where user_id is null and lower(email) = em and removed_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function claim_my_memberships() to authenticated;

drop policy if exists "members see own" on organiser_members;
create policy "members see own" on organiser_members for select using (user_id = auth.uid() or is_organiser_member(organiser_id));
create policy "members manage team" on organiser_members for all
  using (is_organiser_member(organiser_id)) with check (is_organiser_member(organiser_id));

-- ---------- settings: bank details, hidden from the public organisers table ----------
create table organiser_settings (
  organiser_id uuid primary key references organisers(id) on delete cascade,
  bank_account_name text,
  bank_sort_code text,
  bank_account_number text,
  reference_prefix text not null default 'TARP',
  payment_note text,                    -- free text shown to traders under the bank details
  reply_to text,                        -- where trader replies to Tarp emails should go
  updated_at timestamptz not null default now()
);
alter table organiser_settings enable row level security;
create policy "settings member all" on organiser_settings for all
  using (is_organiser_member(organiser_id)) with check (is_organiser_member(organiser_id));

-- A trader with an approved profile at this organiser may read the bank details to pay.
create or replace function my_payment_details(org uuid)
returns table (bank_account_name text, bank_sort_code text, bank_account_number text, payment_note text)
language sql stable security definer set search_path = public as $$
  select s.bank_account_name, s.bank_sort_code, s.bank_account_number, s.payment_note
  from organiser_settings s
  where s.organiser_id = org
    and exists (select 1 from stallholders where organiser_id = org and user_id = auth.uid() and status = 'approved');
$$;
grant execute on function my_payment_details(uuid) to authenticated;

-- ---------- invoice references ----------
create sequence if not exists invoice_ref_seq start 1;
alter table invoices add column reference text;
update invoices set reference = 'TARP-' || lpad(nextval('invoice_ref_seq')::text, 4, '0') where reference is null;
alter table invoices alter column reference set default 'TARP-' || lpad(nextval('invoice_ref_seq')::text, 4, '0');
alter table invoices alter column reference set not null;
create unique index on invoices (reference);

-- new invoices take the organiser's prefix from settings (default TARP)
create or replace function ensure_invoice(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ev events%rowtype; mk markets%rowtype; pfx text;
begin
  select e.* into ev from requests r join events e on e.id = r.event_id where r.id = req;
  select * into mk from markets where id = ev.market_id;
  select coalesce(s.reference_prefix, 'TARP') into pfx from organiser_settings s where s.organiser_id = mk.organiser_id;
  insert into invoices (request_id, amount_pence, due_date, reference)
  values (req, ev.fee_pence, greatest(current_date, ev.date - mk.invoice_due_days_before),
          coalesce(pfx, 'TARP') || '-' || lpad(nextval('invoice_ref_seq')::text, 4, '0'))
  on conflict (request_id) do update
    set status = 'unpaid', amount_pence = excluded.amount_pence, due_date = excluded.due_date, paid_at = null
    where invoices.status = 'void';
end $$;

-- ---------- views ----------
drop view if exists public_events;
create view public_events as
select
  e.id, e.market_id, m.organiser_id, m.slug as market_slug, m.name as market_name, m.venue, m.postcode,
  e.date, e.start_time, e.end_time, e.max_pitches, e.fee_pence, e.status, e.note, e.theme,
  ((e.date + e.start_time) at time zone 'Europe/London') as starts_at,
  ((e.date + e.end_time) at time zone 'Europe/London') as ends_at,
  count(r.id) filter (where r.state = 'approved')::int as approved,
  count(r.id) filter (where r.state = 'requested')::int as requested,
  count(r.id) filter (where r.state = 'invited')::int as invited,
  (e.max_pitches - count(r.id) filter (where r.state in ('approved','requested','invited')))::int as available
from events e
join markets m on m.id = e.market_id
left join requests r on r.event_id = e.id
where e.status = 'published' and e.deleted_at is null
group by e.id, m.id;

-- Everything the organiser owns, deleted or not, for the archive and the edit pages.
create view organiser_events as
select
  e.id, e.market_id, m.organiser_id, m.name as market_name, m.deleted_at as market_deleted_at,
  e.date, e.start_time, e.end_time, e.max_pitches, e.fee_pence, e.status, e.note, e.theme, e.deleted_at,
  ((e.date + e.end_time) at time zone 'Europe/London') as ends_at,
  count(r.id) filter (where r.state = 'approved')::int as approved,
  count(r.id) filter (where r.state = 'requested')::int as requested,
  count(r.id) filter (where r.state = 'invited')::int as invited,
  count(i.id) filter (where i.status = 'paid')::int as paid
from events e
join markets m on m.id = e.market_id
left join requests r on r.event_id = e.id
left join invoices i on i.request_id = r.id
where is_organiser_member(m.organiser_id)
group by e.id, m.id;

grant select on public_events to anon, authenticated;
grant select on organiser_events to authenticated;

-- ---------- soft delete and restore ----------
create or replace function delete_event(ev uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organiser_member(org_of_event(ev)) then raise exception 'not allowed'; end if;
  update events set deleted_at = now() where id = ev and deleted_at is null;
  update invoices set status = 'void' where status = 'unpaid' and request_id in (select id from requests where event_id = ev);
end $$;

create or replace function restore_event(ev uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not is_organiser_member(org_of_event(ev)) then raise exception 'not allowed'; end if;
  update events set deleted_at = null where id = ev;
  for r in select id from requests where event_id = ev and state = 'approved' loop perform ensure_invoice(r.id); end loop;
end $$;

-- Deleting a location takes its future dates with it. Past dates stay in the archive.
create or replace function delete_market(mk uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int; t timestamptz := now();
begin
  if not is_organiser_member((select organiser_id from markets where id = mk)) then raise exception 'not allowed'; end if;
  update markets set deleted_at = t where id = mk and deleted_at is null;
  update events set deleted_at = t where market_id = mk and deleted_at is null and date >= current_date;
  get diagnostics n = row_count;
  update invoices set status = 'void' where status = 'unpaid'
    and request_id in (select r.id from requests r join events e on e.id = r.event_id where e.market_id = mk and e.deleted_at = t);
  return n;
end $$;

create or replace function restore_market(mk uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t timestamptz; r record;
begin
  if not is_organiser_member((select organiser_id from markets where id = mk)) then raise exception 'not allowed'; end if;
  select deleted_at into t from markets where id = mk;
  update markets set deleted_at = null where id = mk;
  update events set deleted_at = null where market_id = mk and deleted_at = t;
  for r in select rq.id from requests rq join events e on e.id = rq.event_id where e.market_id = mk and rq.state = 'approved' and e.date >= current_date
  loop perform ensure_invoice(r.id); end loop;
end $$;

grant execute on function delete_event(uuid), restore_event(uuid), delete_market(uuid), restore_market(uuid) to authenticated;

-- ---------- copy the line-up from any previous date ----------
drop function if exists copy_lineup(uuid);
create or replace function copy_lineup(ev uuid, from_ev uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare this_ev events%rowtype; src uuid := from_ev; n int := 0; s record;
begin
  if not is_organiser_member(org_of_event(ev)) then raise exception 'not allowed'; end if;
  select * into this_ev from events where id = ev;
  if src is null then
    select id into src from events where market_id = this_ev.market_id and date < this_ev.date and deleted_at is null and status = 'published' order by date desc limit 1;
  end if;
  if src is null or src = ev then return 0; end if;
  if org_of_event(src) <> org_of_event(ev) then raise exception 'not allowed'; end if;
  for s in
    select r.stallholder_id from requests r
    join stallholders st on st.id = r.stallholder_id and st.status = 'approved' and st.deleted_at is null
    where r.event_id = src and r.state = 'approved'
  loop
    -- make sure they are in this location's pool, then draft the invitation
    insert into stallholder_markets (stallholder_id, market_id) values (s.stallholder_id, this_ev.market_id) on conflict do nothing;
    if place_trader(ev, s.stallholder_id, 'invited') = 'invited' then n := n + 1; end if;
  end loop;
  return n;
end $$;
grant execute on function copy_lineup(uuid, uuid) to authenticated;

-- ---------- a deleted trader who applies again comes back as an application ----------
create or replace function apply_to_organiser(
  org_slug text, p_business text, p_contact text, p_email text, p_phone text,
  p_category uuid, p_description text, p_website text, p_instagram text, p_markets uuid[]
) returns text
language plpgsql security definer set search_path = public as $$
declare org uuid; cur stallholders%rowtype;
begin
  select id into org from organisers where slug = org_slug;
  if org is null then raise exception 'unknown organiser'; end if;
  if coalesce(trim(p_business),'') = '' or coalesce(trim(p_email),'') = '' then raise exception 'business name and email are required'; end if;
  select * into cur from stallholders where organiser_id = org and lower(email) = lower(trim(p_email));
  if cur.id is not null and cur.status = 'approved' and cur.deleted_at is null then return 'exists'; end if;
  if cur.id is not null then
    update stallholders set business_name = trim(p_business), contact_name = p_contact, phone = p_phone,
      category_id = p_category, description = p_description, website = p_website, instagram = p_instagram,
      requested_market_ids = coalesce(p_markets,'{}'), status = 'applied', applied_at = now(), deleted_at = null
    where id = cur.id;
    return 'updated';
  end if;
  insert into stallholders (organiser_id, business_name, contact_name, email, phone, category_id, description, website, instagram,
    requested_market_ids, status, applied_at, user_id)
  values (org, trim(p_business), p_contact, lower(trim(p_email)), p_phone, p_category, p_description, p_website, p_instagram,
    coalesce(p_markets,'{}'), 'applied', now(), auth.uid());
  return 'applied';
end $$;

-- a deleted trader cannot request dates
drop policy if exists "requests own insert" on requests;
create policy "requests own insert" on requests for insert with check (
  state = 'requested' and source = 'trader'
  and stallholder_id in (select my_stallholder_ids())
  and exists (
    select 1 from stallholders s
    join stallholder_markets sm on sm.stallholder_id = s.id
    join events e on e.market_id = sm.market_id
    where s.id = stallholder_id and s.status = 'approved' and s.deleted_at is null and e.id = event_id and e.deleted_at is null
  )
);
