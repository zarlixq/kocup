-- ─────────────────────────────────────────────────────────────────────────
-- 215 testi — çapraz konulu atom: trigger, RLS, açık haritası, ustalık
-- ─────────────────────────────────────────────────────────────────────────
-- Tamamı tek DO bloğunda, sonunda bilerek hata fırlatılıp GERİ ALINIR:
-- canlıda hiçbir satır kalmaz. Sonuçlar geçici tabloya yazılır.
-- Çalıştırma: Supabase MCP execute_sql (ya da psql) ile dosyanın tamamı.
-- Sentetik öğrenci (auth.users → handle_new_user → profiles) yalnız bu
-- transaction'da var olur; gerçek kullanıcıya dokunulmaz.
-- ─────────────────────────────────────────────────────────────────────────

-- Yıkıcı ifade yok (onay penceresi açar): sonuçlar çalıştırma id'siyle ayrılır.
create temp table if not exists t215 (run uuid, n serial, sonuc text);

do $$
declare
  -- TYT Matematik / AYT Matematik / AYT Fizik katalog sabitleri
  c_tyt_mat   constant uuid := '340b929c-e09a-4abe-a323-73a47f013a31';
  c_bolunebilme constant uuid := '568b596f-e70c-4f6c-be50-599dbad1f1b5';
  c_asal      constant uuid := '8c82d62c-7ec6-557f-92c1-73a687eaeb70';
  c_atom_asal constant uuid := 'da714500-9048-5508-aed7-778ee7aec697';
  c_atom_turev constant uuid := '646d40be-3be0-572e-beab-9499cc5e9943'; -- AYT Matematik / Türev
  c_atom_fizik constant uuid := '6686115b-cf56-593a-adda-0be411833303'; -- AYT Fizik / Vektörler
  v_uid uuid := gen_random_uuid();
  v_sess uuid;
  v_exam uuid;
  v_n integer;
  v_num numeric;
  v_txt text;
  res text[] := '{}';
  v_run uuid := gen_random_uuid();
