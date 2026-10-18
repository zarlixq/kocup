-- ─────────────────────────────────────────────────────────────────────────
-- 204 — 'ai' kayıtları öğrencinin kendi kaydı gibi + koç hedef görünürlüğü
-- ─────────────────────────────────────────────────────────────────────────
-- 1) Açık haritasından tek tıkla eklenen hedef/program blokları
--    created_by_role='ai' ile SERVİS ROLÜ tarafından yazılır (öğrenci
--    istemcisi 'ai' yazamaz; set_created_by_role, 201). Kullanıcı kararı:
--    öneriyi öğrenci kabul ettiği için 'ai' satırları öğrenci-sahipli sayılır
--    → öğrenci düzenler/siler; koç görür + siler, düzenleyemez.
--
-- 2) HATA DÜZELTMESİ (201): topic_assignments_coach_select_student_goals
--    created_by_role filtresi olmadan yazılmıştı → koç, öğrencisinin ÖNCEKİ
--    koçunun atamalarını da görebiliyordu (canlıda 1 satır, iki bağımsız koç).
--    Artık yalnızca öğrenci/ai hedeflerini kapsar; koçun kendi atamaları
--    coach_all (coach_id = auth.uid()) ile görünmeye devam eder.
-- ─────────────────────────────────────────────────────────────────────────

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

  -- 'ai' satırları öğrenci-sahipli (öneriyi öğrenci kabul etti).
  v_student_owned := old.created_by_role in ('student', 'ai');

  -- Kendi satırı → serbest (RLS zaten kimin olduğunu sınırlar).
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

-- ── weekly_program_items ─────────────────────────────────────────────────
drop policy if exists "weekly_program_items_delete" on public.weekly_program_items;
create policy "weekly_program_items_delete" on public.weekly_program_items
  for delete using (
    (public.weekly_program_student(program_id) = auth.uid() and created_by_role in ('student', 'ai'))
    or public.is_coach_of(public.weekly_program_student(program_id))
    or public.current_user_role() = 'admin'
  );

-- ── topic_assignments ────────────────────────────────────────────────────
drop policy if exists "topic_assignments_student_delete" on public.topic_assignments;
create policy "topic_assignments_student_delete" on public.topic_assignments
  for delete using (student_id = auth.uid() and created_by_role in ('student', 'ai'));

drop policy if exists "topic_assignments_coach_select_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_select_student_goals" on public.topic_assignments
  for select using (public.is_coach_of(student_id) and created_by_role in ('student', 'ai'));

drop policy if exists "topic_assignments_coach_delete_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_delete_student_goals" on public.topic_assignments
  for delete using (public.is_coach_of(student_id) and created_by_role in ('student', 'ai'));

drop policy if exists "topic_assignments_coach_update_student_goals" on public.topic_assignments;
create policy "topic_assignments_coach_update_student_goals" on public.topic_assignments
  for update
  using (public.is_coach_of(student_id) and created_by_role in ('student', 'ai'))
  with check (public.is_coach_of(student_id) and created_by_role in ('student', 'ai'));
