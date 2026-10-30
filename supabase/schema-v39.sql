-- v3.9: öğrencinin kendi şifresini değiştirmesi (pin-change fonksiyonu kullanır)
-- Mevcut şifre sunucuda doğrulanır; hatalı denemeler pin_attempts'te sayılır (15 dakikada en fazla 5).

create table if not exists public.pin_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null default false
);
create index if not exists pin_attempts_user_at on public.pin_attempts (user_id, at desc);
alter table public.pin_attempts enable row level security;
-- Politika yok: yalnızca sunucu (service_role) okur ve yazar.

-- Şifre doğrulama: yalnızca service_role çağrısında sonuç döner, diğer rollere null.
create or replace function public.pin_check(p_uid uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare h text;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    return null;
  end if;
  select u.encrypted_password into h from auth.users u where u.id = p_uid;
  if h is null or h = '' or p_pin is null then
    return false;
  end if;
  return h = extensions.crypt(p_pin, h);
end;
$$;

-- Çalıştırma yetkisi yalnızca sunucuda (30 Ekim 2026'da canlıya uygulandı).
revoke execute on function public.pin_check(uuid, text) from public, anon, authenticated;
grant execute on function public.pin_check(uuid, text) to service_role;
