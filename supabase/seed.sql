-- Seed: The Producers Markets (CC Events UK), 2026 dates from theproducersmarkets.co.uk/events
-- Run after 0001_schema.sql. Membership is added separately once Philip and CC Events have signed in
-- (see README: "Make yourself an organiser member").

insert into organisers (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'The Producers Markets', 'producers-markets');

insert into categories (organiser_id, name, cap, colour, sort) values
  ('11111111-1111-1111-1111-111111111111', 'Hot food',   6, '#8A4B32', 10),
  ('11111111-1111-1111-1111-111111111111', 'Bakery',     3, '#B8781A', 20),
  ('11111111-1111-1111-1111-111111111111', 'Drink',      3, '#6B5A8E', 30),
  ('11111111-1111-1111-1111-111111111111', 'Coffee',     1, '#5A3E2B', 40),
  ('11111111-1111-1111-1111-111111111111', 'Produce',    4, '#3D7357', 50),
  ('11111111-1111-1111-1111-111111111111', 'Cosmetics',  3, '#B45F7A', 60),
  ('11111111-1111-1111-1111-111111111111', 'Candles',    2, '#C9A227', 70),
  ('11111111-1111-1111-1111-111111111111', 'Crafts',     8, '#4A6FA5', 80),
  ('11111111-1111-1111-1111-111111111111', 'Art',        5, '#2F7F8C', 90),
  ('11111111-1111-1111-1111-111111111111', 'Plants',     2, '#7FA34B', 100),
  ('11111111-1111-1111-1111-111111111111', 'Pets',       1, '#9C7B5C', 110);

insert into markets (id, organiser_id, name, slug, venue, postcode, recurrence_note, default_pitches, default_fee_pence) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Severndroog Castle', 'severndroog', 'Severndroog Castle, Shooters Hill', 'SE18 3RT', '1st Sunday of the month', 30, 4000),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Lesnes Abbey', 'lesnes-abbey', 'Lesnes Abbey, Belvedere Road', 'SE2 0AX', '2nd Sunday of the month', 50, 4000),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Danson House', 'danson-house', 'Danson Park, Danson Road', 'DA6 8HL', '4th Sunday of the month', 25, 4000),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Royal Arsenal', 'royal-arsenal', 'Artillery Square, Royal Arsenal', 'SE18 4DX', '2nd and 4th Saturday of the month', 40, 4000);

-- 2026 dates. Severndroog has no market in April; Lesnes Abbey and Danson House have none in December.
insert into events (market_id, date, max_pitches, fee_pence)
select '22222222-2222-2222-2222-222222222201', d, 30, 4000 from unnest(array[
  '2026-02-01','2026-03-01','2026-05-03','2026-06-07','2026-07-05','2026-08-02','2026-09-06','2026-10-04','2026-11-01','2026-12-06']::date[]) d;

insert into events (market_id, date, max_pitches, fee_pence)
select '22222222-2222-2222-2222-222222222202', d, 50, 4000 from unnest(array[
  '2026-02-08','2026-03-08','2026-04-12','2026-05-10','2026-06-14','2026-07-12','2026-08-09','2026-09-13','2026-10-11','2026-11-08']::date[]) d;

insert into events (market_id, date, max_pitches, fee_pence)
select '22222222-2222-2222-2222-222222222203', d, 25, 4000 from unnest(array[
  '2026-02-22','2026-03-22','2026-04-26','2026-05-24','2026-06-28','2026-07-26','2026-08-23','2026-09-27','2026-10-25','2026-11-22']::date[]) d;

insert into events (market_id, date, max_pitches, fee_pence)
select '22222222-2222-2222-2222-222222222204', d, 40, 4000 from unnest(array[
  '2026-02-14','2026-02-28','2026-03-14','2026-03-28','2026-04-11','2026-04-25','2026-05-09','2026-05-23','2026-06-13','2026-07-11','2026-07-25','2026-08-08','2026-09-12','2026-09-26','2026-10-10','2026-10-24','2026-11-14','2026-11-28']::date[]) d;

update events set note = 'Christmas market' where date in ('2026-11-28','2026-12-06');
