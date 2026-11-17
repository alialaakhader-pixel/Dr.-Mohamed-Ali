
create or replace function public.ha_has_access(p_code text, p_kind text, p_id text)
returns boolean language sql stable security definer set search_path to ''
as $function$
  with target as (
    select l.grade, coalesce(nullif(l.data->>'subject',''),'biology') as subject
    from public.ha_lessons l where p_kind='lesson' and l.id=p_id
    union all
    select e.grade, coalesce(nullif(l.data->>'subject',''),'') as subject
    from public.ha_exams e left join public.ha_lessons l on l.id=e.lesson_id
    where p_kind='exam' and e.id=p_id
  ),
  subject_policy as (
    select exists (
      select 1 from public.ha_plans p join target t on (p.grade is null or p.grade=t.grade)
      where cardinality(coalesce(p.subject_keys,'{}'::text[]))>0
    ) configured
  ),
  legacy_policy as (
    select exists (
      select 1 from public.ha_plans p join target t on (p.grade is null or p.grade=t.grade)
      where cardinality(coalesce(p.subject_keys,'{}'::text[]))=0
        and case p_kind
          when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
          when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[]))
          else false end
    ) configured
  )
  select case
    when not exists(select 1 from target) then false
    when (select configured from subject_policy) then
      exists (
        select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
        cross join target t
        where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
          and (p.grade is null or p.grade=t.grade)
          and (
            (t.subject<>'' and t.subject=any(coalesce(p.subject_keys,'{}'::text[])))
            or (cardinality(coalesce(p.subject_keys,'{}'::text[]))=0 and case p_kind
              when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
              when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[]))
              else false end)
          )
      )
    when (select configured from legacy_policy) then
      exists (
        select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
        cross join target t
        where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
          and (p.grade is null or p.grade=t.grade)
          and case p_kind
            when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
            when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[]))
            else false end
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
 if cardinality(v_subjects)=0 or not(v_subjects <@ array['biology','geology','integrated_science']::text[]) then
  return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS');
 end if;
 if v_grade='3ث' and not(v_subjects <@ array['biology','geology']::text[]) then return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS'); end if;
 if v_grade='بكالوريا' and not(v_subjects <@ array['integrated_science']::text[]) then return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS'); end if;
 if v_grade in ('1ث','2ث') and not(v_subjects <@ array['biology']::text[]) then return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS'); end if;
 if v_grade is null and not(v_subjects <@ array['biology']::text[]) then return jsonb_build_object('ok',false,'error','INVALID_SUBJECTS'); end if;
 if p_id is null then
  insert into public.ha_plans(name,price,duration_days,grade,lesson_ids,exam_ids,includes_ai,active,subject_keys)
  values(trim(p_name),coalesce(p_price,0),p_days,v_grade,coalesce(p_lessons,'{}'),coalesce(p_exams,'{}'),coalesce(p_ai,false),coalesce(p_active,true),v_subjects)
  returning id into rid;
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

create or replace function public.ha_teacher_plan_save(
 p_id uuid,p_name text,p_price numeric,p_days integer,p_grade text,
 p_lessons text[],p_exams text[],p_ai boolean,p_active boolean
)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_subjects text[]; v_grade text:=nullif(trim(coalesce(p_grade,'')),'');
begin
 select array_agg(distinct coalesce(nullif(l.data->>'subject',''),'biology')) into v_subjects
 from public.ha_lessons l where l.id=any(coalesce(p_lessons,'{}'::text[]));
 if coalesce(cardinality(v_subjects),0)=0 then
  v_subjects:=case when v_grade='3ث' then array['biology']::text[]
   when v_grade='بكالوريا' then array['integrated_science']::text[] else array['biology']::text[] end;
 end if;
 return public.ha_teacher_plan_save(p_id,p_name,p_price,p_days,p_grade,p_lessons,p_exams,p_ai,p_active,v_subjects);
end
$function$;

