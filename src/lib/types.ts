export type PublicEvent = {
  id: string;
  market_id: string;
  organiser_id: string;
  market_slug: string;
  market_name: string;
  venue: string;
  postcode: string | null;
  date: string;
  start_time: string;
  end_time: string;
  max_pitches: number;
  fee_pence: number;
  status: "draft" | "published" | "cancelled";
  note: string | null;
  theme: string | null;
  starts_at: string;
  ends_at: string;
  approved: number;
  requested: number;
  invited: number;
  available: number;
};

/** Every event the organiser owns, including deleted ones. From the organiser_events view. */
export type OrganiserEvent = {
  id: string;
  market_id: string;
  organiser_id: string;
  market_name: string;
  market_deleted_at: string | null;
  date: string;
  start_time: string;
  end_time: string;
  max_pitches: number;
  fee_pence: number;
  status: "draft" | "published" | "cancelled";
  note: string | null;
  theme: string | null;
  deleted_at: string | null;
  ends_at: string;
  approved: number;
  requested: number;
  invited: number;
  paid: number;
};

export type Market = {
  id: string;
  organiser_id: string;
  name: string;
  slug: string;
  venue: string;
  address: string | null;
  postcode: string | null;
  recurrence_note: string | null;
  default_pitches: number;
  default_fee_pence: number;
  invoice_due_days_before: number;
  deleted_at: string | null;
};

export type Category = { id: string; name: string; cap: number | null; colour: string | null; sort: number };

export type Stallholder = {
  id: string;
  organiser_id: string;
  user_id: string | null;
  business_name: string;
  contact_name: string | null;
  email: string;
  category_id: string | null;
  notes: string | null;
  status: "applied" | "approved" | "rejected";
  description: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  requested_market_ids: string[];
  applied_at: string | null;
  deleted_at: string | null;
};

export type Member = {
  id: string;
  organiser_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: "owner" | "admin";
  invited_at: string;
  accepted_at: string | null;
  removed_at: string | null;
};

export type OrganiserSettings = {
  organiser_id: string;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  reference_prefix: string;
  payment_note: string | null;
  reply_to: string | null;
};

export type RequestState = "requested" | "invited" | "approved" | "declined" | "withdrawn" | "released";

export type EventMix = {
  event_id: string;
  category_id: string | null;
  category: string | null;
  cap: number | null;
  colour: string | null;
  sort: number | null;
  approved: number;
  requested: number;
  invited: number;
};
