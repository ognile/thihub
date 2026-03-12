-- quiz funnel platform v1
-- hard cutover from prototype quiz tables to a schema-first definition + session/event model

drop table if exists quiz_responses cascade;
drop table if exists quiz_slides cascade;
drop table if exists quizzes cascade;

create table if not exists quiz_definitions (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    description text,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    schema_version text not null,
    definition jsonb not null,
    published_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists quiz_sessions (
    id uuid primary key default gen_random_uuid(),
    quiz_definition_id uuid not null references quiz_definitions(id) on delete cascade,
    session_token text not null,
    entry_source text,
    entry_article_slug text,
    entry_path text,
    referrer text,
    user_agent text,
    ip_address text,
    current_step_id text,
    answers jsonb not null default '[]'::jsonb,
    result_id text,
    lead_captured_at timestamp with time zone,
    offer_clicked_at timestamp with time zone,
    completed_at timestamp with time zone,
    status text not null default 'active' check (status in ('active', 'completed')),
    last_event_at timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    unique (quiz_definition_id, session_token)
);

create table if not exists quiz_events (
    id uuid primary key default gen_random_uuid(),
    quiz_definition_id uuid not null references quiz_definitions(id) on delete cascade,
    session_id uuid not null references quiz_sessions(id) on delete cascade,
    event_type text not null,
    step_id text,
    payload jsonb not null default '{}'::jsonb,
    occurred_at timestamp with time zone not null default now()
);

create table if not exists quiz_leads (
    id uuid primary key default gen_random_uuid(),
    quiz_definition_id uuid not null references quiz_definitions(id) on delete cascade,
    session_id uuid not null unique references quiz_sessions(id) on delete cascade,
    email text,
    first_name text,
    consent boolean not null default false,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index if not exists idx_quiz_definitions_slug on quiz_definitions(slug);
create index if not exists idx_quiz_definitions_status on quiz_definitions(status);
create index if not exists idx_quiz_sessions_definition on quiz_sessions(quiz_definition_id);
create index if not exists idx_quiz_sessions_status on quiz_sessions(status);
create index if not exists idx_quiz_sessions_created_at on quiz_sessions(created_at desc);
create index if not exists idx_quiz_events_definition on quiz_events(quiz_definition_id);
create index if not exists idx_quiz_events_session on quiz_events(session_id);
create index if not exists idx_quiz_events_type on quiz_events(event_type);
create index if not exists idx_quiz_events_step on quiz_events(step_id);
create index if not exists idx_quiz_leads_definition on quiz_leads(quiz_definition_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_quiz_definitions_updated_at on quiz_definitions;
create trigger update_quiz_definitions_updated_at
    before update on quiz_definitions
    for each row
    execute function update_updated_at_column();

drop trigger if exists update_quiz_sessions_updated_at on quiz_sessions;
create trigger update_quiz_sessions_updated_at
    before update on quiz_sessions
    for each row
    execute function update_updated_at_column();

drop trigger if exists update_quiz_leads_updated_at on quiz_leads;
create trigger update_quiz_leads_updated_at
    before update on quiz_leads
    for each row
    execute function update_updated_at_column();

alter table quiz_definitions enable row level security;
alter table quiz_sessions enable row level security;
alter table quiz_events enable row level security;
alter table quiz_leads enable row level security;

drop policy if exists "authenticated full access to quiz_definitions" on quiz_definitions;
create policy "authenticated full access to quiz_definitions" on quiz_definitions
    for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "public can read published quiz_definitions" on quiz_definitions;
create policy "public can read published quiz_definitions" on quiz_definitions
    for select
    to anon, authenticated
    using (status = 'published');

drop policy if exists "authenticated can read quiz_sessions" on quiz_sessions;
create policy "authenticated can read quiz_sessions" on quiz_sessions
    for select
    to authenticated
    using (true);

drop policy if exists "authenticated can read quiz_events" on quiz_events;
create policy "authenticated can read quiz_events" on quiz_events
    for select
    to authenticated
    using (true);

drop policy if exists "authenticated can read quiz_leads" on quiz_leads;
create policy "authenticated can read quiz_leads" on quiz_leads
    for select
    to authenticated
    using (true);
