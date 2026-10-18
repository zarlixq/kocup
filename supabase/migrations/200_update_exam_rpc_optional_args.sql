-- ─────────────────────────────────────────────────────────────────────────
-- 200 — update_exam_with_results: siralama / notes opsiyonel
-- ─────────────────────────────────────────────────────────────────────────
-- 199'da p_siralama / p_notes zorunluydu; supabase gen types bunları
-- `number` / `string` (null'sız) üretir → boş sıralama/not gönderilemez.
-- DEFAULT NULL'lı parametreler sona alınır; çağıran boşsa argümanı hiç
-- göndermez. Gövde 199 ile aynı.
-- ─────────────────────────────────────────────────────────────────────────

drop function if exists public.update_exam_with_results(uuid, text, text, date, integer, text, jsonb);

create or replace function public.update_exam_with_results(
  p_exam_id uuid,
  p_name text,
  p_exam_type text,
  p_date date,
  p_results jsonb,
  p_siralama integer default null,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_results is null
     or jsonb_typeof(p_results) <> 'array'
     or jsonb_array_length(p_results) = 0 then
    raise exception 'En az bir ders sonucu girmelisin.';
  end if;

  update public.exams
     set name = p_name,
         exam_type = p_exam_type,
         date = p_date,
         siralama = p_siralama,
         notes = p_notes,
         updated_at = now()
   where id = p_exam_id;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Deneme bulunamadı.';
  end if;

  delete from public.exam_results where exam_id = p_exam_id;

  insert into public.exam_results (exam_id, subject_id, correct, wrong, empty)
  select p_exam_id,
         (r->>'subject_id')::uuid,
         (r->>'correct')::integer,
         (r->>'wrong')::integer,
         (r->>'empty')::integer
    from jsonb_array_elements(p_results) as r;
end;
$$;

revoke all on function public.update_exam_with_results(uuid, text, text, date, jsonb, integer, text) from public, anon;
grant execute on function public.update_exam_with_results(uuid, text, text, date, jsonb, integer, text) to authenticated;
