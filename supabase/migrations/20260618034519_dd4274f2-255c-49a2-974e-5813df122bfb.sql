
create extension if not exists vector;

alter table public.bb_source_chunks
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz;

create index if not exists bb_source_chunks_embedding_hnsw
  on public.bb_source_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists bb_source_chunks_unembedded
  on public.bb_source_chunks (workspace_id)
  where embedding is null;

alter table public.bb_facts
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz,
  add column if not exists search_text text;

create index if not exists bb_facts_embedding_hnsw
  on public.bb_facts using hnsw (embedding vector_cosine_ops);

create index if not exists bb_facts_unembedded
  on public.bb_facts (workspace_id)
  where embedding is null and verification_state in ('approved','needs_review');

create table if not exists public.bb_search_queries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id uuid,
  user_id uuid,
  query_length integer not null default 0,
  filters jsonb not null default '{}'::jsonb,
  top_entity_types text[] not null default '{}',
  result_count integer not null default 0,
  fact_count integer not null default 0,
  chunk_count integer not null default 0,
  latency_ms integer,
  created_at timestamptz not null default now()
);

grant select, insert on public.bb_search_queries to authenticated;
grant all on public.bb_search_queries to service_role;

alter table public.bb_search_queries enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bb_search_queries' and policyname='bb_search_queries read by workspace members') then
    create policy "bb_search_queries read by workspace members"
      on public.bb_search_queries for select to authenticated
      using (public.is_workspace_member(auth.uid(), workspace_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bb_search_queries' and policyname='bb_search_queries insert by workspace members') then
    create policy "bb_search_queries insert by workspace members"
      on public.bb_search_queries for insert to authenticated
      with check (
        public.is_workspace_member(auth.uid(), workspace_id)
        and user_id = auth.uid()
      );
  end if;
end $$;

create index if not exists bb_search_queries_workspace_created
  on public.bb_search_queries (workspace_id, created_at desc);

create or replace function public.bb_search_facts(
  _workspace_id uuid,
  _client_id uuid,
  _query_embedding vector(1536),
  _entity_types text[],
  _include_needs_review boolean,
  _limit integer
)
returns table (
  id uuid,
  entity_type text,
  display_name text,
  payload jsonb,
  confidence_at_review numeric,
  verification_state text,
  last_reviewed_at timestamptz,
  source_refs jsonb,
  similarity float
)
language sql stable security definer
set search_path = public
as $$
  select
    f.id,
    f.entity_type::text,
    f.display_name,
    f.payload,
    f.confidence_at_review,
    f.verification_state::text,
    f.last_reviewed_at,
    f.source_refs,
    1 - (f.embedding <=> _query_embedding) as similarity
  from public.bb_facts f
  where f.workspace_id = _workspace_id
    and f.embedding is not null
    and (
      case when _include_needs_review
        then f.verification_state in ('approved','needs_review')
        else f.verification_state = 'approved'
      end
    )
    and (_client_id is null or f.client_id = _client_id or f.client_id is null)
    and (_entity_types is null or array_length(_entity_types,1) is null or f.entity_type::text = any(_entity_types))
  order by f.embedding <=> _query_embedding
  limit greatest(coalesce(_limit, 20), 1)
$$;

grant execute on function public.bb_search_facts(uuid, uuid, vector, text[], boolean, integer) to authenticated, service_role;

create or replace function public.bb_search_chunks(
  _workspace_id uuid,
  _client_id uuid,
  _query_embedding vector(1536),
  _source_kinds text[],
  _limit integer
)
returns table (
  id uuid,
  source_id uuid,
  source_title text,
  source_kind text,
  ordinal integer,
  text text,
  similarity float
)
language sql stable security definer
set search_path = public
as $$
  select
    c.id,
    c.source_id,
    s.title as source_title,
    s.kind::text as source_kind,
    c.ordinal,
    c.text,
    1 - (c.embedding <=> _query_embedding) as similarity
  from public.bb_source_chunks c
  join public.bb_sources s on s.id = c.source_id
  where c.workspace_id = _workspace_id
    and c.embedding is not null
    and s.status = 'processed'
    and (_client_id is null or s.client_id = _client_id or s.client_id is null)
    and (_source_kinds is null or array_length(_source_kinds,1) is null or s.kind::text = any(_source_kinds))
  order by c.embedding <=> _query_embedding
  limit greatest(coalesce(_limit, 20), 1)
$$;

grant execute on function public.bb_search_chunks(uuid, uuid, vector, text[], integer) to authenticated, service_role;
