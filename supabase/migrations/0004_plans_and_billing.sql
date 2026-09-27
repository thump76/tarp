-- Tarp 0004: plans, Stripe billing and self-serve sign-up
--
--   * organiser_billing: one row per paying organiser. Members can read it; nobody but the
--     service role (the Stripe webhook) can write it, so a plan can't be edited from the browser.
--     Organisers with no billing row (The Producers Markets) are treated as Business, free.
--   * signups: one row per completed Stripe Checkout. Its primary key is the lock that stops the
--     webhook and the thank-you page creating the same organiser twice.
--   * provision_organiser(): creates the organiser, its owner, settings and starter categories in
--     one transaction. Service role only.

create table organiser_billing (
  organiser_id uuid primary key references organisers(id) on delete cascade,
  plan text not null check (plan in ('starter','business')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,                           -- Stripe subscription status: trialing, active, past_due, canceled...
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table organiser_billing enable row level security;
create policy "billing member read" on organiser_billing for select using (is_organiser_member(organiser_id));

create table signups (
  checkout_session_id text primary key,
  email text not null,
  organiser_id uuid references organisers(id) on delete set null,
  welcomed_at timestamptz,               -- set when the thank-you page signs them in; one use only
  created_at timestamptz not null default now()
);
alter table signups enable row level security;   -- no policies: service role only

create or replace function provision_organiser(
  p_session text, p_email text, p_name text, p_org_name text, p_plan text,
  p_customer text, p_subscription text, p_status text, p_period_end timestamptz, p_trial_end timestamptz,
  out org uuid, out created boolean
)
language plpgsql security definer set search_path = public as $$
declare base text; s text; i int := 1;
begin
  created := false;
  -- the lock: a second caller waits here until the first commits, then finds the row
  insert into signups (checkout_session_id, email) values (p_session, lower(p_email)) on conflict do nothing;
  if not found then
    select organiser_id into org from signups where checkout_session_id = p_session;
    return;
  end if;

  base := left(coalesce(nullif(trim(both '-' from regexp_replace(lower(p_org_name), '[^a-z0-9]+', '-', 'g')), ''), 'market'), 50);
  s := base;
  while exists (select 1 from organisers where slug = s) loop
    i := i + 1; s := base || '-' || i;
  end loop;

  insert into organisers (name, slug) values (p_org_name, s) returning id into org;
  insert into organiser_billing (organiser_id, plan, stripe_customer_id, stripe_subscription_id, status, current_period_end, trial_end)
    values (org, p_plan, p_customer, p_subscription, p_status, p_period_end, p_trial_end);
  insert into organiser_members (organiser_id, email, name, role) values (org, lower(p_email), nullif(p_name, ''), 'owner');
  insert into organiser_settings (organiser_id, reply_to) values (org, lower(p_email)) on conflict do nothing;
  insert into categories (organiser_id, name, colour, sort) values
    (org, 'Hot food',  '#8A4B32', 10),
    (org, 'Bakery',    '#B8781A', 20),
    (org, 'Drink',     '#6B5A8E', 30),
    (org, 'Coffee',    '#5A3E2B', 40),
    (org, 'Produce',   '#3D7357', 50),
    (org, 'Cosmetics', '#B45F7A', 60),
    (org, 'Crafts',    '#4A6FA5', 70),
    (org, 'Art',       '#2F7F8C', 80),
    (org, 'Plants',    '#7FA34B', 90);
  update signups set organiser_id = org where checkout_session_id = p_session;
  created := true;
end $$;

revoke all on function provision_organiser(text, text, text, text, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function provision_organiser(text, text, text, text, text, text, text, text, timestamptz, timestamptz) to service_role;
