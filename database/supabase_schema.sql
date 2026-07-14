-- SchoolTrust AI - Supabase schema
-- Run in a NEW Supabase project or review carefully before applying to an existing project.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_title text not null,
  category text not null,
  content text not null,
  source_url text,
  version_no integer not null default 1 check (version_no > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  effective_from date,
  expires_at date,
  embedding vector(1536),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_effective_window check (
    expires_at is null or effective_from is null or expires_at >= effective_from
  )
);

create table if not exists public.conversation_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_contact text,
  question text not null,
  detected_language text not null default 'en',
  topic text,
  critical_topic boolean not null default false,
  answer text,
  answer_status text not null check (answer_status in ('verified', 'clarification', 'escalated')),
  confidence numeric(5,4),
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  user_contact text,
  question text not null,
  normalized_topic text,
  reason text not null,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolution_notes text,
  resolved_knowledge_id uuid references public.knowledge_chunks(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.regression_tests (
  id uuid primary key default gen_random_uuid(),
  test_name text not null,
  question text not null,
  expected_facts text[] not null,
  category text not null,
  is_critical boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  regression_test_id uuid not null references public.regression_tests(id) on delete cascade,
  generated_answer text,
  passed boolean not null,
  score numeric(5,4) not null check (score >= 0 and score <= 1),
  missing_facts text[] not null default '{}',
  notes text,
  executed_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_active
  on public.knowledge_chunks (status, category, effective_from, expires_at);
create index if not exists idx_gaps_status_priority
  on public.knowledge_gaps (status, priority, last_seen_at desc);
create index if not exists idx_conversations_created
  on public.conversation_logs (created_at desc);
create index if not exists idx_evaluations_executed
  on public.evaluation_results (executed_at desc);
create index if not exists idx_knowledge_embedding
  on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists knowledge_chunks_set_updated_at on public.knowledge_chunks;
create trigger knowledge_chunks_set_updated_at
before update on public.knowledge_chunks
for each row execute function public.set_updated_at();

create or replace function public.match_school_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.68,
  match_count integer default 6
)
returns table (
  id uuid,
  document_title text,
  category text,
  content text,
  source_url text,
  version_no integer,
  effective_from date,
  expires_at date,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    kc.id,
    kc.document_title,
    kc.category,
    kc.content,
    kc.source_url,
    kc.version_no,
    kc.effective_from,
    kc.expires_at,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where kc.status = 'approved'
    and kc.embedding is not null
    and (kc.effective_from is null or kc.effective_from <= current_date)
    and (kc.expires_at is null or kc.expires_at >= current_date)
    and 1 - (kc.embedding <=> query_embedding) >= match_threshold
  order by kc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$$;

create or replace function public.record_knowledge_gap(
  p_session_id text,
  p_user_contact text,
  p_question text,
  p_topic text,
  p_reason text,
  p_priority text default 'medium'
)
returns public.knowledge_gaps
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_gap public.knowledge_gaps;
  saved_gap public.knowledge_gaps;
begin
  select *
  into existing_gap
  from public.knowledge_gaps
  where status in ('open', 'in_review')
    and coalesce(normalized_topic, '') = coalesce(p_topic, '')
    and lower(regexp_replace(question, '\\s+', ' ', 'g')) =
        lower(regexp_replace(p_question, '\\s+', ' ', 'g'))
  order by last_seen_at desc
  limit 1;

  if existing_gap.id is not null then
    update public.knowledge_gaps
    set occurrence_count = occurrence_count + 1,
        last_seen_at = now(),
        reason = p_reason,
        priority = case
          when priority = 'critical' or p_priority = 'critical' then 'critical'
          when priority = 'high' or p_priority = 'high' then 'high'
          when priority = 'medium' or p_priority = 'medium' then 'medium'
          else 'low'
        end
    where id = existing_gap.id
    returning * into saved_gap;
  else
    insert into public.knowledge_gaps (
      session_id, user_contact, question, normalized_topic, reason, priority
    )
    values (
      p_session_id, p_user_contact, p_question, p_topic, p_reason, p_priority
    )
    returning * into saved_gap;
  end if;

  return saved_gap;
end;
$$;

create or replace function public.schooltrust_admin_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'approvedKnowledge', (select count(*) from knowledge_chunks where status = 'approved'),
      'openGaps', (select count(*) from knowledge_gaps where status in ('open', 'in_review')),
      'verifiedAnswers', (select count(*) from conversation_logs where answer_status = 'verified'),
      'escalations', (select count(*) from conversation_logs where answer_status = 'escalated'),
      'latestTestPassRate', coalesce((
        select round(100.0 * avg(case when passed then 1 else 0 end), 1)
        from evaluation_results
        where executed_at >= now() - interval '7 days'
      ), 0)
    ),
    'gaps', coalesce((
      select jsonb_agg(to_jsonb(g) order by
        case g.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
        g.last_seen_at desc)
      from (
        select id, question, normalized_topic, reason, occurrence_count, priority, status,
               first_seen_at, last_seen_at
        from knowledge_gaps
        where status in ('open', 'in_review')
        limit 30
      ) g
    ), '[]'::jsonb),
    'evaluations', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.executed_at desc)
      from (
        select er.id, rt.test_name, rt.category, er.passed, er.score,
               er.missing_facts, er.notes, er.executed_at
        from evaluation_results er
        join regression_tests rt on rt.id = er.regression_test_id
        order by er.executed_at desc
        limit 20
      ) e
    ), '[]'::jsonb)
  );
$$;

alter table public.knowledge_chunks enable row level security;
alter table public.conversation_logs enable row level security;
alter table public.knowledge_gaps enable row level security;
alter table public.regression_tests enable row level security;
alter table public.evaluation_results enable row level security;
alter table public.admin_actions enable row level security;

-- No anonymous policies are intentionally created. The web interface calls n8n,
-- and n8n uses the Supabase service role on the server side.

grant execute on function public.match_school_knowledge(vector, float, integer) to service_role;
grant execute on function public.record_knowledge_gap(text, text, text, text, text, text) to service_role;
grant execute on function public.schooltrust_admin_dashboard() to service_role;

insert into public.regression_tests (test_name, question, expected_facts, category, is_critical)
select * from (values
  ('Annual fund categories',
   'What is the annual fund for a new admission and a promoted student?',
   array['PKR 2,400 for a new admission', 'PKR 2,150 for a promoted student'],
   'fees', true),
  ('Classes offered',
   'Which classes does Umeed Education System offer?',
   array['Playgroup', 'Class 10', 'Hifz'],
   'admissions', false),
  ('Official contact',
   'What is the official school contact number?',
   array['0300-4117086'],
   'contact', true),
  ('Unknown transport fee safety',
   'What is the current school transport fee?',
   array['not available in approved information', 'contact the school office'],
   'transport', true)
) as v(test_name, question, expected_facts, category, is_critical)
where not exists (
  select 1 from public.regression_tests rt where rt.test_name = v.test_name
);
