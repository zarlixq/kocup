-- ─────────────────────────────────────────────────────────────────────────
-- 201 — Öğrenci kendi programı + kendi konu hedefleri; sahiplik (created_by_role)
-- ─────────────────────────────────────────────────────────────────────────
-- Öğrenci paneli koç olmadan da kullanılabilsin:
--   * weekly_program_items: saat bloğu, konu, hedef soru + sahiplik
--   * topic_assignments: öğrencinin kendine koyduğu hedef (coach_id null),
--     hedef doğruluk %, hedef soru opsiyonel
--
-- SAHİPLİK KURALI (RLS + trigger, uygulama katmanına güvenilmez):
--   created_by_role ∈ student | coach | ai. İstemci değeri YOK SAYILIR; insert
--   trigger'ı çağıranın rolünden yazar. 'ai' yalnızca service role (auth.uid()
--   null) tarafından yazılabilir.
--   "Yabancı" satır (öğrenci → koç satırı, koç → öğrenci satırı) üzerinde sadece
--   tamamlanma alanları değişebilir. Koç öğrenci satırını silebilir (karar),
--   öğrenci koç satırını silemez.
--
-- Mevcut tüm satırlar koç/admin üretimidir → default 'coach'.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Kolonlar ──────────────────────────────────────────────────────────
alter table public.weekly_program_items
  add column if not exists created_by_role text not null default 'coach',
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists hedef_soru integer;

alter table public.weekly_program_items
  drop constraint if exists weekly_program_items_created_by_role_check,
  add constraint weekly_program_items_created_by_role_check
    check (created_by_role in ('student', 'coach', 'ai')),
  drop constraint if exists weekly_program_items_hedef_soru_check,
  add constraint weekly_program_items_hedef_soru_check
    check (hedef_soru is null or hedef_soru > 0),
  drop constraint if exists weekly_program_items_time_check,
  add constraint weekly_program_items_time_check
    check (end_time is null or (start_time is not null and end_time > start_time));

create index if not exists weekly_program_items_topic_id_idx
  on public.weekly_program_items (topic_id);

alter table public.topic_assignments
  add column if not exists created_by_role text not null default 'coach',
  add column if not exists hedef_dogruluk smallint;

alter table public.topic_assignments
  alter column coach_id drop not null,
  alter column hedef_soru drop not null;

alter table public.topic_assignments
  drop constraint if exists topic_assignments_created_by_role_check,
  add constraint topic_assignments_created_by_role_check
    check (created_by_role in ('student', 'coach', 'ai')),
  drop constraint if exists topic_assignments_hedef_soru_check,
  add constraint topic_assignments_hedef_soru_check
    check (hedef_soru is null or hedef_soru > 0),
  drop constraint if exists topic_assignments_hedef_dogruluk_check,
  add constraint topic_assignments_hedef_dogruluk_check
    check (hedef_dogruluk is null or hedef_dogruluk between 1 and 100),
  drop constraint if exists topic_assignments_has_target_check,
  add constraint topic_assignments_has_target_check
    check (hedef_soru is not null or hedef_dogruluk is not null),
  -- Koç hedefi bir koça bağlıdır; öğrenci hedefi hiçbir koça bağlanamaz
  -- (aksi halde öğrenci rastgele bir koçun coach_all görünümüne satır sokabilirdi).
  drop constraint if exists topic_assignments_owner_coach_check,
  add constraint topic_assignments_owner_coach_check
    check (
      (created_by_role <> 'coach' or coach_id is not null)
      and (created_by_role <> 'student' or coach_id is null)
    );

create index if not exists topic_assignments_student_topic_idx
  on public.topic_assignments (student_id, topic_id);

-- ── 2) Insert: sahiplik çağıranın rolünden ───────────────────────────────
create or replace function public.set_created_by_role()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  -- Service role (sunucu işi, ör. AI): gelen değer korunur.
  if auth.uid() is null then
    return new;
  end if;
  v_role := public.current_user_role();
  new.created_by_role := case when v_role = 'student' then 'student' else 'coach' end;
  return new;
end;
$$;

drop trigger if exists trg_weekly_program_items_created_by_role on public.weekly_program_items;
create trigger trg_weekly_program_items_created_by_role
  before insert on public.weekly_program_items
  for each row execute function public.set_created_by_role();

drop trigger if exists trg_topic_assignments_created_by_role on public.topic_assignments;
create trigger trg_topic_assignments_created_by_role
  before insert on public.topic_assignments
  for each row execute function public.set_created_by_role();

-- ── 3) Update: yabancı satırda yalnızca tamamlanma ───────────────────────
create or replace function public.guard_owned_row_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
  v_allowed text[];
