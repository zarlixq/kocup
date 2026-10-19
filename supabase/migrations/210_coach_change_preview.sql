-- ─────────────────────────────────────────────────────────────────────────
-- 210 — Koç değişikliği önizlemesi (onay dialogu için)
-- ─────────────────────────────────────────────────────────────────────────
-- handover_on_coach_change() (migration 206) ile AYNI koşullarla sayar:
-- değişiklik yapılırsa kaç aktif hedef / gelecek program kalemi öğrenciye
-- devredilir, eski koçun kaç gelecek randevusu iptal edilir. Yazmaz.
-- Yetki change_student_coach ile aynı: admin ya da öğrencinin kurum yöneticisi.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.coach_change_preview(p_student_id uuid)
returns table(current_coach_id uuid, goals integer, items integer, appointments integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_student record;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  select s.id, s.coach_id, coalesce(s.organization_id, p.organization_id) as org_id
    into v_student
    from public.students s
    join public.profiles p on p.id = s.id
   where s.id = p_student_id;
  if not found then
    raise exception 'Öğrenci bulunamadı.' using errcode = 'P0001';
  end if;

  if not (v_role = 'admin'
          or (v_role = 'org_admin' and v_student.org_id is not null and public.is_org_admin_of(v_student.org_id))) then
    raise exception 'Yetkisiz işlem.' using errcode = '42501';
  end if;

  if v_student.coach_id is null then
    return query select null::uuid, 0, 0, 0;
    return;
  end if;

  return query
  select v_student.coach_id,
         (select count(*)::int from public.topic_assignments
           where student_id = p_student_id and created_by_role = 'coach'
             and coach_id = v_student.coach_id and status = 'aktif'),
         (select count(*)::int from public.weekly_program_items i
            join public.weekly_programs pr on pr.id = i.program_id
           where pr.student_id = p_student_id and i.created_by_role = 'coach'
             and i.is_completed = false and pr.week_start + (i.day_of_week - 1) >= v_today),
         (select count(*)::int from public.appointments
           where student_id = p_student_id and coach_id = v_student.coach_id
             and status = 'planlandi' and start_time > now());
end;
$$;

revoke execute on function public.coach_change_preview(uuid) from public, anon;
grant execute on function public.coach_change_preview(uuid) to authenticated;
