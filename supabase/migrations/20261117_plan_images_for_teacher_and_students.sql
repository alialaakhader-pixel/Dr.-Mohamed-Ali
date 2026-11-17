-- Teacher-uploaded images for subscription plans.
alter table public.ha_plans
  add column if not exists image_data text
  check (image_data is null or length(image_data) <= 300000);

create or replace function public.ha_teacher_plan_image_save(p_id uuid, p_image text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.ha_is_teacher() then raise exception 'FORBIDDEN'; end if;
  if p_image is not null and (length(p_image) > 300000 or p_image !~ '^data:image/(jpeg|png|webp);base64,') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_IMAGE');
  end if;
  update public.ha_plans set image_data = p_image, updated_at = now() where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ha_teacher_plan_image_save(uuid,text) from public, anon;
grant execute on function public.ha_teacher_plan_image_save(uuid,text) to authenticated;

create or replace function public.ha_sub_me(p_code text, p_device text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.ha_codes;
begin
  c := public.ha_resolve(p_code, p_device);
  if c.code is null then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); end if;
  return jsonb_build_object('ok', true,
    'subscriptions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'planId', p.id, 'planName', p.name, 'startsAt', s.starts_at, 'endsAt', s.ends_at,
        'status', case when s.status <> 'active' then s.status when s.ends_at <= now() then 'expired' else 'active' end,
        'daysLeft', greatest(0, ceil(extract(epoch from (s.ends_at - now())) / 86400))::int,
        'includesAi', p.includes_ai, 'lessonCount', cardinality(p.lesson_ids), 'examCount', cardinality(p.exam_ids),
        'source', s.source) order by s.ends_at desc)
      from public.ha_subscriptions s join public.ha_plans p on p.id = s.plan_id where s.code = c.code), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'price', p.price, 'durationDays', p.duration_days,
        'includesAi', p.includes_ai, 'lessonCount', cardinality(p.lesson_ids), 'examCount', cardinality(p.exam_ids),
        'imageData', p.image_data) order by p.price)
      from public.ha_plans p where p.active and (p.grade is null or p.grade = c.grade or c.grade = 'جميع الصفوف')), '[]'::jsonb));
end $$;
revoke all on function public.ha_sub_me(text,text) from public;
grant execute on function public.ha_sub_me(text,text) to anon, authenticated;

create or replace function public.ha_teacher_subs_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ha_is_teacher() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'plans', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'durationDays', p.duration_days,
        'grade', p.grade, 'lessonIds', p.lesson_ids, 'examIds', p.exam_ids, 'includesAi', p.includes_ai, 'active', p.active,
        'imageData', p.image_data,
        'subscribers', (select count(*) from public.ha_subscriptions s where s.plan_id = p.id and s.status = 'active' and s.ends_at > now())) order by p.created_at desc)
      from public.ha_plans p), '[]'::jsonb),
    'subscriptions', coalesce((select jsonb_agg(row_to_json(x) order by x.ends_at desc) from (
        select s.id, s.code, coalesce(a.name, c.student_name, s.code) as student, p.name as plan, s.plan_id, s.starts_at, s.ends_at, s.source, s.status as raw_status,
          case when s.status <> 'active' then s.status when s.ends_at <= now() then 'expired'
               when s.ends_at <= now() + interval '7 days' then 'expiring' else 'active' end as status,
          greatest(0, ceil(extract(epoch from (s.ends_at - now())) / 86400))::int as days_left
        from public.ha_subscriptions s join public.ha_plans p on p.id = s.plan_id
        left join public.ha_codes c on c.code = s.code left join public.ha_accounts a on a.code = s.code
        order by s.ends_at desc limit 500) x), '[]'::jsonb),
    'codes', coalesce((select jsonb_agg(row_to_json(y) order by y.created_at desc) from (
        select k.code, k.plan_id, p.name as plan, k.active, k.expires_at, k.used_by, k.used_at, k.created_at
        from public.ha_activation_codes k join public.ha_plans p on p.id = k.plan_id order by k.created_at desc limit 300) y), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(row_to_json(z) order by z.at desc) from (
        select l.id, l.code, coalesce(a.name, c.student_name, l.code) as student, l.action, l.details, l.actor, l.at
        from public.ha_subscription_log l left join public.ha_codes c on c.code = l.code left join public.ha_accounts a on a.code = l.code
        order by l.at desc limit 200) z), '[]'::jsonb));
end $$;
revoke all on function public.ha_teacher_subs_overview() from public, anon;
grant execute on function public.ha_teacher_subs_overview() to authenticated;
