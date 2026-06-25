
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS guides_client_idx ON public.guides(client_id);

ALTER TABLE public.bb_sources
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS bb_sources_campaign_idx ON public.bb_sources(workspace_id, campaign_id);

CREATE OR REPLACE FUNCTION public.bb_search_chunks_v2(
  _workspace_id uuid,
  _client_id uuid,
  _campaign_id uuid,
  _query_embedding vector,
  _source_kinds text[],
  _limit integer
)
RETURNS TABLE(id uuid, source_id uuid, source_title text, source_kind text, ordinal integer, text text, similarity double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    and (_campaign_id is null or s.campaign_id = _campaign_id or s.campaign_id is null)
    and (_source_kinds is null or array_length(_source_kinds,1) is null or s.kind::text = any(_source_kinds))
  order by c.embedding <=> _query_embedding
  limit greatest(coalesce(_limit, 20), 1)
$function$;