create or replace function public.ha_sub_redeem(p_code text,p_device text,p_activation text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.ha_codes; a public.ha_activation_codes; pl public.ha_plans; cur public.ha_subscriptions;
 sid uuid; st timestamptz; en timestamptz; k text:=upper(trim(coalesce(p_activation,'')));
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 if length(k)<4 or length(k)>40 then return jsonb_build_object('ok',false,'error','INVALID_CODE'); end if;
 perform pg_advisory_xact_lock(hashtext('subredeem:'||c.code));
 select * into a from public.ha_activation_codes where code=k for update;
 if not found or not a.active or a.used_at is not null or (a.expires_at is not null and a.expires_at<=now()) then
  insert into public.ha_subscription_log(code,action,details,actor) values(c.code,'redeem_failed',jsonb_build_object('attempt',left(k,40)),c.code);
  return jsonb_build_object('ok',false,'error','INVALID_CODE');
 end if;
 select * into pl from public.ha_plans where id=a.plan_id;
 if not found or not pl.active then return jsonb_build_object('ok',false,'error','PLAN_UNAVAILABLE'); end if;
 if pl.grade is not null and c.grade<>'جميع الصفوف' and pl.grade<>c.grade then return jsonb_build_object('ok',false,'error','WRONG_GRADE'); end if;
 if cardinality(coalesce(pl.subject_keys,'{}'::text[]))>0 and c.grade<>'جميع الصفوف' then
  if c.grade='بكالوريا' and not('integrated_science'=any(pl.subject_keys)) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT');
  elsif c.grade='3ث' and not(pl.subject_keys && array['biology','geology']::text[]) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT');
  elsif c.grade in ('1ث','2ث') and not('biology'=any(pl.subject_keys)) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT'); end if;
 end if;
 select * into cur from public.ha_subscriptions where code=c.code and plan_id=pl.id and status='active' and ends_at>now() order by ends_at desc limit 1 for update;
 if found then st:=cur.starts_at; en:=cur.ends_at+make_interval(days=>pl.duration_days);
  update public.ha_subscriptions set ends_at=en,updated_at=now() where id=cur.id; sid:=cur.id;
 else st:=now(); en:=now()+make_interval(days=>pl.duration_days);
  insert into public.ha_subscriptions(code,plan_id,starts_at,ends_at,source) values(c.code,pl.id,st,en,'activation_code') returning id into sid;
 end if;
 update public.ha_activation_codes set used_by=c.code,used_at=now() where code=k;
 insert into public.ha_subscription_log(code,subscription_id,action,details,actor)
 values(c.code,sid,case when cur.id is not null then 'renewed' else 'activated' end,jsonb_build_object('plan',pl.name,'endsAt',en,'via','activation_code'),c.code);
 return jsonb_build_object('ok',true,'planName',pl.name,'endsAt',en,'renewed',cur.id is not null);
end
$function$;

create or replace function public.ha_teacher_sub_grant(p_student text,p_plan uuid,p_days integer)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare pl public.ha_plans; stu text:=upper(trim(coalesce(p_student,''))); c public.ha_codes;
 d int; sid uuid; en timestamptz; cur public.ha_subscriptions;
begin
 if not public.ha_is_teacher() then raise exception 'FORBIDDEN'; end if;
 select * into c from public.ha_codes where code=stu;
 if not found then return jsonb_build_object('ok',false,'error','STUDENT_NOT_FOUND'); end if;
 select * into pl from public.ha_plans where id=p_plan;
 if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
 if pl.grade is not null and c.grade<>'جميع الصفوف' and pl.grade<>c.grade then return jsonb_build_object('ok',false,'error','WRONG_GRADE'); end if;
 if cardinality(coalesce(pl.subject_keys,'{}'::text[]))>0 and c.grade<>'جميع الصفوف' then
  if c.grade='بكالوريا' and not('integrated_science'=any(pl.subject_keys)) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT');
  elsif c.grade='3ث' and not(pl.subject_keys && array['biology','geology']::text[]) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT');
  elsif c.grade in ('1ث','2ث') and not('biology'=any(pl.subject_keys)) then return jsonb_build_object('ok',false,'error','WRONG_SUBJECT'); end if;
 end if;
 d:=coalesce(p_days,pl.duration_days);
 if d<1 or d>1100 then return jsonb_build_object('ok',false,'error','INVALID'); end if;
 select * into cur from public.ha_subscriptions where code=stu and plan_id=pl.id and status='active' and ends_at>now() order by ends_at desc limit 1 for update;
 if found then en:=cur.ends_at+make_interval(days=>d);
  update public.ha_subscriptions set ends_at=en,updated_at=now() where id=cur.id; sid:=cur.id;
 else en:=now()+make_interval(days=>d);
  insert into public.ha_subscriptions(code,plan_id,starts_at,ends_at,source) values(stu,pl.id,now(),en,'teacher') returning id into sid;
 end if;
 insert into public.ha_subscription_log(code,subscription_id,action,details,actor)
 values(stu,sid,case when cur.id is not null then 'renewed' else 'granted' end,jsonb_build_object('plan',pl.name,'days',d,'endsAt',en),'teacher');
 return jsonb_build_object('ok',true,'id',sid,'endsAt',en);
end
$function$;
