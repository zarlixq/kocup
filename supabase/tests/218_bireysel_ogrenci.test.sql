-- 218 bireysel öğrenci — RLS testleri (rollback'li; hiçbir şey kalıcı yazılmaz).
-- Çalıştırma: Supabase SQL (execute_sql). Başarıda 'RLS_OK ...' istisnasıyla biter →
-- tüm DO bloğu geri alınır. Başka bir hata mesajı = test başarısız.
do $$
declare
  v_org_a uuid;   -- org_admin'in kurumu
  v_org_b uuid;   -- başka kurum
  v_org_admin uuid;
  v_coach_a uuid; -- org A koçu
  v_coach_x uuid; -- org A dışında bir koç
  v_student uuid;
  v_other_student uuid;
  v_n int;
  v_failed boolean;
  v_log text := '';
begin
  select id, organization_id into v_org_admin, v_org_a from public.profiles where role = 'org_admin' and organization_id is not null limit 1;
  select id into v_org_b from public.organizations where id <> v_org_a limit 1;
  select id into v_coach_a from public.profiles where role = 'coach' and organization_id = v_org_a limit 1;
  select id into v_coach_x from public.profiles where role = 'coach' and organization_id is distinct from v_org_a limit 1;
  select id into v_student from public.profiles where role = 'student' limit 1;
  select id into v_other_student from public.profiles where role = 'student' and id <> v_student limit 1;
  if v_org_admin is null or v_org_b is null or v_coach_x is null or v_student is null or v_other_student is null then
    raise exception 'Test önkoşulları eksik';
  end if;

  -- Hazırlık (postgres rolü, RLS dışı): org B daveti, başka öğrencinin feedback'i
  insert into public.student_invitations (email, full_name, segment, grade, organization_id, token_hash)
  values ('rls-b@test.invalid', 'RLS B', 'yks', '11', v_org_b, 'rls-hash-b');
  insert into public.student_invitations (email, full_name, segment, grade, token_hash)
  values ('rls-bireysel@test.invalid', 'RLS Bireysel', 'yks', '12', 'rls-hash-ind');
  insert into public.feedback (user_id, message) values (v_other_student, 'rls test başka öğrenci');
  insert into public.student_acquisition (student_id, source) values (v_other_student, 'ucretsiz_kayit')
    on conflict (student_id) do nothing;

  -- ── org_admin ────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', v_org_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.student_invitations where organization_id = v_org_b or organization_id is null;
  if v_n <> 0 then raise exception 'FAIL org_admin başka kurumun/bireysel daveti görüyor (%)', v_n; end if;
  v_log := v_log || 'org_admin baska kurum davetini goremiyor; ';

  v_failed := false;
  begin
    insert into public.student_invitations (email, full_name, segment, grade, organization_id, token_hash)
    values ('rls-x1@test.invalid', 'RLS X', 'yks', '11', v_org_b, 'rls-x1');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL org_admin başka kuruma davet oluşturabildi'; end if;

  v_failed := false;
  begin
    insert into public.student_invitations (email, full_name, segment, grade, organization_id, token_hash)
    values ('rls-x2@test.invalid', 'RLS X', 'yks', '11', null, 'rls-x2');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL org_admin kurumsuz (bireysel) davet oluşturabildi'; end if;

  v_failed := false;
  begin
    insert into public.student_invitations (email, full_name, segment, grade, organization_id, coach_id, token_hash)
    values ('rls-x3@test.invalid', 'RLS X', 'yks', '11', v_org_a, v_coach_x, 'rls-x3');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL org_admin başka kurumun koçuyla davet oluşturabildi'; end if;
  v_log := v_log || 'org_admin baska kuruma/kurumsuz/yabanci koc daveti olusturamiyor; ';

  insert into public.student_invitations (email, full_name, segment, grade, organization_id, coach_id, token_hash)
  values ('rls-ok@test.invalid', 'RLS OK', 'yks', '11', v_org_a, v_coach_a, 'rls-ok');
  v_log := v_log || 'org_admin kendi kurumuna davet olusturabiliyor; ';

  -- org B davetini güncelleyemez (0 satır)
  update public.student_invitations set status = 'iptal' where token_hash = 'rls-hash-b';
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'FAIL org_admin başka kurumun davetini güncelledi'; end if;

  -- Bireysel öğrenci verisi: RPC reddeder, acquisition görünmez
  v_failed := false;
  begin
    perform * from public.individual_students_overview();
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL org_admin individual_students_overview çağırabildi'; end if;
  select count(*) into v_n from public.student_acquisition;
  if v_n <> 0 then raise exception 'FAIL org_admin student_acquisition görüyor (%)', v_n; end if;
  select count(*) into v_n from public.feedback;
  if v_n <> 0 then raise exception 'FAIL org_admin feedback görüyor (%)', v_n; end if;
  v_log := v_log || 'org_admin bireysel ogrenci verisine erisemiyor; ';

  -- ── öğrenci ──────────────────────────────────────────────────────────
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.student_invitations;
  if v_n <> 0 then raise exception 'FAIL öğrenci davetleri görüyor (%)', v_n; end if;
  select count(*) into v_n from public.feedback where user_id <> v_student;
  if v_n <> 0 then raise exception 'FAIL öğrenci başkasının feedback satırını görüyor'; end if;
  select count(*) into v_n from public.student_acquisition where student_id <> v_student;
  if v_n <> 0 then raise exception 'FAIL öğrenci başkasının acquisition satırını görüyor'; end if;
  select count(*) into v_n from public.user_consents where user_id <> v_student;
  if v_n <> 0 then raise exception 'FAIL öğrenci başkasının onaylarını görüyor'; end if;
  select count(*) into v_n from public.auth_role_grants;
  if v_n <> 0 then raise exception 'FAIL öğrenci rol hibelerini görüyor'; end if;

  v_failed := false;
  begin
    insert into public.feedback (user_id, message) values (v_other_student, 'sahte');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL öğrenci başkası adına feedback yazabildi'; end if;

  v_failed := false;
  begin
    insert into public.student_invitations (email, full_name, segment, grade, token_hash)
    values ('rls-s@test.invalid', 'RLS S', 'yks', '11', 'rls-s');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL öğrenci davet oluşturabildi'; end if;

  v_failed := false;
  begin
    insert into public.auth_role_grants (email, role) values ('x@test.invalid', 'admin');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL öğrenci rol hibesi yazabildi'; end if;

  insert into public.feedback (user_id, message) values (v_student, 'kendi geri bildirimim');
  v_log := v_log || 'ogrenci davet/feedback/acquisition/onay/hibe tablolarinda baskasini goremiyor, kendi feedbackini yazabiliyor; ';

  v_failed := false;
  begin
    perform * from public.individual_students_overview();
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL öğrenci individual_students_overview çağırabildi'; end if;

  v_failed := false;
  begin
    perform public.check_rate_limit('x', 'y', 1, 60);
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL authenticated check_rate_limit çağırabildi'; end if;
  v_log := v_log || 'ogrenci RPC kisitlari tamam; ';

  -- ── müdür ────────────────────────────────────────────────────────────
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_n from public.student_invitations where token_hash in ('rls-hash-b', 'rls-hash-ind', 'rls-ok');
  if v_n <> 3 then raise exception 'FAIL müdür tüm davetleri göremiyor (%)', v_n; end if;
  perform * from public.individual_students_overview();
  v_log := v_log || 'mudur tum davetleri ve bireysel ozeti goruyor';

  execute 'reset role';
  raise exception 'RLS_OK %', v_log;
end $$;
