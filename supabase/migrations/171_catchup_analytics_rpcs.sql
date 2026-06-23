-- ─────────────────────────────────────────────────────────────────────────
-- CATCH-UP: müdür ziyaretler dashboard'unu besleyen analitik RPC'leri.
-- Tümü CREATE OR REPLACE — idempotent.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.admin_pv_kpis(p_start timestamptz, p_end timestamptz, p_prev_start timestamptz)
returns table(total_views bigint, unique_visitors bigint, prev_total_views bigint, prev_unique_visitors bigint, tool_uses bigint, prev_tool_uses bigint, basvuru_views bigint, prev_basvuru_views bigint)
language sql stable set search_path to 'public'
as $$
  with filtered as (
    select created_at, event_type, session_id, path
    from public.page_views
    where created_at >= p_prev_start and created_at < p_end
      and path not like '/api/%' and path not like '/_next/%' and path not like '/auth/%'
  )
  select
    count(*) filter (where created_at >= p_start and event_type = 'page_view')::bigint,
    count(distinct session_id) filter (where created_at >= p_start and event_type = 'page_view')::bigint,
    count(*) filter (where created_at < p_start and event_type = 'page_view')::bigint,
    count(distinct session_id) filter (where created_at < p_start and event_type = 'page_view')::bigint,
    count(*) filter (where created_at >= p_start and event_type = 'tool_use')::bigint,
    count(*) filter (where created_at < p_start and event_type = 'tool_use')::bigint,
    count(*) filter (where created_at >= p_start and event_type = 'page_view' and path = '/basvuru')::bigint,
    count(*) filter (where created_at < p_start and event_type = 'page_view' and path = '/basvuru')::bigint
  from filtered;
$$;

create or replace function public.admin_pv_daily(p_start timestamptz, p_end timestamptz)
returns table(day date, views bigint, uniques bigint)
language sql stable set search_path to 'public'
as $$
  select
    (date_trunc('day', created_at at time zone 'Europe/Istanbul'))::date as day,
    count(*)::bigint as views,
    count(distinct session_id)::bigint as uniques
  from public.page_views
  where event_type = 'page_view'
    and created_at >= p_start and created_at < p_end
    and path not like '/api/%' and path not like '/_next/%' and path not like '/auth/%'
  group by 1 order by 1 asc;
$$;

create or replace function public.admin_pv_top_pages(p_start timestamptz, p_end timestamptz, p_limit integer)
returns table(path text, views bigint, uniques bigint)
language sql stable set search_path to 'public'
as $$
  select pv.path, count(*)::bigint, count(distinct pv.session_id)::bigint
  from public.page_views pv
  where pv.event_type = 'page_view'
    and pv.created_at >= p_start and pv.created_at < p_end
    and pv.path not like '/api/%' and pv.path not like '/_next/%' and pv.path not like '/auth/%'
  group by pv.path order by 2 desc limit p_limit;
$$;

create or replace function public.admin_pv_top_blog(p_start timestamptz, p_end timestamptz, p_limit integer)
returns table(slug text, title text, views bigint, uniques bigint)
language sql stable set search_path to 'public'
as $$
  with extracted as (
    select substring(path from '^/blog/([^/]+)$') as slug, session_id
    from public.page_views
    where event_type = 'page_view'
      and created_at >= p_start and created_at < p_end
      and path ~ '^/blog/[^/]+$'
  )
  select e.slug, bp.title, count(*)::bigint, count(distinct e.session_id)::bigint
  from extracted e
  left join public.blog_posts bp on bp.slug = e.slug
  where e.slug is not null and e.slug != 'kategori'
  group by e.slug, bp.title order by 3 desc limit p_limit;
$$;

create or replace function public.admin_pv_tool_breakdown(p_start timestamptz, p_end timestamptz)
returns table(tool_slug text, uses bigint, sessions bigint)
language sql stable set search_path to 'public'
as $$
  select tool_slug, count(*)::bigint, count(distinct session_id)::bigint
  from public.page_views
  where event_type = 'tool_use'
    and created_at >= p_start and created_at < p_end and tool_slug is not null
  group by tool_slug order by 2 desc;
$$;

create or replace function public.admin_pv_source_breakdown(p_start timestamptz, p_end timestamptz)
returns table(source text, sessions bigint)
language sql stable set search_path to 'public'
as $$
  with first_views as (
    select distinct on (session_id) session_id, referrer
    from public.page_views
    where event_type = 'page_view' and session_id is not null
      and created_at >= p_start and created_at < p_end
      and path not like '/api/%' and path not like '/_next/%'
    order by session_id, created_at asc
  )
  select
    case
      when referrer is null or referrer = '' then 'Direkt'
      when referrer ~* 'kocupakedemi\.com' then 'Direkt'
      when referrer ~* '(google|bing|duckduckgo|yahoo|yandex|ecosia)' then 'Organik'
      when referrer ~* '(instagram|tiktok|twitter|x\.com|t\.co|facebook|linkedin|reddit|youtube)' then 'Sosyal'
      else 'Diğer'
    end as source,
    count(*)::bigint
  from first_views group by 1 order by 2 desc;
$$;

create or replace function public.admin_pv_funnel(p_start timestamptz, p_end timestamptz)
returns table(total_sessions bigint, tool_or_blog_sessions bigint, converted_sessions bigint)
language sql stable set search_path to 'public'
as $$
  with relevant as (
    select session_id, event_type, path, created_at
    from public.page_views
    where session_id is not null
      and created_at >= p_start and created_at < p_end
      and path not like '/api/%' and path not like '/_next/%'
  ),
  tool_first as (
    select session_id, min(created_at) as first_engaged_at
    from relevant
    where event_type = 'tool_use' or path like '/blog/%' or path like '/araclar%'
    group by session_id
  ),
  converted as (
    select distinct r.session_id
    from relevant r
    join tool_first tf on tf.session_id = r.session_id
    where r.path = '/basvuru' and r.event_type = 'page_view' and r.created_at >= tf.first_engaged_at
  ),
  total as (
    select count(distinct session_id) as v from relevant where event_type = 'page_view'
  )
  select
    coalesce((select v from total), 0)::bigint,
    coalesce((select count(*) from tool_first), 0)::bigint,
    coalesce((select count(*) from converted), 0)::bigint;
$$;

create or replace function public.admin_pv_auth_split(p_start timestamptz, p_end timestamptz)
returns table(is_authenticated boolean, views bigint, sessions bigint)
language sql stable set search_path to 'public'
as $$
  select is_authenticated, count(*)::bigint, count(distinct session_id)::bigint
  from public.page_views
  where event_type = 'page_view'
    and created_at >= p_start and created_at < p_end
    and path not like '/api/%' and path not like '/_next/%'
  group by 1;
$$;