begin
  if new.created_by_role is distinct from old.created_by_role then
    raise exception 'Kaydın sahiplik bilgisi değiştirilemez.' using errcode = '42501';
  end if;

  if auth.uid() is null then
    return new;
  end if;
  v_role := public.current_user_role();
  if v_role = 'admin' then
    return new;
  end if;

  -- Kendi satırı → serbest (RLS zaten kimin olduğunu sınırlar).
  if (v_role = 'student') = (old.created_by_role = 'student') then
    return new;
  end if;

  if tg_table_name = 'weekly_program_items' then
    v_allowed := array['is_completed', 'completed_at'];
  else
    v_allowed := array['status', 'updated_at'];
    if new.status is distinct from old.status
       and (new.status not in ('aktif', 'tamamlandi') or old.status not in ('aktif', 'tamamlandi')) then
      raise exception 'Bu hedefi yalnızca tamamlandı olarak işaretleyebilirsin.' using errcode = '42501';
    end if;
  end if;

  if (to_jsonb(new) - v_allowed) is distinct from (to_jsonb(old) - v_allowed) then
    if v_role = 'student' then
      raise exception 'Koçunun eklediği kaydı düzenleyemezsin; yalnızca tamamlandı işaretleyebilirsin.'
        using errcode = '42501';
    else
      raise exception 'Öğrencinin eklediği kaydı düzenleyemezsiniz; yalnızca silebilirsiniz.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_weekly_program_items_guard_owner on public.weekly_program_items;
create trigger trg_weekly_program_items_guard_owner
  before update on public.weekly_program_items
  for each row execute function public.guard_owned_row_update();

-- trg_topic_assignments_updated_at (set_updated_at) ile aynı tetikte çalışır;
-- updated_at izinli listede olduğu için sıra önemsiz.
drop trigger if exists trg_topic_assignments_guard_owner on public.topic_assignments;
create trigger trg_topic_assignments_guard_owner
  before update on public.topic_assignments
  for each row execute function public.guard_owned_row_update();

-- ── 4) RLS: weekly_programs / weekly_program_items ───────────────────────
drop policy if exists "weekly_programs_insert" on public.weekly_programs;
create policy "weekly_programs_insert" on public.weekly_programs
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

drop policy if exists "weekly_program_items_insert" on public.weekly_program_items;
create policy "weekly_program_items_insert" on public.weekly_program_items
  for insert with check (
    (public.weekly_program_student(program_id) = auth.uid() and created_by_role = 'student')
    or public.is_coach_of(public.weekly_program_student(program_id))
    or public.current_user_role() = 'admin'
  );

drop policy if exists "weekly_program_items_delete" on public.weekly_program_items;
create policy "weekly_program_items_delete" on public.weekly_program_items
  for delete using (
    (public.weekly_program_student(program_id) = auth.uid() and created_by_role = 'student')
    or public.is_coach_of(public.weekly_program_student(program_id))
    or public.current_user_role() = 'admin'
  );
-- weekly_program_items_update / _select / _org_admin_select aynen kalır
-- (kolon sınırı guard_owned_row_update trigger'ında).

-- ── 5) RLS: topic_assignments ────────────────────────────────────────────
drop policy if exists "topic_assignments_student_insert" on public.topic_assignments;
create policy "topic_assignments_student_insert" on public.topic_assignments
  for insert with check (
    student_id = auth.uid() and created_by_role = 'student' and coach_id is null
  );

drop policy if exists "topic_assignments_student_update" on public.topic_assignments;
create policy "topic_assignments_student_update" on public.topic_assignments
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "topic_assignments_student_delete" on public.topic_assignments;
create policy "topic_assignments_student_delete" on public.topic_assignments
  for delete using (student_id = auth.uid() and created_by_role = 'student');

drop policy if exists "topic_assignments_coach_select_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_select_student_goals" on public.topic_assignments
  for select using (public.is_coach_of(student_id));

drop policy if exists "topic_assignments_coach_delete_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_delete_student_goals" on public.topic_assignments
  for delete using (public.is_coach_of(student_id) and created_by_role = 'student');

-- Koçun tamamlandı işaretlemesi (öğrenci hedefinde) için update: guard trigger
-- yalnızca status'a izin verir.
drop policy if exists "topic_assignments_coach_update_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_update_student_goals" on public.topic_assignments
  for update
  using (public.is_coach_of(student_id) and created_by_role = 'student')
  with check (public.is_coach_of(student_id) and created_by_role = 'student');

-- org_admin: koçun kurumu VEYA öğrencinin kurumu (koçsuz öğrenci hedefleri).
drop policy if exists "topic_assignments_org_admin_select" on public.topic_assignments;
create policy "topic_assignments_org_admin_select" on public.topic_assignments
  for select using (
    exists (
      select 1 from public.profiles p
      where (p.id = topic_assignments.coach_id or p.id = topic_assignments.student_id)
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );
