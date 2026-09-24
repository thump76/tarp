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
  approved: number;
  requested: number;
  invited: number;
  available: number;
};

export type Market = {
  id: string;
  organiser_id: string;
  name: string;
  slug: string;
  venue: string;
  postcode: string | null;
  recurrence_note: string | null;
  default_pitches: number;
  default_fee_pence: number;
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