begin
  begin
    -- ── Hazırlık (postgres) ──
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'atom-test-' || v_uid || '@example.invalid',
            jsonb_build_object('role', 'student', 'full_name', 'Atom Test'), now(), now());
    insert into public.study_sessions (student_id, subject_id, topic_id, date, total_questions, correct, wrong, empty)
    values (v_uid, c_tyt_mat, c_bolunebilme, (now() at time zone 'Europe/Istanbul')::date, 40, 30, 8, 2)
    returning id into v_sess;
    insert into public.exams (student_id, created_by, name, exam_type, date)
    values (v_uid, v_uid, 'Atom testi', 'tyt', (now() at time zone 'Europe/Istanbul')::date)
    returning id into v_exam;
    insert into public.exam_results (exam_id, subject_id, correct, wrong, empty) values (v_exam, c_tyt_mat, 30, 5, 5);

    -- ── Öğrenci olarak (RLS) ──
    perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- 1) Aynı ders grubu, farklı konu (TYT Asal) + TYT↔AYT (Türev) → kabul
    perform public.set_session_wrong_answers(v_sess, jsonb_build_array(
      jsonb_build_object('error_type', 'bilgi_eksik', 'knowledge_atom_id', c_atom_asal, 'count', 2),
      jsonb_build_object('error_type', 'hic_fikrim_yok', 'knowledge_atom_id', c_atom_turev, 'count', 1)
    ));
    select count(*) into v_n from public.wrong_answers where study_session_id = v_sess;
    res := res || format('%s 1 aynı grup farklı konu kabul (3 satır): %s', case when v_n = 3 then 'GEÇTİ' else 'KALDI' end, v_n);

    -- 2) wrong_answers.topic_id sorunun konusu kalır
    select count(*) into v_n from public.wrong_answers where study_session_id = v_sess and topic_id = c_bolunebilme;
    res := res || format('%s 2 topic_id = Bölünebilme: %s/3', case when v_n = 3 then 'GEÇTİ' else 'KALDI' end, v_n);

    -- 3) Farklı ders grubu (AYT Fizik atomu) RPC ile → red
    begin
      perform public.set_session_wrong_answers(v_sess, jsonb_build_array(
        jsonb_build_object('error_type', 'bilgi_eksik', 'knowledge_atom_id', c_atom_fizik, 'count', 1)
      ));
      res := res || 'KALDI 3 farklı grup RPC kabul edildi';
    exception when others then
      res := res || format('%s 3 farklı grup RPC red: %s', case when sqlerrm like '%dersin konularından değil%' then 'GEÇTİ' else 'KALDI' end, sqlerrm);
    end;

    -- 4) Farklı ders grubu doğrudan UPDATE ile → red
    begin
      update public.wrong_answers set knowledge_atom_id = c_atom_fizik
       where study_session_id = v_sess and knowledge_atom_id = c_atom_asal;
      res := res || 'KALDI 4 farklı grup UPDATE kabul edildi';
    exception when others then
      res := res || format('%s 4 farklı grup UPDATE red: %s', case when sqlerrm like '%dersin konularından değil%' then 'GEÇTİ' else 'KALDI' end, sqlerrm);
    end;

    -- 5) Deneme dağıtımı: aynı grup kabul, farklı grup red
    perform public.set_exam_wrong_answers(v_exam, jsonb_build_array(
      jsonb_build_object('topic_id', c_bolunebilme, 'error_type', null, 'knowledge_atom_id', c_atom_asal, 'count', 1)
    ));
    select count(*) into v_n from public.wrong_answers where exam_id = v_exam and knowledge_atom_id = c_atom_asal and topic_id = c_bolunebilme;
    res := res || format('%s 5a deneme aynı grup kabul: %s', case when v_n = 1 then 'GEÇTİ' else 'KALDI' end, v_n);
    begin
      perform public.set_exam_wrong_answers(v_exam, jsonb_build_array(
        jsonb_build_object('topic_id', c_bolunebilme, 'error_type', 'bilgi_eksik', 'knowledge_atom_id', c_atom_fizik, 'count', 1)
      ));
      res := res || 'KALDI 5b deneme farklı grup kabul edildi';
    exception when others then
      res := res || format('%s 5b deneme farklı grup red: %s', case when sqlerrm like '%dersin konularından değil%' then 'GEÇTİ' else 'KALDI' end, sqlerrm);
    end;

    -- 6) Açık haritası: Asal atomu KENDİ konusunda; payda n_konu(0) + x(3) + m(10)
    --    p_s = 8/40 = 0.2, K(Asal) = 6 → (3 + 10·0.2/6) / (0 + 3 + 10) = 0.2564
    select topic_id::text || ' w=' || wrong_count || ' score=' || score into v_txt
      from public.student_gap_map(v_uid) where atom_id = c_atom_asal;
    res := res || format('%s 6 gap_map Asal atomu kendi konusunda: %s',
      case when v_txt = c_asal::text || ' w=3 score=0.2564' then 'GEÇTİ' else 'KALDI' end, v_txt);

    -- 7) Drill-down kaynağı: "Bölme ve Bölünebilme konusundaki sorulardan"
    select string_agg(source_topic_name || ':' || cnt, ',') into v_txt
      from public.student_gap_cross_sources(v_uid) where atom_id = c_atom_asal;
    res := res || format('%s 7 çapraz kaynak: %s', case when v_txt = 'Bölme ve Bölünebilme:3' then 'GEÇTİ' else 'KALDI' end, v_txt);

    -- 8) Ustalık: Bölünebilme kanıtı değişmez. Oturum f = (8−3)+3·1+2 = 10 → 30 doğru;
    --    deneme yanlışı (tipsiz) n=2 f=2 → 100·(5·0.4 + 30) / (5 + 40 + 2) = 68.09
    select mastery into v_num from public.student_topic_mastery where student_id = v_uid and topic_id = c_bolunebilme;
    res := res || format('%s 8 Bölünebilme ustalığı (çapraz etkisiz): %s', case when v_num = 68.09 then 'GEÇTİ' else 'KALDI' end, v_num);

    -- 9) Asal Sayılar: 3 çapraz yanlış × 0.5 ağırlık, tam ceza → 100·(5·0.4)/(5+1.5) = 30.77
    select mastery::text || ' n=' || evidence_n || ' x=' || (breakdown->>'cross_wrongs') into v_txt
      from public.student_topic_mastery where student_id = v_uid and topic_id = c_asal;
    res := res || format('%s 9 Asal Sayılar hafif sinyal: %s', case when v_txt = '30.77 n=3 x=3' then 'GEÇTİ' else 'KALDI' end, v_txt);

    -- 10) Çapraz yanlışlar silinince atomun konusu da yeniden hesaplanır (satır kalkar)
    perform public.set_session_wrong_answers(v_sess, '[]'::jsonb);
    perform public.set_exam_wrong_answers(v_exam, '[]'::jsonb);
    select count(*) into v_n from public.student_topic_mastery where student_id = v_uid and topic_id = c_asal;
    res := res || format('%s 10 silince Asal ustalık satırı kalktı: %s', case when v_n = 0 then 'GEÇTİ' else 'KALDI' end, v_n);

    raise exception '__GERI_AL__';
  exception when others then
    if sqlerrm <> '__GERI_AL__' then
      res := res || ('HATA ' || sqlerrm);
    end if;
  end;

  -- Alt transaction geri alındı (rol de); kalıntı kontrolü:
  select count(*) into v_n from auth.users where id = v_uid;
  res := res || format('%s 11 geri alındı (auth.users kalıntı): %s', case when v_n = 0 then 'GEÇTİ' else 'KALDI' end, v_n);
  insert into t215 (run, sonuc) select v_run, unnest(res);
  perform set_config('t215.run', v_run::text, false);
end;
$$;

select sonuc from t215 where run = current_setting('t215.run')::uuid order by n;
