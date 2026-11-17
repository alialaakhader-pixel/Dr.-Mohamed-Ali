
create or replace function public.ha_has_access(p_code text, p_kind text, p_id text)
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
  effective_target as (
    select case when t.grade='جميع الصفوف' then coalesce(c.grade,t.grade) else t.grade end grade,t.subject
    from target t left join public.ha_codes c on c.code=p_code
  ),
  policy as (
    select exists(
      select 1 from public.ha_plans p join effective_target t on (p.grade is null or p.grade=t.grade or t.grade='جميع الصفوف')
      where cardinality(coalesce(p.subject_keys,'{}'::text[]))>0
    ) subject_mode
  ),
  legacy_plan as (
    select exists(
      select 1 from public.ha_plans p join effective_target t on (p.grade is null or p.grade=t.grade or t.grade='جميع الصفوف')
      where cardinality(coalesce(p.subject_keys,'{}'::text[]))=0
      and case p_kind when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
       when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[])) else false end
    ) configured
  )
  select case
   when not exists(select 1 from effective_target) then false
   when (select subject_mode from policy) then exists(
    select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
    cross join effective_target t
    where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
     and (p.grade is null or p.grade=t.grade or t.grade='جميع الصفوف')
     and ((t.subject<>'' and t.subject=any(coalesce(p.subject_keys,'{}'::text[])))
      or (cardinality(coalesce(p.subject_keys,'{}'::text[]))=0 and case p_kind
       when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
       when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[])) else false end))
   )
   when (select configured from legacy_plan) then exists(
    select 1 from public.ha_subscriptions s join public.ha_plans p on p.id=s.plan_id
    cross join effective_target t
    where s.code=p_code and s.status='active' and s.starts_at<=now() and s.ends_at>now()
     and (p.grade is null or p.grade=t.grade or t.grade='جميع الصفوف')
     and case p_kind when 'lesson' then p_id=any(coalesce(p.lesson_ids,'{}'::text[]))
      when 'exam' then p_id=any(coalesce(p.exam_ids,'{}'::text[])) else false end
   )
   else true
  end;
$function$;

create or replace function public.ha_assignment_feed(p_code text,p_device text)
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare c public.ha_codes;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 return jsonb_build_object('ok',true,'items',coalesce((
  select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'body',a.description,'dueAt',a.due_at,
   'submittedAt',s.submitted_at,'grade',s.grade,'feedback',s.feedback,'answer',s.answer,'lessonId',a.lesson_id)
   order by a.created_at desc)
  from public.ha_assignments a
  left join public.ha_assignment_submissions s on s.assignment_id=a.id and s.code=c.code
  where a.published and a.grade in (c.grade,'جميع الصفوف')
   and ((a.lesson_id is not null and public.ha_has_access(c.code,'lesson',a.lesson_id)
      and public.ha_lesson_gate_open(c.code,a.lesson_id))
    or (a.lesson_id is null and not exists(
      select 1 from public.ha_plans p where cardinality(coalesce(p.subject_keys,'{}'::text[]))>0
       and (p.grade is null or p.grade=c.grade or c.grade='جميع الصفوف' or a.grade='جميع الصفوف')
    )))
 ),'[]'::jsonb));
end
$function$;

create or replace function public.ha_assignment_submit(p_code text,p_device text,p_assignment uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.ha_codes; a public.ha_assignments; s public.ha_assignment_submissions;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 select * into a from public.ha_assignments where id=p_assignment and published and (grade='جميع الصفوف' or grade=c.grade);
 if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
 if a.lesson_id is null and exists(
  select 1 from public.ha_plans p where cardinality(coalesce(p.subject_keys,'{}'::text[]))>0
   and (p.grade is null or p.grade=c.grade or c.grade='جميع الصفوف' or a.grade='جميع الصفوف')
 ) then return jsonb_build_object('ok',false,'error','LESSON_REQUIRED'); end if;
 if a.lesson_id is not null and not public.ha_has_access(c.code,'lesson',a.lesson_id) then return jsonb_build_object('ok',false,'error','SUBSCRIPTION_REQUIRED'); end if;
 if a.lesson_id is not null and not public.ha_lesson_gate_open(c.code,a.lesson_id) then return jsonb_build_object('ok',false,'error','LESSON_LOCKED'); end if;
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
