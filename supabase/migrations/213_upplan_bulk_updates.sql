-- ─────────────────────────────────────────────────────────────────────────
-- 213 — UpPlan toplu güncelleme RPC'leri
-- ─────────────────────────────────────────────────────────────────────────
-- Sıra değiştirme / kuyruk tarihleme / yol haritası yeniden onayı yüzlerce
-- hedefi tek tek güncelliyordu (uçtan uca testte dakikalar sürdü). Tek
-- çağrıda toplu UPDATE. SECURITY INVOKER: RLS ve sahiplik guard'ı aynen geçerli
-- (öğrenci yalnız kendi UpPlan satırlarını, service role hepsini).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.upplan_set_plan_orders(p_student_id uuid, p_ids uuid[], p_orders integer[])
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_n integer;
begin
  if coalesce(array_length(p_ids, 1), 0) <> coalesce(array_length(p_orders, 1), 0) then
    raise exception 'Geçersiz sıra.';
  end if;
  update public.topic_assignments t
     set plan_order = v.ord
    from unnest(p_ids, p_orders) as v(id, ord)
   where t.id = v.id
     and t.student_id = p_student_id
     and t.origin = 'upplan'
     and t.plan_order is distinct from v.ord;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- p_rows: [{id, wave, baslangic_tarihi, son_tarih, status?, plan_order?, block_type?, hedef_soru?, hedef_dogruluk?, notes?}]
-- Verilmeyen (null) alan değişmez.
create or replace function public.upplan_bulk_update_goals(p_student_id uuid, p_rows jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_n integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Geçersiz liste.';
  end if;
  update public.topic_assignments t
     set wave = coalesce(r.wave, t.wave),
         baslangic_tarihi = coalesce(r.baslangic_tarihi, t.baslangic_tarihi),
         son_tarih = coalesce(r.son_tarih, t.son_tarih),
         status = coalesce(r.status::public.assignment_status, t.status),
         plan_order = coalesce(r.plan_order, t.plan_order),
         block_type = coalesce(r.block_type, t.block_type),
         hedef_soru = coalesce(r.hedef_soru, t.hedef_soru),
         hedef_dogruluk = coalesce(r.hedef_dogruluk, t.hedef_dogruluk),
         notes = coalesce(r.notes, t.notes)
    from jsonb_to_recordset(p_rows) as r(
      id uuid, wave integer, baslangic_tarihi date, son_tarih date, status text,
      plan_order integer, block_type text, hedef_soru integer, hedef_dogruluk smallint, notes text
    )
   where t.id = r.id
     and t.student_id = p_student_id
     and t.origin = 'upplan';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.upplan_set_plan_orders(uuid, uuid[], integer[]) from public, anon;
grant execute on function public.upplan_set_plan_orders(uuid, uuid[], integer[]) to authenticated;
revoke execute on function public.upplan_bulk_update_goals(uuid, jsonb) from public, anon;
grant execute on function public.upplan_bulk_update_goals(uuid, jsonb) to authenticated;
