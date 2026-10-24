-- ─────────────────────────────────────────────────────────────────────────
-- 231 — UpPlan: yol haritası ve program taslağı için 'superseded' durumu
-- ─────────────────────────────────────────────────────────────────────────
-- Track geçişinde (Faz D) eski taslak upplan_archive'a kopyalanır; yeni taslak
-- üretilemiyorsa (müsaitlik / sınıf eksik) canlı satır 'superseded' olur ve
-- program üretimi durur (yalnız 'onaylandi' yol haritası programa dönüşür).
alter table public.upplan_roadmaps drop constraint if exists upplan_roadmaps_status_check;
alter table public.upplan_program_drafts drop constraint if exists upplan_program_drafts_status_check;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'upplan_roadmaps_status_check2' and conrelid = 'public.upplan_roadmaps'::regclass) then
    alter table public.upplan_roadmaps add constraint upplan_roadmaps_status_check2
      check (status in ('taslak', 'onaylandi', 'koca_onerildi', 'superseded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'upplan_program_drafts_status_check2' and conrelid = 'public.upplan_program_drafts'::regclass) then
    alter table public.upplan_program_drafts add constraint upplan_program_drafts_status_check2
      check (status in ('taslak', 'onaylandi', 'reddedildi', 'koca_onerildi', 'superseded'));
  end if;
end $$;
