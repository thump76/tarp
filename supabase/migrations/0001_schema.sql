-- Marketday schema v1
-- Core loop: an event has N pitches. A request is Requested, Approved, Declined or Released.
-- Paid is a property of the approved request's invoice, not a state of its own.

create extension if not exists "pgcrypto";

-- ---------- organisers and membership ----------
create table organisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table organiser_members (
  organiser_id uuid not null references organisers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin')),
  primary key (organiser_id, user_id)
);

-- ---------- markets and events ----------
create table markets (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references organisers(id) on delete cascade,
  name text not null,
  slug text not null,
  venue text not null,
  address text,
  postcode text,
  recurrence_note text,                 -- "1st Sunday of the month"; human text, dates are explicit rows
  default_pitches int not null default 30,
  default_fee_pence int not null default 4000,
  invoice_due_days_before int not null default 14,
  created_at timestamptz not null default now(),
  unique (organiser_id, slug)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets(id) on delete cascade,
  date date not null,
  start_time time not null default '10:00',
  end_time time not null default '15:00',
  max_pitches int not null,
  fee_pence int not null,
  status text not null default 'published' check (status in ('draft','published','cancelled')),
  note text,
  created_at timestamptz not null default now(),
  unique (market_id, date)
);

-- ---------- categories and stallholders ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references organisers(id) on delete cascade,
  name text not null,
  cap int,                              -- soft cap per event; null = no cap
  colour text,                          -- hex, for the mix bar
  sort int not null default 100,
  unique (organiser_id, name)
);

create table stallholders (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references organisers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  category_id uuid references categories(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (organiser_id, email)
);

-- ---------- requests (the pitch) ----------
create table requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  stallholder_id uuid not null references stallholders(id) on delete cascade,
  state text not null default 'requested' check (state in ('requested','approved','declined','released')),
  position int,                         -- pitch number on the layout, later
  message text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (event_id, stallholder_id)
);

-- ---------- invoices and reminders ----------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  amount_pence int not null,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  paid_at timestamptz,
  payment_url text,                     -- Stripe hosted invoice, later
  stripe_invoice_id text,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  kind text not null check (kind in ('auto_7d','auto_2d','manual')),
  sent_at timestamptz not null default now()
);

create index on events (market_id, date);
create index on requests (event_id, state);
create index on requests (stallholder_id);
create index on stallholders (user_id);

-- ---------- helpers ----------
create or replace function is_organiser_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organiser_members where organiser_id = org and user_id = auth.uid());
$$;

create or replace function my_stallholder_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from stallholders where user_id = auth.uid();
$$;

-- Public view: what anyone can see about an event. Counts only, no names.
create or replace view public_events as
select
  e.id, e.market_id, m.organiser_id, m.slug as market_slug, m.name as market_name, m.venue, m.postcode,
  e.date, e.start_time, e.end_time, e.max_pitches, e.fee_pence, e.status, e.note,
  coalesce(sum(case when r.state = 'approved' then 1 else 0 end), 0)::int as approved,
  coalesce(sum(case when r.state = 'requested' then 1 else 0 end), 0)::int as requested,
  (e.max_pitches - coalesce(sum(case when r.state in ('approved','requested') then 1 else 0 end), 0))::int as available
from events e
join markets m on m.id = e.market_id
left join requests r on r.event_id = e.id
where e.status = 'published'
group by e.id, m.id;

-- Mix per event per category, for the organiser calendar and the mix check.
create or replace view event_mix as
select r.event_id, c.id as category_id, c.name as category, c.cap, c.colour, c.sort,
  count(*) filter (where r.state = 'approved')::int as approved,
  count(*) filter (where r.state = 'requested')::int as requested
from requests r
join stallholders s on s.id = r.stallholder_id
left join categories c on c.id = s.category_id
group by r.event_id, c.id, c.name, c.cap, c.colour, c.sort;

-- ---------- row level security ----------
alter table organisers enable row level security;
alter table organiser_members enable row level security;
alter table markets enable row level security;
alter table events enable row level security;
alter table categories enable row level security;
alter table stallholders enable row level security;
alter table requests enable row level security;
alter table invoices enable row level security;
alter table reminders enable row level security;

-- organisers: readable by anyone (name and slug only matter), writable by members
create policy "organisers public read" on organisers for select using (true);
create policy "organisers member write" on organisers for all using (is_organiser_member(id)) with check (is_organiser_member(id));

create policy "members see own" on organiser_members for select using (user_id = auth.uid() or is_organiser_member(organiser_id));

-- markets and published events are public
create policy "markets public read" on markets for select using (true);
create policy "markets member write" on markets for all using (is_organiser_member(organiser_id)) with check (is_organiser_member(organiser_id));

create policy "events public read" on events for select using (status = 'published' or is_organiser_member((select organiser_id from markets where id = market_id)));
create policy "events member write" on events for all
  using (is_organiser_member((select organiser_id from markets where id = market_id)))
  with check (is_organiser_member((select organiser_id from markets where id = market_id)));

create policy "categories public read" on categories for select using (true);
create policy "categories member write" on categories for all using (is_organiser_member(organiser_id)) with check (is_organiser_member(organiser_id));

-- stallholders: members see all in their organiser; a stallholder sees and edits their own row
create policy "stallholders member all" on stallholders for all using (is_organiser_member(organiser_id)) with check (is_organiser_member(organiser_id));
create policy "stallholder own read" on stallholders for select using (user_id = auth.uid());
create policy "stallholder own update" on stallholders for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "stallholder self insert" on stallholders for insert with check (user_id = auth.uid());

-- requests: members see all; stallholders see their own and can create one
create policy "requests member all" on requests for all
  using (is_organiser_member((select m.organiser_id from events e join markets m on m.id = e.market_id where e.id = event_id)))
  with check (is_organiser_member((select m.organiser_id from events e join markets m on m.id = e.market_id where e.id = event_id)));
create policy "requests own read" on requests for select using (stallholder_id in (select my_stallholder_ids()));
create policy "requests own insert" on requests for insert with check (stallholder_id in (select my_stallholder_ids()) and state = 'requested');

create policy "invoices member all" on invoices for all
  using (is_organiser_member((select m.organiser_id from requests r join events e on e.id = r.event_id join markets m on m.id = e.market_id where r.id = request_id)))
  with check (is_organiser_member((select m.organiser_id from requests r join events e on e.id = r.event_id join markets m on m.id = e.market_id where r.id = request_id)));
create policy "invoices own read" on invoices for select using (request_id in (select id from requests where stallholder_id in (select my_stallholder_ids())));

create policy "reminders member all" on reminders for all
  using (is_organiser_member((select m.organiser_id from invoices i join requests r on r.id = i.request_id join events e on e.id = r.event_id join markets m on m.id = e.market_id where i.id = invoice_id)))
  with check (true);

grant select on public_events, event_mix to anon, authenticated;

-- ---------- approve: one transaction, creates the invoice ----------
create or replace function approve_request(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev events%rowtype; mk markets%rowtype;
begin
  select e.* into ev from requests r join events e on e.id = r.event_id where r.id = req;
  select * into mk from markets where id = ev.market_id;
  if not is_organiser_member(mk.organiser_id) then raise exception 'not allowed'; end if;
  update requests set state = 'approved', decided_at = now() where id = req and state = 'requested';
  insert into invoices (request_id, amount_pence, due_date)
  values (req, ev.fee_pence, greatest(current_date, ev.date - mk.invoice_due_days_before))
  on conflict (request_id) do nothing;
end $$;

create or replace function decline_request(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select m.organiser_id into org from requests r join events e on e.id = r.event_id join markets m on m.id = e.market_id where r.id = req;
  if not is_organiser_member(org) then raise exception 'not allowed'; end if;
  update requests set state = 'declined', decided_at = now() where id = req and state = 'requested';
end $$;

-- release an unpaid approved pitch back to available
create or replace function release_request(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select m.organiser_id into org from requests r join events e on e.id = r.event_id join markets m on m.id = e.market_id where r.id = req;
  if not is_organiser_member(org) then raise exception 'not allowed'; end if;
  update requests set state = 'released', decided_at = now() where id = req and state = 'approved';
  update invoices set status = 'void' where request_id = req and status = 'unpaid';
end $$;
