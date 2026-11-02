-- v4.6: Yarışmada takma ad kaldırıldı — öğrenciler kendini gizleyemez; herkes "Ad S." biçiminde görünür.
-- Mevcut takma adlar silinir, yeni takma ad yazılamaz (istemci arayüzü de kaldırıldı).
update public.challenge_prefs set alias = null where alias is not null;
create or replace function public.challenge_prefs_no_alias()
returns trigger language plpgsql set search_path = public as $$
begin new.alias := null; return new; end $$;
create or replace trigger challenge_prefs_no_alias before insert or update on public.challenge_prefs
for each row execute function public.challenge_prefs_no_alias();
