-- Subject-aware plans for biology, geology and integrated science.
-- Legacy plans retain their lesson_ids/exam_ids behavior because subject_keys defaults to an empty array.
alter table public.ha_plans
  add column if not exists subject_keys text[] not null default '{}';
alter table public.ha_plans
  drop constraint if exists ha_plans_subject_keys_check;
alter table public.ha_plans
  add constraint ha_plans_subject_keys_check
  check (subject_keys <@ array['biology','geology','integrated_science']::text[]);

create or replace function public.ha_has_access(p_code text,p_kind text,p_id text)
returns boolean language sql stable security definer set search_path to ''
as $function$
  with target as (
    select l.grade,coalesce(nullif(l.data->>'subject',''),'biology') subject
    from public.ha_lessons l where p_kind='lesson' and l.id=p_id
    union all
    select e.grade,coalesce(nullif(l.data->>'subject',''),'') subject
    from public.ha_exams e left join public.ha_lessons l on l.id=e.lesson_id
    where p_kind='exam' and e.id=p_id
  ),
  subject_scope as (
    select t.grade,t.subject,exists(
      select 1 from public.ha_plans p
      where cardinality(p.subject_keys)>0 and t.subject<>'' and t.subject=any(p.subject_keys)
        and (p.grade is null or p.grade=t.grade)
    ) configured from target t
  ),
  legacy_scope as (
    select exists(
      select 1 from public.ha_plans p
      where case p_kind when 'lesson' then p_id=any(p.lesson_ids)
                         when 'exam' then p_id=any(p.exam_ids) else false end
        and (cardinality(p.subject_keys)=0
          or not exists(select 1 from target t where t.subject<>'')
          or exists(select 1 from target t where t.subject<>'' and t.subject=any(p.subject_keys)
                    and (p.grade is null or p.grade=t.grade)))
    ) configured
  )
  select case
    when exists(select 1 from subject_scope where configured) then
      exists(
        select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
        join subject_scope t on t.subject=any(p.subject_keys) and (p.grade is null or p.grade=t.grade)
        where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
      )
      or exists(
        select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
        where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
          and case p_kind when 'lesson' then p_id=any(p.lesson_ids)
                          when 'exam' then p_id=any(p.exam_ids) else false end
          and (cardinality(p.subject_keys)=0
            or not exists(select 1 from target t where t.subject<>'')
            or exists(select 1 from target t where t.subject<>'' and t.subject=any(p.subject_keys)
                      and (p.grade is null or p.grade=t.grade)))
      )
    when (select configured from legacy_scope) then
      exists(
        select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
        where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
          and case p_kind when 'lesson' then p_id=any(p.lesson_ids)
                          when 'exam' then p_id=any(p.exam_ids) else false end
          and (cardinality(p.subject_keys)=0
            or not exists(select 1 from target t where t.subject<>'')
            or exists(select 1 from target t where t.subject<>'' and t.subject=any(p.subject_keys)
                      and (p.grade is null or p.grade=t.grade)))
      )
    else true
  end;
$function$;

create or replace function public.ha_teacher_plan_save(
  p_id uuid,p_name text,p_price numeric,p_days integer,p_grade text,
  p_lessons text[],p_exams text[],p_ai boolean,p_active boolean,p_subjects text[]
)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare rid uuid; v_subjects text[]:=coalesce(p_subjects,'{}'); v_grade text:=nullif(trim(coalesce(p_grade,'')),'');
begin
  if not public.ha_is_teacher() then raise exception 'FORBIDDEN'; end if;
  if cardinality(v_subjects)=0 or not (v_subjects <@ array['biology','geology','integrated_science']::text[]) then
    return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS');
  end if;
  if v_grade='3ث' and not (v_subjects <@ array['biology','geology']::text[]) then
    return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS');
  end if;
  if v_grade='بكالوريا' and not (v_subjects <@ array['integrated_science']::text[]) then
    return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS');
  end if;
  if v_grade in ('1ث','2ث') and not (v_subjects <@ array['biology']::text[]) then
    return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS');
  end if;
  if p_id is null then
    insert into public.ha_plans(name,price,duration_days,grade,lesson_ids,exam_ids,includes_ai,active,subject_keys)
    values(trim(p_name),coalesce(p_price,0),p_days,v_grade,coalesce(p_lessons,'{}'),coalesce(p_exams,'{}'),
      coalesce(p_ai,false),coalesce(p_active,true),v_subjects) returning id into rid;
  else
    update public.ha_plans set name=trim(p_name),price=coalesce(p_price,0),duration_days=p_days,grade=v_grade,
      lesson_ids=coalesce(p_lessons,'{}'),exam_ids=coalesce(p_exams,'{}'),includes_ai=coalesce(p_ai,false),
      active=coalesce(p_active,true),subject_keys=v_subjects,updated_at=now()
    where id=p_id returning id into rid;
    if rid is null then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
  end if;
  return jsonb_build_object('ok',true,'id',rid);
end
$function$;

