-- ─────────────────────────────────────────────────────────────────────────
-- 180 — Profil ayrıcalık yükseltme koruması (defense in depth)
-- ─────────────────────────────────────────────────────────────────────────
-- profiles_org_admin_update RLS policy'si (migration 120) org_admin'in kendi
-- kurumundaki profilleri güncellemesine izin verir ve WITH CHECK içermez. Teoride
-- bir org_admin, anon/authenticated oturumuyla bir koçun role'ünü 'org_admin'
-- yaparak ayrıcalık yükseltebilir ya da organization_id'yi değiştirebilir.
--
-- Uygulama bu tür değişiklikleri her zaman service_role (supabaseAdmin) ile yapar;
-- bu yüzden role veya organization_id değişimini yalnızca service_role veya platform
-- admin (müdür) için serbest bırakıp diğer tüm oturumlarda reddediyoruz.
-- (coach_source için benzer koruma migration 140'ta mevcut.)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.guard_profile_privileged_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
begin
  if new.role is distinct from old.role
     or new.organization_id is distinct from old.organization_id then
    -- Service role (server action via supabaseAdmin client) bypass
    v_role := coalesce(auth.role(), '');
    if v_role = 'service_role' then
      return new;
    end if;

    -- Authenticated user: yalnızca platform admin (müdür)
    if current_user_role() <> 'admin' then
      raise exception 'Rol veya kurum ataması yalnızca platform yöneticisi (admin) tarafından değiştirilebilir.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_update on public.profiles;
create trigger trg_guard_profile_privileged_update
  before update of role, organization_id on public.profiles
  for each row execute function public.guard_profile_privileged_update();
