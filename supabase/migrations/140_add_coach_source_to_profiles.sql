-- ─────────────────────────────────────────────────────────────────────────
-- 140 — Koç kaynağı (internal vs external)
-- ─────────────────────────────────────────────────────────────────────────
-- Sadece role='coach' profillerinde anlamlıdır:
--   internal: bizim ekibimiz, KoçUp tarafından davet edilmiş, MYK belgeli
--   external: bağımsız freelance koç, kendi öğrencilerini getirmiş, sadece
--             altyapı kullanıcısı
--
-- Görünürlük: Bu bilgi yalnızca platform admin (müdür) tarafından
-- okunmalı/yazılmalı.
--
-- Yazma: Trigger ile non-admin sessionların `coach_source` kolonuna update
--        atmasını engelliyoruz.
-- Okuma: Application-level. Tüm non-admin server query'leri profiles'tan
--        coach_source kolonunu SEÇMEMELİ. select() çağrıları zaten explicit
--        kolon listeleri içeriyor, bu disiplin korunduğu sürece kolon
--        sızdırılmaz.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists coach_source text default 'internal'
    check (coach_source is null or coach_source in ('internal', 'external'));

create index if not exists profiles_coach_source_idx
  on public.profiles (coach_source)
  where role = 'coach';

-- ─────────────────────────────────────────────────────────────────────────
-- Write guard: sadece admin coach_source'u değiştirebilir
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.guard_coach_source_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
begin
  if new.coach_source is distinct from old.coach_source then
    -- Service role (server action via supabaseAdmin client) bypass
    v_role := coalesce(auth.role(), '');
    if v_role = 'service_role' then
      return new;
    end if;

    -- Authenticated user: müdür olmalı
    if current_user_role() <> 'admin' then
      raise exception 'Koç kaynağını yalnızca platform yöneticisi (admin) değiştirebilir.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_coach_source_update on public.profiles;
create trigger trg_guard_coach_source_update
  before update of coach_source on public.profiles
  for each row execute function public.guard_coach_source_update();

-- ─────────────────────────────────────────────────────────────────────────
-- Mevcut koç profilleri: hepsi default 'internal' (geriye uyumlu)
-- (default değer DDL'de zaten 'internal'; bu satır no-op ama açıklayıcı)
-- ─────────────────────────────────────────────────────────────────────────
update public.profiles
  set coach_source = 'internal'
  where role = 'coach' and coach_source is null;
