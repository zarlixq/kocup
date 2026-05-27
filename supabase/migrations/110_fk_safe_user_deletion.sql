-- ─────────────────────────────────────────────────────────────────────────
-- 110 — Kullanıcı silmeyi güvenli hale getir (Bug 1)
-- ─────────────────────────────────────────────────────────────────────────
-- Sorun: auth.admin.deleteUser çağrısı, kullanıcıya referans veren çeşitli
-- tabloların FK constraint'leri (default NO ACTION / RESTRICT) yüzünden
-- başarısız oluyor; UI'da "Silinemedi" hatası dönüyor, kullanıcı sebep
-- görmüyor. Bir sonraki davet sırasında auth.users'ta orphan kayıt olduğu
-- için "User already registered" hatasına yol açıyor (Bug 1).
--
-- Çözüm: Tüm "yazar/onaylayan/oluşturan" tipi FK'leri ON DELETE SET NULL'a
-- çevir, ilgili kolonları nullable yap. İçerik kalır (deneme, soru çözüm
-- kaydı, başvuru), sadece "kim oluşturdu/onayladı" bilgisi kaybolur.
-- Cascade silinmesi gereken sahiplik ilişkileri (student_id) ON DELETE
-- CASCADE'de zaten doğru tutuluyor.
-- ─────────────────────────────────────────────────────────────────────────

-- applications.reviewed_by → SET NULL
alter table public.applications
  drop constraint if exists applications_reviewed_by_fkey;
alter table public.applications
  add constraint applications_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

-- applications.approved_student_id → SET NULL
alter table public.applications
  drop constraint if exists applications_approved_student_id_fkey;
alter table public.applications
  add constraint applications_approved_student_id_fkey
  foreign key (approved_student_id) references auth.users(id) on delete set null;

-- exams.created_by → SET NULL (nullable yap)
alter table public.exams alter column created_by drop not null;
alter table public.exams
  drop constraint if exists exams_created_by_fkey;
alter table public.exams
  add constraint exams_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- study_sessions.created_by → SET NULL (nullable yap)
alter table public.study_sessions alter column created_by drop not null;
alter table public.study_sessions
  drop constraint if exists study_sessions_created_by_fkey;
alter table public.study_sessions
  add constraint study_sessions_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- topic_assignments.created_by → SET NULL (nullable yap)
alter table public.topic_assignments alter column created_by drop not null;
alter table public.topic_assignments
  drop constraint if exists topic_assignments_created_by_fkey;
alter table public.topic_assignments
  add constraint topic_assignments_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- appointments.created_by → SET NULL (nullable yap)
alter table public.appointments alter column created_by drop not null;
alter table public.appointments
  drop constraint if exists appointments_created_by_fkey;
alter table public.appointments
  add constraint appointments_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- blog_posts.author_id RESTRICT → SET NULL (yazar silinince yazı korunur, anonim)
alter table public.blog_posts alter column author_id drop not null;
alter table public.blog_posts
  drop constraint if exists blog_posts_author_id_fkey;
alter table public.blog_posts
  add constraint blog_posts_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────
-- Atomik koç silme function'ı
-- ─────────────────────────────────────────────────────────────────────────
-- Tek bir yerden çağırılır. Önce ön-koşul kontrolü, sonra cascade.
-- SECURITY DEFINER ile auth.users üzerinde delete yapabilir.
-- Sadece admin rolündeki user çağırabilir.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_coach_safely(coach_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
  v_student_count int;
begin
  -- Yetki kontrolü
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is null or v_caller_role <> 'admin' then
    raise exception 'Yetkisiz işlem' using errcode = '42501';
  end if;

  -- Hedef gerçekten koç mu?
  select role into v_target_role from public.profiles where id = coach_uuid;
  if v_target_role is null then
    -- Auth.users'ta var ama profil yok (hayalet) → yine de auth'tan sil
    delete from auth.users where id = coach_uuid;
    return;
  end if;

  if v_target_role <> 'coach' then
    raise exception 'Hedef kullanıcı koç değil' using errcode = '22023';
  end if;

  -- Hâlâ atanmış aktif öğrenci varsa engelle
  select count(*) into v_student_count
    from public.students
    where coach_id = coach_uuid;

  if v_student_count > 0 then
    raise exception 'Bu koça % öğrenci atanmış. Önce öğrencileri başka koça atayın.', v_student_count
      using errcode = '23503';
  end if;

  -- Koç'a referans veren students.coach_id'leri null'la (FK guard)
  update public.students set coach_id = null where coach_id = coach_uuid;

  -- auth.users'ı sil → profiles cascade siler.
  -- FK'lerin SET NULL davranışı diğer tabloları korur.
  delete from auth.users where id = coach_uuid;
end;
$$;

revoke all on function public.delete_coach_safely(uuid) from public;
grant execute on function public.delete_coach_safely(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Atomik öğrenci silme function'ı (aynı pattern)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_student_safely(student_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_id uuid := auth.uid();
  v_target_role text;
  v_target_coach uuid;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;

  if v_caller_role is null then
    raise exception 'Yetkisiz işlem' using errcode = '42501';
  end if;

  select role into v_target_role from public.profiles where id = student_uuid;
  if v_target_role is null then
    delete from auth.users where id = student_uuid;
    return;
  end if;

  if v_target_role <> 'student' then
    raise exception 'Hedef kullanıcı öğrenci değil' using errcode = '22023';
  end if;

  -- Yetki: admin her zaman, koç sadece kendi öğrencisini
  if v_caller_role <> 'admin' then
    select coach_id into v_target_coach from public.students where id = student_uuid;
    if v_target_coach is null or v_target_coach <> v_caller_id then
      raise exception 'Yetkisiz: bu öğrenci size atanmamış' using errcode = '42501';
    end if;
  end if;

  delete from auth.users where id = student_uuid;
end;
$$;

revoke all on function public.delete_student_safely(uuid) from public;
grant execute on function public.delete_student_safely(uuid) to authenticated;
