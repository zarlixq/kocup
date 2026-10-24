-- ─────────────────────────────────────────────────────────────────────────
-- 228 — Maarif müfredat seed fonksiyonu (TYMM 2026)
-- ─────────────────────────────────────────────────────────────────────────
-- Veri supabase/seed/maarif/curriculum-2026.mjs'te; scripts/maarif/build-seed.mjs
-- ders başına seed_maarif_<sinif>_<ders>.sql üretir (her biri bu fonksiyonu
-- çağırır). Hiçbir satır silinmez: eski konu is_active=false olur, referansları
-- (hedef, ustalık, tarama, oturum...) topic_replacements'taki yeni konuya taşınır.
-- Yalnız service role çağırır.
-- ─────────────────────────────────────────────────────────────────────────

-- Eski konunun öğrenci referanslarını yeni konuya taşır. (öğrenci, konu) tekil
-- tablolarda yeni konuda zaten satır varsa eski satır olduğu gibi kalır.
create or replace function public.move_topic_refs(p_old uuid, p_new uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer := 0;
  c integer;
begin
  update topic_assignments set topic_id = p_new where topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update weekly_program_items set topic_id = p_new where topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update study_sessions set topic_id = p_new where topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update wrong_answers set topic_id = p_new where topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update student_resource_videos set topic_id = p_new where topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update student_resource_videos set suggested_topic_id = p_new where suggested_topic_id = p_old;
  get diagnostics c = row_count; n := n + c;
  update student_topics st set topic_id = p_new
   where st.topic_id = p_old
     and not exists (select 1 from student_topics x where x.student_id = st.student_id and x.topic_id = p_new);
  get diagnostics c = row_count; n := n + c;
  update student_topic_self_assessment a set topic_id = p_new
   where a.topic_id = p_old
     and not exists (select 1 from student_topic_self_assessment x where x.student_id = a.student_id and x.topic_id = p_new);
  get diagnostics c = row_count; n := n + c;
  update student_topic_mastery m set topic_id = p_new
   where m.topic_id = p_old
     and not exists (select 1 from student_topic_mastery x where x.student_id = m.student_id and x.topic_id = p_new);
  get diagnostics c = row_count; n := n + c;
  return n;
end $$;

-- p = { version, subjects: [{ name, ders_key, grade, color, order, source,
--        topics: [{ name, keep?, order, week, unit, yks: [{ subject, topic, strength }] }],
--        retire: [{ old, new }] }] }
-- Dönen: ders başına { subject, inserted, renamed, retired, moved, orphans[], missing_yks[] }.
-- orphans: dersin listede olmayan ve eşlemesi verilmemiş aktif konuları (pasife alınır, raporlanır).
create or replace function public.maarif_apply_curriculum(p jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  s jsonb;
  t jsonb;
  y jsonb;
  r jsonb;
  sid uuid;
  old_id uuid;
  new_id uuid;
  yid uuid;
  names text[];
  out jsonb := '[]'::jsonb;
  inserted int;
  renamed int;
  retired int;
  moved int;
  orphans text[];
  missing_yks text[];
  orphan record;
begin
  for s in select * from jsonb_array_elements(p->'subjects') loop
    inserted := 0; renamed := 0; retired := 0; moved := 0; orphans := '{}'; missing_yks := '{}';

    insert into subjects (name, color, "order", exam_type, curriculum, grade, ders_key)
    values (s->>'name', s->>'color', (s->>'order')::int, null, 'maarif', (s->>'grade')::smallint, s->>'ders_key')
    on conflict (name) do update set ders_key = excluded.ders_key, grade = excluded.grade, curriculum = 'maarif';
    select id into sid from subjects where name = s->>'name';

    select coalesce(array_agg(x->>'name'), '{}') into names from jsonb_array_elements(s->'topics') x;

    for t in select * from jsonb_array_elements(s->'topics') loop
      -- Eski satır korunup yeniden adlandırılır (yeni adla satır yoksa).
      if t ? 'keep' and t->>'keep' <> t->>'name'
         and exists (select 1 from topics where subject_id = sid and name = t->>'keep')
         and not exists (select 1 from topics where subject_id = sid and name = t->>'name') then
        update topics set name = t->>'name' where subject_id = sid and name = t->>'keep';
        renamed := renamed + 1;
      end if;
      if not exists (select 1 from topics where subject_id = sid and name = t->>'name') then
        inserted := inserted + 1;
      end if;
      insert into topics (subject_id, name, "order", is_active, grade, school_week, unit, source_url, curriculum_version)
      values (sid, t->>'name', (t->>'order')::int, true, (s->>'grade')::smallint, (t->>'week')::smallint, t->>'unit', s->>'source', p->>'version')
      on conflict (subject_id, name) do update set
        "order" = excluded."order", is_active = true, grade = excluded.grade, school_week = excluded.school_week,
        unit = excluded.unit, source_url = excluded.source_url, curriculum_version = excluded.curriculum_version;
      select id into new_id from topics where subject_id = sid and name = t->>'name';

      for y in select * from jsonb_array_elements(coalesce(t->'yks', '[]'::jsonb)) loop
        select tt.id into yid
          from topics tt join subjects ss on ss.id = tt.subject_id
         where ss.name = y->>'subject' and tt.name = y->>'topic';
        if yid is null then
          missing_yks := missing_yks || ((y->>'subject') || ' / ' || (y->>'topic'));
        else
          insert into topic_yks_map (maarif_topic_id, yks_topic_id, strength)
          values (new_id, yid, (y->>'strength')::numeric)
          on conflict (maarif_topic_id, yks_topic_id) do update set strength = excluded.strength;
        end if;
        yid := null;
      end loop;
    end loop;

    for r in select * from jsonb_array_elements(coalesce(s->'retire', '[]'::jsonb)) loop
      select id into old_id from topics where subject_id = sid and name = r->>'old';
      select id into new_id from topics where subject_id = sid and name = r->>'new';
      if old_id is not null and new_id is not null and old_id <> new_id then
        insert into topic_replacements (old_topic_id, new_topic_id, reason)
        values (old_id, new_id, p->>'version')
        on conflict (old_topic_id) do update set new_topic_id = excluded.new_topic_id;
        moved := moved + public.move_topic_refs(old_id, new_id);
        update topics set is_active = false, curriculum_version = coalesce(curriculum_version, 'eski') where id = old_id and is_active;
        retired := retired + 1;
      end if;
      old_id := null; new_id := null;
    end loop;

    -- Listede olmayan, eşlemesi de verilmemiş aktif konular: pasif + rapor.
    for orphan in
      select id, name from topics
       where subject_id = sid and is_active and not (name = any (names))
    loop
      update topics set is_active = false where id = orphan.id;
      orphans := orphans || orphan.name;
    end loop;

    out := out || jsonb_build_object(
      'subject', s->>'name', 'inserted', inserted, 'renamed', renamed, 'retired', retired,
      'moved', moved, 'orphans', to_jsonb(orphans), 'missing_yks', to_jsonb(missing_yks));
  end loop;
  return out;
end $$;

revoke all on function public.maarif_apply_curriculum(jsonb) from public, anon, authenticated;
revoke all on function public.move_topic_refs(uuid, uuid) from public, anon, authenticated;
