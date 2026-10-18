-- ─────────────────────────────────────────────────────────────────────────
-- 197 — study_sessions konu bağlantısı + düzenleme denetimi (study_sessions, exams)
-- ─────────────────────────────────────────────────────────────────────────
-- 1) study_sessions.topic_id: soru çözüm kaydı artık ders DEĞİL konu seviyesinde
--    tutulabilir. Nullable → eski kayıtlar ve assignment üzerinden gelen
--    kayıtlar bozulmaz (096'daki assignment_id soft-link deseni).
--    Konu ↔ ders tutarlılığı CHECK ile yazılamaz (alt sorgu gerekir); server
--    action içinde doğrulanır (bkz. app/ogrenci/soru-cozum/actions.ts).
--
-- 2) updated_at / updated_by: "düzenlendi" bilgisi. DEFAULT YOK — insert'te
--    null kalır, böylece "düzenlendi" = (updated_at is not null) olur ve hiç
--    dokunulmamış kayıtlar yanlışlıkla düzenlenmiş görünmez. Ayrı boolean
--    kolona gerek kalmaz.
--
-- Idempotent (168 catchup deseni): if not exists / drop if exists.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Konu bağlantısı ───────────────────────────────────────────────────
alter table public.study_sessions
  add column if not exists topic_id uuid
    references public.topics(id) on delete set null;

create index if not exists study_sessions_topic_id_idx
  on public.study_sessions (topic_id);

create index if not exists study_sessions_student_topic_idx
  on public.study_sessions (student_id, topic_id);

-- ── 2) Düzenleme denetim kolonları ───────────────────────────────────────
alter table public.study_sessions
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid
    references public.profiles(id) on delete set null;

alter table public.exams
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid
    references public.profiles(id) on delete set null;

-- ── 3) Trigger: güncellemede zaman + kim ─────────────────────────────────
-- Mevcut public.set_updated_at() yalnızca updated_at yazar; burada ayrıca
-- auth.uid() ile düzenleyen kişiyi de saklıyoruz (service-role bağlamında
-- auth.uid() null döner → kolon nullable).
create or replace function public.set_edit_audit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_study_sessions_edit_audit on public.study_sessions;
-- WHEN: yalnızca içerik kolonları değişince "düzenlendi" say. updated_at
-- listede → server action/RPC updated_at'e dokunarak denetimi zorlayabilir.
create trigger trg_study_sessions_edit_audit
  before update on public.study_sessions
  for each row
  when ((old.subject_id, old.topic_id, old.date, old.correct, old.wrong,
         old.empty, old.duration_minutes, old.resource_id, old.updated_at)
        is distinct from
        (new.subject_id, new.topic_id, new.date, new.correct, new.wrong,
         new.empty, new.duration_minutes, new.resource_id, new.updated_at))
  execute function public.set_edit_audit();

drop trigger if exists trg_exams_edit_audit on public.exams;
-- pdf_path listede YOK: lib/exams/pdf-actions.ts deneme oluşturulduktan hemen
-- sonra pdf_path yazar; bu yeni denemeyi "düzenlendi" göstermemeli. Ders
-- satırları (exam_results) değişince RPC updated_at'e dokunur (bkz. 199).
create trigger trg_exams_edit_audit
  before update on public.exams
  for each row
  when ((old.name, old.exam_type, old.date, old.siralama, old.notes, old.updated_at)
        is distinct from
        (new.name, new.exam_type, new.date, new.siralama, new.notes, new.updated_at))
  execute function public.set_edit_audit();
