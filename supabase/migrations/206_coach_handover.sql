-- ─────────────────────────────────────────────────────────────────────────
-- 206 — Koç değişiminde devir + geçmiş + eski koç erişiminin kesilmesi
-- ─────────────────────────────────────────────────────────────────────────
-- students.coach_id hangi yoldan değişirse değişsin (müdür, kurum yöneticisi,
-- import, service role) AYNI transaction'da:
--   * eski koçun AKTİF konu hedefleri ve gelecek tarihli, tamamlanmamış program
--     kalemleri öğrenciye devredilir (created_by_role='student'); kaynak
--     origin_role / origin_coach_id'de korunur,
--   * eski koçun gelecekteki planlanmış randevuları iptal edilir
--     (geçmiş randevular koçun kendi kaydı olarak kalır),
--   * coach_assignment_history'ye satır yazılır.
-- Geçmiş / tamamlanmış kayıtlara dokunulmaz.
--
-- Erişim: is_coach_of() students.coach_id'ye baktığı için çoğu tablo anında
-- kesilir. topic_assignments_coach_all yalnız coach_id = auth.uid() idi →
-- eski koç eski öğrencisinin hedeflerini görmeye/düzenlemeye devam ediyordu.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Kaynak kolonları ──────────────────────────────────────────────────
alter table public.topic_assignments
  add column if not exists origin_role text,
  add column if not exists origin_coach_id uuid references public.profiles(id) on delete set null;

alter table public.weekly_program_items
  add column if not exists origin_role text,
  add column if not exists origin_coach_id uuid references public.profiles(id) on delete set null;

alter table public.topic_assignments
  drop constraint if exists topic_assignments_origin_role_check,
  add constraint topic_assignments_origin_role_check
    check (origin_role is null or origin_role in ('student', 'coach', 'ai'));

alter table public.weekly_program_items
  drop constraint if exists weekly_program_items_origin_role_check,
  add constraint weekly_program_items_origin_role_check
    check (origin_role is null or origin_role in ('student', 'coach', 'ai'));

-- ── 2) Geçmiş tablosu ────────────────────────────────────────────────────
create table if not exists public.coach_assignment_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  old_coach_id uuid references public.profiles(id) on delete set null,
  new_coach_id uuid references public.profiles(id) on delete set null, -- null = koçsuz
  performed_by uuid references public.profiles(id) on delete set null,
  goals_transferred integer not null default 0,
  items_transferred integer not null default 0,
  appointments_cancelled integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists coach_assignment_history_student_idx
  on public.coach_assignment_history (student_id, created_at desc);

alter table public.coach_assignment_history enable row level security;

drop policy if exists coach_assignment_history_select on public.coach_assignment_history;
create policy coach_assignment_history_select on public.coach_assignment_history
  for select using (
    student_id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = coach_assignment_history.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );
-- Yazma politikası yok: yalnız SECURITY DEFINER trigger yazar.

-- ── 3) Sahiplik guard'ı: devir sırasında created_by_role değişebilir ──────
create or replace function public.guard_owned_row_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
  v_allowed text[];
  v_student_owned boolean;
begin
  -- Koç devri (handover_on_coach_change) transaction-local bayrak koyar.
  if coalesce(current_setting('kocup.handover', true), '') = 'on' then
    return new;
  end if;

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

  v_student_owned := old.created_by_role in ('student', 'ai');

  if (v_role = 'student') = v_student_owned then
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

-- ── 4) Devir trigger'ı ───────────────────────────────────────────────────
create or replace function public.handover_on_coach_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_goals integer := 0;
  v_items integer := 0;
  v_appts integer := 0;
  v_actor uuid;
