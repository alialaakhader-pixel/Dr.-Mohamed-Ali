-- Sequential lecture progression:
-- A gated lecture unlocks only after every earlier gated lecture has a submitted assignment
-- and an exam result strictly greater than 50 percent.

alter table public.ha_exams add column if not exists lesson_id text;
alter table public.ha_assignments add column if not exists lesson_id text;

create or replace function public.ha_lesson_gate_open(p_code text,p_lesson_id text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare target public.ha_lessons; prior record;
begin
 select * into target from public.ha_lessons where id=p_lesson_id;
 if not found then return false; end if;
 if coalesce(target.data->>'sequenceGate','false') <> 'true' then return true; end if;
 for prior in
  select l.id from public.ha_lessons l
  where l.grade=target.grade and coalesce(l.data->>'sequenceGate','false')='true'
    and (l.created_at,l.id)<(target.created_at,target.id)
  order by l.created_at,l.id
 loop
  if not exists(select 1 from public.ha_assignments a join public.ha_assignment_submissions s
    on s.assignment_id=a.id and s.code=p_code where a.lesson_id=prior.id and a.published) then return false; end if;
  if not exists(select 1 from public.ha_exams e join public.ha_exam_results r
    on r.exam_id=e.id and r.code=p_code where e.lesson_id=prior.id and e.published
    and r.total>0 and r.score*2>r.total) then return false; end if;
 end loop;
 return true;
end $$;

create or replace function public.ha_feed(p_code text,p_device text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.ha_codes;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 return jsonb_build_object(
 'ok',true,'grade',c.grade,
 'lessons',coalesce((select jsonb_agg(case
  when not public.ha_has_access(c.code,'lesson',l.id) then
   (l.data-'videoUrl'-'backupVideoUrl'-'downloadUrl'-'pdfUrl'-'attachments'-'quiz'-'laws'-'keyPoints')
    ||jsonb_build_object('videoUrl','','locked',true,'gateLocked',false,'lockedReason','SUBSCRIPTION')
  when not public.ha_lesson_gate_open(c.code,l.id) then
   (l.data-'videoUrl'-'backupVideoUrl'-'downloadUrl'-'pdfUrl'-'attachments'-'quiz'-'laws'-'keyPoints')
    ||jsonb_build_object('videoUrl','','locked',true,'gateLocked',true,'lockedReason','PREREQUISITES')
  else l.data||jsonb_build_object('locked',false,'gateLocked',false,
   'assignmentId',(select a.id::text from public.ha_assignments a where a.lesson_id=l.id and a.published order by a.created_at desc limit 1),
   'examId',(select e.id from public.ha_exams e where e.lesson_id=l.id and e.published order by e.created_at desc limit 1))
  end order by l.created_at,l.id) from public.ha_lessons l where c.grade='جميع الصفوف' or l.grade=c.grade),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'body',n.body,'lessonId',n.lesson_id,'createdAt',n.created_at) order by n.created_at desc)
  from (select * from public.ha_notifications where grade is null or c.grade='جميع الصفوف' or grade=c.grade order by created_at desc limit 30)n),'[]'::jsonb),
 'exams',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'grade',e.grade,'durationMin',e.duration_min,
  'createdAt',e.created_at,'lessonId',e.lesson_id,
  'locked',(not public.ha_has_access(c.code,'exam',e.id)) or (e.lesson_id is not null and not public.ha_lesson_gate_open(c.code,e.lesson_id)),
  'lockedReason',case when not public.ha_has_access(c.code,'exam',e.id) then 'SUBSCRIPTION'
   when e.lesson_id is not null and not public.ha_lesson_gate_open(c.code,e.lesson_id) then 'PREREQUISITES' else null end,
  'questions',case when public.ha_has_access(c.code,'exam',e.id) and (e.lesson_id is null or public.ha_lesson_gate_open(c.code,e.lesson_id))
   then (select coalesce(jsonb_agg((t.q-'correctIndex'-'explanation') order by t.ord),'[]'::jsonb)
    from jsonb_array_elements(e.questions) with ordinality t(q,ord)) else '[]'::jsonb end)
  order by e.created_at desc) from public.ha_exams e where e.published and (c.grade='جميع الصفوف' or e.grade=c.grade)),'[]'::jsonb),
 'examResults',coalesce((select jsonb_agg(jsonb_build_object('examId',r.exam_id,'score',r.score,'total',r.total,'createdAt',r.created_at,'answers',r.answers,
  'review',(select coalesce(jsonb_agg(jsonb_build_object('correctIndex',t.q->'correctIndex','explanation',coalesce(t.q->>'explanation','')) order by t.ord),'[]'::jsonb)
   from jsonb_array_elements(e2.questions) with ordinality t(q,ord))) order by r.created_at desc)
  from public.ha_exam_results r join public.ha_exams e2 on e2.id=r.exam_id where r.code=c.code),'[]'::jsonb));
end $$;

create or replace function public.ha_exam_submit(p_code text,p_device text,p_exam_id text,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.ha_codes; e public.ha_exams; n int; s int:=0; i int; ans jsonb;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 select * into e from public.ha_exams where id=p_exam_id and published and (c.grade='جميع الصفوف' or grade=c.grade);
 if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
 if e.lesson_id is not null and not public.ha_lesson_gate_open(c.code,e.lesson_id) then return jsonb_build_object('ok',false,'error','LESSON_LOCKED'); end if;
 if not public.ha_has_access(c.code,'exam',e.id) then return jsonb_build_object('ok',false,'error','SUBSCRIPTION_REQUIRED'); end if;
 if exists(select 1 from public.ha_exam_results where exam_id=e.id and code=c.code and total>0 and score*2>total) then
  return jsonb_build_object('ok',false,'error','ALREADY_TAKEN'); end if;
 n:=jsonb_array_length(e.questions);
 if n=0 then return jsonb_build_object('ok',false,'error','EMPTY_EXAM'); end if;
 ans:=case when jsonb_typeof(p_answers)='array' then p_answers else '[]'::jsonb end;
 for i in 0..n-1 loop
  if (ans->>i)~'^[0-9]+$' and (e.questions->i->>'correctIndex')~'^[0-9]+$'
   and (ans->>i)::int=(e.questions->i->>'correctIndex')::int then s:=s+1; end if;
 end loop;
 insert into public.ha_exam_results(exam_id,code,score,total,answers) values(e.id,c.code,s,n,ans)
 on conflict(exam_id,code) do update set score=excluded.score,total=excluded.total,answers=excluded.answers,created_at=now();
 return jsonb_build_object('ok',true,'score',s,'total',n,'answers',ans,
  'review',(select coalesce(jsonb_agg(jsonb_build_object('correctIndex',t.q->'correctIndex','explanation',coalesce(t.q->>'explanation','')) order by t.ord),'[]'::jsonb)
   from jsonb_array_elements(e.questions) with ordinality t(q,ord)));
end $$;

create or replace function public.ha_assignment_feed(p_code text,p_device text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.ha_codes;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',a.id,'title',a.title,'body',a.description,'dueAt',a.due_at,'submittedAt',s.submitted_at,
  'grade',s.grade,'feedback',s.feedback,'answer',s.answer,'lessonId',a.lesson_id) order by a.created_at desc)
  from public.ha_assignments a left join public.ha_assignment_submissions s on s.assignment_id=a.id and s.code=c.code
  where a.published and a.grade in(c.grade,'جميع الصفوف')
   and (a.lesson_id is null or public.ha_lesson_gate_open(c.code,a.lesson_id))),'[]'::jsonb));
end $$;

create or replace function public.ha_assignment_submit(p_code text,p_device text,p_assignment uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.ha_codes; a public.ha_assignments; s public.ha_assignment_submissions;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 select * into a from public.ha_assignments where id=p_assignment and published and (grade='جميع الصفوف' or grade=c.grade);
 if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
 if a.lesson_id is not null and not public.ha_lesson_gate_open(c.code,a.lesson_id) then return jsonb_build_object('ok',false,'error','LESSON_LOCKED'); end if;
 if char_length(trim(coalesce(p_answer,'')))=0 then return jsonb_build_object('ok',false,'error','EMPTY'); end if;
 if char_length(p_answer)>12000 then return jsonb_build_object('ok',false,'error','TOO_LARGE'); end if;
 if a.due_at is not null and a.due_at<now() then return jsonb_build_object('ok',false,'error','DUE_PASSED'); end if;
 select * into s from public.ha_assignment_submissions where assignment_id=a.id and code=c.code for update;
 if found and s.grade is not null then return jsonb_build_object('ok',false,'error','ALREADY_GRADED'); end if;
 insert into public.ha_assignment_submissions(assignment_id,code,answer) values(a.id,c.code,p_answer)
 on conflict(assignment_id,code) do update set answer=excluded.answer,submitted_at=now(),feedback=null;
 return jsonb_build_object('ok',true);
end $$;

drop function if exists public.ha_teacher_assignment_save(uuid,text,text,text,timestamptz,boolean);
create or replace function public.ha_teacher_assignment_save(
 p_id uuid,p_grade text,p_title text,p_body text,p_due timestamptz,p_published boolean,p_lesson_id text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ha_assignments;
begin
 if not public.ha_is_teacher() then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 if length(trim(coalesce(p_title,'')))=0 or length(p_title)>180 then return jsonb_build_object('ok',false,'error','INVALID_TITLE'); end if;
 if p_grade not in('1ث','2ث','3ث','جميع الصفوف','بكالوريا') then return jsonb_build_object('ok',false,'error','INVALID_GRADE'); end if;
 if p_lesson_id is not null and not exists(select 1 from public.ha_lessons where id=p_lesson_id) then return jsonb_build_object('ok',false,'error','INVALID_LESSON'); end if;
 if p_id is null then
  insert into public.ha_assignments(grade,title,description,due_at,published,lesson_id)
   values(p_grade,trim(p_title),coalesce(p_body,''),p_due,coalesce(p_published,false),p_lesson_id) returning * into a;
 else
  update public.ha_assignments set grade=p_grade,title=trim(p_title),description=coalesce(p_body,''),due_at=p_due,
   published=coalesce(p_published,false),lesson_id=p_lesson_id where id=p_id returning * into a;
  if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
 end if;
 return jsonb_build_object('ok',true,'id',a.id);
end $$;

create or replace function public.ha_teacher_assignment_results()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.ha_is_teacher() then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 return jsonb_build_object('ok',true,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',a.id,'grade',a.grade,'title',a.title,'body',a.description,'dueAt',a.due_at,'published',a.published,'lessonId',a.lesson_id,
  'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'studentName',coalesce(st.data->>'name',c.student_name),
   'answer',s.answer,'submittedAt',s.submitted_at,'grade',s.grade,'feedback',s.feedback) order by s.submitted_at desc)
   from public.ha_assignment_submissions s left join public.ha_students st on st.code=s.code
   left join public.ha_codes c on c.code=s.code where s.assignment_id=a.id),'[]'::jsonb))
  order by a.created_at desc) from public.ha_assignments a),'[]'::jsonb));
