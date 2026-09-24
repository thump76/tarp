-- Tarp 0002: trader applications, market pools, invitations and the market board.
--
-- Flow
--   1. A trader applies to an organiser (apply_to_organiser, works signed out). status = 'applied'.
--   2. The organiser approves and ticks the markets they may trade at (decide_application).
--      The ticks live in stallholder_markets; together they form each market's pool.
--   3. For each date the organiser builds the market on a board:
--        Pool -> Invited -> Attending      (organiser asks, trader confirms)
--        Requested -> Attending            (trader asked from the public calendar)
--      place_trader() moves a trader between columns; respond_invite() is the trader's yes/no.
--   4. Attending = request state 'approved'. An invoice is created on entry.
--   5. Imported and applying traders sign in later by magic link; claim_my_profiles()
--      attaches their auth user to any stallholder row with the same email.

-- ---------- trader profile ----------
alter table stallholders
  add column status text not null default 'approved' check (status in ('applied','approved','rejected')),
  add column description text,
  add column website text,
  add column instagram text,
  add column requested_market_ids uuid[] not null default '{}',
  add column applied_at timestamptz,
  add column approved_at timestamptz;
-- rows that existed before this migration stay approved; new rows start as applications
alter table stallholders alter column status set default 'applied';

create table stallholder_markets (
  stallholder_id uuid not null references stallholders(id) on delete cascade,
  market_id uuid not null references markets(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (stallholder_id, market_id)
);
create index on stallholder_markets (market_id);

-- anyone who had already requested a pitch at a market is in that market's pool
insert into stallholder_markets (stallholder_id, market_id)
select distinct r.stallholder_id, e.market_id from requests r join events e on e.id = r.event_id
on conflict do nothing;

-- ---------- request states ----------
alter table requests drop constraint requests_state_check;
alter table requests add constraint requests_state_check
  check (state in ('requested','invited','approved','declined','withdrawn','released'));
alter table requests
  add column source text not null default 'trader' check (source in ('trader','organiser')),
  add column invited_at timestamptz,
  add column notified_at timestamptz;   -- invitations are drafts until the organiser sends them

-- ---------- views (recreated to count invited as holding a pitch) ----------
drop view if exists public_events;
create view public_events as
select
  e.id, e.market_id, m.organiser_id, m.slug as market_slug, m.name as market_name, m.venue, m.postcode,
  e.date, e.start_time, e.end_time, e.max_pitches, e.fee_pence, e.status, e.note,
  count(r.id) filter (where r.state = 'approved')::int as approved,
  count(r.id) filter (where r.state = 'requested')::int as requested,
  count(r.id) filter (where r.state = 'invited')::int as invited,
  (e.max_pitches - count(r.id) filter (where r.state in ('approved','requested','invited')))::int as available
from events e
join markets m on m.id = e.market_id
left join requests r on r.event_id = e.id
where e.status = 'published'
group by e.id, m.id;

drop view if exists event_mix;
create view event_mix as
select r.event_id, c.id as category_id, c.name as category, c.cap, c.colour, c.sort,
  count(*) filter (where r.state = 'approved')::int as approved,
  count(*) filter (where r.state = 'requested')::int as requested,
  count(*) filter (where r.state = 'invited')::int as invited
from requests r
join stallholders s on s.id = r.stallholder_id
left join categories c on c.id = s.category_id
group by r.event_id, c.id, c.name, c.cap, c.colour, c.sort;

grant select on public_events, event_mix to anon, authenticated;

-- ---------- RLS ----------
alter table stallholder_markets enable row level security;
create policy "sm member all" on stallholder_markets for all
  using (is_organiser_member((select organiser_id from stallholders where id = stallholder_id)))
  with check (is_organiser_member((select organiser_id from stallholders where id = stallholder_id)));
create policy "sm own read" on stallholder_markets for select using (stallholder_id in (select my_stallholder_ids()));

-- applications go through apply_to_organiser(); traders cannot write their own row directly
drop policy if exists "stallholder self insert" on stallholders;
drop policy if exists "stallholder own update" on stallholders;

-- a trader may request a date only when approved and ticked for that market
drop policy if exists "requests own insert" on requests;
create policy "requests own insert" on requests for insert with check (
  state = 'requested' and source = 'trader'
  and stallholder_id in (select my_stallholder_ids())
  and exists (
    select 1 from stallholders s
    join stallholder_markets sm on sm.stallholder_id = s.id
    join events e on e.market_id = sm.market_id
    where s.id = stallholder_id and s.status = 'approved' and e.id = event_id
  )
);

-- ---------- helpers ----------
create or replace function org_of_event(ev uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.organiser_id from events e join markets m on m.id = e.market_id where e.id = ev;
$$;

-- create (or revive a voided) invoice for an attending trader
create or replace function ensure_invoice(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ev events%rowtype; mk markets%rowtype;
begin
  select e.* into ev from requests r join events e on e.id = r.event_id where r.id = req;
  select * into mk from markets where id = ev.market_id;
  insert into invoices (request_id, amount_pence, due_date)
  values (req, ev.fee_pence, greatest(current_date, ev.date - mk.invoice_due_days_before))
  on conflict (request_id) do update
    set status = 'unpaid', amount_pence = excluded.amount_pence, due_date = excluded.due_date, paid_at = null
    where invoices.status = 'void';
end $$;

-- approve now goes through ensure_invoice so a released-then-reapproved pitch gets a live invoice
create or replace function approve_request(req uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organiser_member(org_of_event((select event_id from requests where id = req))) then raise exception 'not allowed'; end if;
  update requests set state = 'approved', decided_at = now() where id = req and state in ('requested','invited');
  if found then perform ensure_invoice(req); end if;
end $$;

-- ---------- the board ----------
-- Move a trader on an event's board. to_state: 'pool' | 'invited' | 'approved'.
create or replace function place_trader(ev uuid, sh uuid, to_state text) returns text
language plpgsql security definer set search_path = public as $$
declare cur requests%rowtype; rid uuid;
begin
  if not is_organiser_member(org_of_event(ev)) then raise exception 'not allowed'; end if;
  if to_state not in ('pool','invited','approved') then raise exception 'bad state %', to_state; end if;
  select * into cur from requests where event_id = ev and stallholder_id = sh;

  if to_state = 'pool' then
    if cur.id is null then return 'noop'; end if;
    if cur.state = 'requested' then update requests set state = 'declined', decided_at = now() where id = cur.id; return 'declined'; end if;
    if cur.state = 'invited' then delete from requests where id = cur.id; return 'uninvited'; end if;
    if cur.state = 'approved' then
      update requests set state = 'released', decided_at = now() where id = cur.id;
      update invoices set status = 'void' where request_id = cur.id and status = 'unpaid';
      return 'released';
    end if;
    return 'noop';
  end if;

  if to_state = 'invited' then
    if cur.id is null then
      insert into requests (event_id, stallholder_id, state, source, invited_at) values (ev, sh, 'invited', 'organiser', now());
      return 'invited';
    end if;
    if cur.state in ('declined','withdrawn','released') then
      update requests set state = 'invited', source = 'organiser', invited_at = now(), notified_at = null, decided_at = null where id = cur.id;
      return 'invited';
    end if;
    return 'noop';  -- already requested, invited or attending
  end if;

  -- to_state = 'approved' (Attending)
  if cur.id is null then
    insert into requests (event_id, stallholder_id, state, source, decided_at) values (ev, sh, 'approved', 'organiser', now()) returning id into rid;
  elsif cur.state = 'approved' then
    return 'noop';
  else
    update requests set state = 'approved', decided_at = now() where id = cur.id;
    rid := cur.id;
  end if;
  perform ensure_invoice(rid);
  return 'approved';
end $$;

-- Invite last date's attending traders at the same market onto this date. Returns how many.
create or replace function copy_lineup(ev uuid) returns int
language plpgsql security definer set search_path = public as $$
declare this_ev events%rowtype; prev uuid; n int := 0; s record;
begin
  if not is_organiser_member(org_of_event(ev)) then raise exception 'not allowed'; end if;
  select * into this_ev from events where id = ev;
  select id into prev from events where market_id = this_ev.market_id and date < this_ev.date and status = 'published' order by date desc limit 1;
  if prev is null then return 0; end if;
  for s in
    select r.stallholder_id from requests r
    join stallholders st on st.id = r.stallholder_id and st.status = 'approved'
    join stallholder_markets sm on sm.stallholder_id = r.stallholder_id and sm.market_id = this_ev.market_id
    where r.event_id = prev and r.state = 'approved'
  loop
    if place_trader(ev, s.stallholder_id, 'invited') = 'invited' then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ---------- trader side ----------
-- The trader answers an invitation. Accepting creates the invoice.
create or replace function respond_invite(req uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from requests where id = req and stallholder_id in (select my_stallholder_ids()) and state = 'invited' and notified_at is not null) then
    raise exception 'no open invitation';
  end if;
  if accept then
    update requests set state = 'approved', decided_at = now() where id = req;
    perform ensure_invoice(req);
  else
    update requests set state = 'withdrawn', decided_at = now() where id = req;
  end if;
end $$;

-- Apply to trade with an organiser. Works signed out. Returns 'applied', 'updated' or 'exists'.
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
  if cur.id is not null and cur.status = 'approved' then return 'exists'; end if;
  if cur.id is not null then
    update stallholders set business_name = trim(p_business), contact_name = p_contact, phone = p_phone,
      category_id = p_category, description = p_description, website = p_website, instagram = p_instagram,
      requested_market_ids = coalesce(p_markets,'{}'), status = 'applied', applied_at = now()
    where id = cur.id;
    return 'updated';
  end if;
  insert into stallholders (organiser_id, business_name, contact_name, email, phone, category_id, description, website, instagram,
    requested_market_ids, status, applied_at, user_id)
  values (org, trim(p_business), p_contact, lower(trim(p_email)), p_phone, p_category, p_description, p_website, p_instagram,
    coalesce(p_markets,'{}'), 'applied', now(), auth.uid());
  return 'applied';
end $$;

-- Organiser approves or rejects an application and sets its markets.
create or replace function decide_application(sh uuid, approve boolean, market_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_organiser_member((select organiser_id from stallholders where id = sh)) then raise exception 'not allowed'; end if;
  update stallholders set status = case when approve then 'approved' else 'rejected' end,
    approved_at = case when approve then now() else approved_at end
  where id = sh;
  delete from stallholder_markets where stallholder_id = sh;
  if approve then
    insert into stallholder_markets (stallholder_id, market_id)
    select sh, m from unnest(coalesce(market_ids,'{}')) m on conflict do nothing;
  end if;
end $$;

-- Attach the signed-in user to any trader rows (imported or applied signed out) with their email.
create or replace function claim_my_profiles() returns int
language plpgsql security definer set search_path = public as $$
declare n int; em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or em = '' then return 0; end if;
  update stallholders set user_id = auth.uid() where user_id is null and lower(email) = em;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function apply_to_organiser(text,text,text,text,text,uuid,text,text,text,uuid[]) to anon, authenticated;
grant execute on function respond_invite(uuid, boolean), claim_my_profiles() to authenticated;
grant execute on function place_trader(uuid,uuid,text), copy_lineup(uuid), decide_application(uuid,boolean,uuid[]) to authenticated;