begin
  if new.coach_id is not distinct from old.coach_id then
    return new;
  end if;

  if old.coach_id is not null then
    perform set_config('kocup.handover', 'on', true);

    -- Aktif koç hedefleri → öğrenci (CHECK: öğrenci hedefinde coach_id null).
    update public.topic_assignments
       set created_by_role = 'student',
           coach_id = null,
           origin_role = 'coach',
           origin_coach_id = old.coach_id
     where student_id = new.id
       and created_by_role = 'coach'
       and coach_id = old.coach_id
       and status = 'aktif';
    get diagnostics v_goals = row_count;

    -- Gelecek tarihli (bugün dahil), tamamlanmamış koç kalemleri → öğrenci.
    update public.weekly_program_items i
       set created_by_role = 'student',
           origin_role = 'coach',
           origin_coach_id = old.coach_id
      from public.weekly_programs p
     where p.id = i.program_id
       and p.student_id = new.id
       and i.created_by_role = 'coach'
       and i.is_completed = false
       and p.week_start + (i.day_of_week - 1) >= v_today;
    get diagnostics v_items = row_count;

    perform set_config('kocup.handover', 'off', true);

    -- Eski koçun gelecekteki planlanmış randevuları.
    update public.appointments
       set status = 'iptal'
     where student_id = new.id
       and coach_id = old.coach_id
       and status = 'planlandi'
       and start_time > now();
    get diagnostics v_appts = row_count;
  end if;

  v_actor := coalesce(auth.uid(), nullif(current_setting('kocup.actor', true), '')::uuid);

  insert into public.coach_assignment_history
    (student_id, old_coach_id, new_coach_id, performed_by, goals_transferred, items_transferred, appointments_cancelled)
  values
    (new.id, old.coach_id, new.coach_id, v_actor, v_goals, v_items, v_appts);

  return new;
end;
$$;

revoke execute on function public.handover_on_coach_change() from public, anon, authenticated;

drop trigger if exists trg_students_coach_handover on public.students;
create trigger trg_students_coach_handover
  after update of coach_id on public.students
  for each row execute function public.handover_on_coach_change();

-- ── 5) Koç değiştirme RPC'si ─────────────────────────────────────────────
-- Yetki: platform admin; ya da öğrencinin kurumunun yöneticisi (yeni koç da
-- aynı kurumda olmalı). Devri trigger yapar.
create or replace function public.change_student_coach(p_student_id uuid, p_new_coach_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_student record;
  v_coach record;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  select s.id, s.coach_id, coalesce(s.organization_id, p.organization_id) as org_id
    into v_student
    from public.students s
    join public.profiles p on p.id = s.id
   where s.id = p_student_id
   for update of s;
  if not found then
    raise exception 'Öğrenci bulunamadı.' using errcode = 'P0001';
  end if;

  if p_new_coach_id is not null then
    select id, role, organization_id into v_coach from public.profiles where id = p_new_coach_id;
    if not found or v_coach.role <> 'coach' then
      raise exception 'Koç bulunamadı.' using errcode = 'P0001';
    end if;
  end if;

  if v_role = 'admin' then
    null;
  elsif v_role = 'org_admin' and v_student.org_id is not null and public.is_org_admin_of(v_student.org_id) then
    if p_new_coach_id is not null and v_coach.organization_id is distinct from v_student.org_id then
      raise exception 'Bu koç kurumunuza ait değil.' using errcode = '42501';
    end if;
  else
    raise exception 'Yetkisiz işlem.' using errcode = '42501';
  end if;

  if v_student.coach_id is not distinct from p_new_coach_id then
    return;
  end if;

  update public.students set coach_id = p_new_coach_id where id = p_student_id;
end;
$$;

revoke execute on function public.change_student_coach(uuid, uuid) from public, anon;
grant execute on function public.change_student_coach(uuid, uuid) to authenticated;

-- ── 6) RLS: eski koç hedeflere erişemesin; yeni koç geçmişi okusun ───────
drop policy if exists topic_assignments_coach_all on public.topic_assignments;
create policy topic_assignments_coach_all on public.topic_assignments
  for all
  using (coach_id = auth.uid() and public.is_coach_of(student_id))
  with check (coach_id = auth.uid() and public.is_coach_of(student_id));

drop policy if exists topic_assignments_coach_select_history on public.topic_assignments;
create policy topic_assignments_coach_select_history on public.topic_assignments
  for select using (public.is_coach_of(student_id));
