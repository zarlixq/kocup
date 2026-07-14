-- ─────────────────────────────────────────────────────────────────────────
-- 192 — org_admin readonly haftalık program uyumu için eksik SELECT policy'leri
-- ─────────────────────────────────────────────────────────────────────────
-- StudentOverview (variant="readonly") kurum panelinde de kullanılıyor ve artık
-- haftalık program uyumunu (weekly_programs / weekly_program_items) gösteriyor.
-- Bu tablolarda org_admin SELECT policy'si yoktu → org_admin öğrenci detayında
-- uyum daima "Program yok" görünüyordu (yanıltıcı). Migration 181 desenini birebir
-- izleyerek yalnız SELECT ekleniyor → org_admin READONLY kalır (insert/update/delete
-- hâlâ öğrenci + koç + admin'e kısıtlı). Mevcut RLS bozulmaz; policy additive'dir.
--
-- ROLLBACK:
--   drop policy if exists "weekly_programs_org_admin_select" on public.weekly_programs;
--   drop policy if exists "weekly_program_items_org_admin_select" on public.weekly_program_items;
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "weekly_programs_org_admin_select" on public.weekly_programs;
create policy "weekly_programs_org_admin_select" on public.weekly_programs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = weekly_programs.student_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

drop policy if exists "weekly_program_items_org_admin_select" on public.weekly_program_items;
create policy "weekly_program_items_org_admin_select" on public.weekly_program_items
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = public.weekly_program_student(weekly_program_items.program_id)
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );
