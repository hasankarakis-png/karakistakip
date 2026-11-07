-- v5.2: Koç "Deneme takvimi" sekmesi. Koçun hangi deneme sınavlarını alacağını işaretler.
-- Yalnızca ekleme yapar; drop/revoke yok. Öğrenci bu tabloyu okuyamaz, yazamaz.
-- code: denemenin kararlı anahtarı "YYAAGG|T|Ad" (T/A/Y = TYT/AYT/YDT), istemcideki tarih listesiyle eşleşir.
create table if not exists public.deneme_plan(
  code text primary key check (char_length(code) between 8 and 160),
  picked_by uuid references auth.users(id) on delete set null,
  picked_at timestamptz not null default now());
alter table public.deneme_plan enable row level security;
create policy deneme_plan_coach_all on public.deneme_plan for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