end $$;

create or replace function public.ha_watch_heartbeat(p_code text,p_device text,p_lesson text,p_delta numeric,p_position numeric,p_duration numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.ha_codes; r public.ha_lecture_progress; elapsed numeric; credit int; dur int; watched int; done boolean; pos int;
 today date:=(now() at time zone 'Africa/Cairo')::date;
begin
 c:=public.ha_resolve(p_code,p_device);
 if c.code is null then return jsonb_build_object('ok',false,'error','UNAUTHORIZED'); end if;
 if not public.ha_lesson_gate_open(c.code,p_lesson) then return jsonb_build_object('ok',false,'error','LESSON_LOCKED'); end if;
 if coalesce(p_lesson,'')='' or length(p_lesson)>80 then return jsonb_build_object('ok',false,'error','INVALID'); end if;
 insert into public.ha_lecture_progress(code,lesson_id,last_heartbeat) values(c.code,p_lesson,now()-interval '20 seconds')
  on conflict(code,lesson_id) do nothing;
 select * into r from public.ha_lecture_progress where code=c.code and lesson_id=p_lesson for update;
 elapsed:=greatest(0,extract(epoch from(now()-r.last_heartbeat)));
 credit:=floor(greatest(0,least(coalesce(p_delta,0),elapsed*2+2,30)))::int;
 dur:=case when coalesce(p_duration,0)>0 then least(p_duration,86400)::int else r.duration_seconds end;
 watched:=r.watched_seconds+credit;
 if dur>0 then watched:=least(watched,dur); end if;
 done:=r.completed or (dur>0 and watched>=dur*0.9);
 pos:=greatest(0,least(coalesce(p_position,0),case when dur>0 then dur else 86400 end))::int;
 update public.ha_lecture_progress set watched_seconds=watched,duration_seconds=dur,last_position=pos,
  completed=done,last_heartbeat=now(),updated_at=now() where code=c.code and lesson_id=p_lesson;
 if credit>0 then insert into public.ha_watch_daily(code,day,seconds) values(c.code,today,credit)
  on conflict(code,day) do update set seconds=public.ha_watch_daily.seconds+excluded.seconds; end if;
 return jsonb_build_object('ok',true,'watchedSeconds',watched,'durationSeconds',dur,'lastPosition',pos,'completed',done,'credited',credit);
end $$;

revoke all on function public.ha_lesson_gate_open(text,text) from public,anon,authenticated;
revoke all on function public.ha_feed(text,text) from public;
grant execute on function public.ha_feed(text,text) to anon,authenticated;
revoke all on function public.ha_exam_submit(text,text,text,jsonb) from public;
grant execute on function public.ha_exam_submit(text,text,text,jsonb) to anon,authenticated;
revoke all on function public.ha_assignment_feed(text,text) from public;
grant execute on function public.ha_assignment_feed(text,text) to anon,authenticated;
revoke all on function public.ha_assignment_submit(text,text,uuid,text) from public;
grant execute on function public.ha_assignment_submit(text,text,uuid,text) to anon,authenticated;
revoke all on function public.ha_teacher_assignment_save(uuid,text,text,text,timestamptz,boolean,text) from public;
grant execute on function public.ha_teacher_assignment_save(uuid,text,text,text,timestamptz,boolean,text) to authenticated;
revoke all on function public.ha_teacher_assignment_results() from public;
grant execute on function public.ha_teacher_assignment_results() to authenticated;
revoke all on function public.ha_watch_heartbeat(text,text,text,numeric,numeric,numeric) from public;
grant execute on function public.ha_watch_heartbeat(text,text,text,numeric,numeric,numeric) to anon,authenticated;