create or replace function public.ha_teacher_subs_overview()
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.ha_is_teacher() then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'plans',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'price',p.price,'durationDays',p.duration_days,'grade',p.grade,
      'lessonIds',p.lesson_ids,'examIds',p.exam_ids,'subjectKeys',p.subject_keys,
      'includesAi',p.includes_ai,'active',p.active,'imageData',p.image_data,
      'subscribers',(select count(*) from public.ha_subscriptions s where s.plan_id=p.id and s.status='active' and s.ends_at>now())
    ) order by p.created_at desc) from public.ha_plans p),'[]'::jsonb),
    'subscriptions',coalesce((select jsonb_agg(row_to_json(x) order by x.ends_at desc) from (
      select s.id,s.code,coalesce(a.name,c.student_name,s.code) student,p.name plan,s.plan_id,s.starts_at,s.ends_at,
        s.source,s.status raw_status,
        case when s.status<>'active' then s.status when s.ends_at<=now() then 'expired'
             when s.ends_at<=now()+interval '7 days' then 'expiring' else 'active' end status,
        greatest(0,ceil(extract(epoch from(s.ends_at-now()))/86400))::int days_left
      from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
      left join public.ha_codes c on c.code=s.code left join public.ha_accounts a on a.code=s.code
      order by s.ends_at desc limit 500
    ) x),'[]'::jsonb),
    'codes',coalesce((select jsonb_agg(row_to_json(y) order by y.created_at desc) from (
      select k.code,k.plan_id,p.name plan,k.active,k.expires_at,k.used_by,k.used_at,k.created_at
      from public.ha_activation_codes k join public.ha_plans p on p.id=k.plan_id order by k.created_at desc limit 300
    ) y),'[]'::jsonb),
    'log',coalesce((select jsonb_agg(row_to_json(z) order by z.at desc) from (
      select l.id,l.code,coalesce(a.name,c.student_name,l.code) student,l.action,l.details,l.actor,l.at
      from public.ha_subscription_log l left join public.ha_codes c on c.code=l.code
      left join public.ha_accounts a on a.code=l.code order by l.at desc limit 200
    ) z),'[]'::jsonb)
  );
end
$function$;

create or replace function public.ha_public_plans()
returns jsonb language sql stable security definer set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'price',p.price,'durationDays',p.duration_days,'grade',p.grade,
    'subjectKeys',p.subject_keys,'includesAi',p.includes_ai,
    'lessonCount',cardinality(p.lesson_ids),'examCount',cardinality(p.exam_ids)
  ) order by p.price,p.created_at),'[]'::jsonb)
  from public.ha_plans p where p.active;
$function$;

create or replace function public.ha_sub_me(p_code text,p_device text)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare c public.ha_codes;
begin
  c:=public.ha_resolve(p_code,p_device);
  if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
  return jsonb_build_object('ok',true,
    'subscriptions',coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'planId',p.id,'planName',p.name,'startsAt',s.starts_at,'endsAt',s.ends_at,
      'status',case when s.status<>'active' then s.status when s.ends_at<=now() then 'expired' else 'active' end,
      'daysLeft',greatest(0,ceil(extract(epoch from(s.ends_at-now()))/86400))::int,
      'includesAi',p.includes_ai,'lessonCount',cardinality(p.lesson_ids),'examCount',cardinality(p.exam_ids),
      'subjectKeys',p.subject_keys,'source',s.source
    ) order by s.ends_at desc) from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
      where s.code=c.code),'[]'::jsonb),
    'plans',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'price',p.price,'durationDays',p.duration_days,'grade',p.grade,
      'subjectKeys',p.subject_keys,'includesAi',p.includes_ai,
      'lessonCount',cardinality(p.lesson_ids),'examCount',cardinality(p.exam_ids),'imageData',p.image_data
    ) order by p.price) from public.ha_plans p
      where p.active and (p.grade is null or p.grade=c.grade or c.grade='جميع الصفوف')),'[]'::jsonb)
  );
end
$function$;

create or replace function public.ha_assignment_feed(p_code text,p_device text)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare c public.ha_codes;
begin
  c:=public.ha_resolve(p_code,p_device);
  if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
  return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',a.id,'title',a.title,'body',a.description,'dueAt',a.due_at,'submittedAt',s.submitted_at,
    'grade',s.grade,'feedback',s.feedback,'answer',s.answer,'lessonId',a.lesson_id
  ) order by a.created_at desc) from public.ha_assignments a
    left join public.ha_assignment_submissions s on s.assignment_id=a.id and s.code=c.code
    where a.published and a.grade in(c.grade,'جميع الصفوف')
      and (a.lesson_id is null or (public.ha_has_access(c.code,'lesson',a.lesson_id)
        and public.ha_lesson_gate_open(c.code,a.lesson_id)))),'[]'::jsonb));
end
$function$;

create or replace function public.ha_assignment_submit(p_code text,p_device text,p_assignment uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.ha_codes; a public.ha_assignments; s public.ha_assignment_submissions;
begin
  c:=public.ha_resolve(p_code,p_device);
  if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
  select * into a from public.ha_assignments
    where id=p_assignment and published and (grade='جميع الصفوف' or grade=c.grade);
  if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
  if a.lesson_id is not null and not public.ha_has_access(c.code,'lesson',a.lesson_id) then
    return jsonb_build_object('ok',false,'error','SUBSCRIPTION_REQUIRED');
  end if;
  if a.lesson_id is not null and not public.ha_lesson_gate_open(c.code,a.lesson_id) then
    return jsonb_build_object('ok',false,'error','LESSON_LOCKED');
  end if;
  if char_length(trim(coalesce(p_answer,'')))=0 then return jsonb_build_object('ok',false,'error','EMPTY'); end if;
  if char_length(p_answer)>12000 then return jsonb_build_object('ok',false,'error','TOO_LARGE'); end if;
  if a.due_at is not null and a.due_at<now() then return jsonb_build_object('ok',false,'error','DUE_PASSED'); end if;
  select * into s from public.ha_assignment_submissions where assignment_id=a.id and code=c.code for update;
  if found and s.grade is not null then return jsonb_build_object('ok',false,'error','ALREADY_GRADED'); end if;
  insert into public.ha_assignment_submissions(assignment_id,code,answer) values(a.id,c.code,p_answer)
    on conflict(assignment_id,code) do update set answer=excluded.answer,submitted_at=now(),feedback=null;
  return jsonb_build_object('ok',true);
end
$function$;
