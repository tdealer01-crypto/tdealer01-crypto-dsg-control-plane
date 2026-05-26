-- DSG GraphMap Plugin: knowledge graph snapshots
CREATE TABLE IF NOT EXISTS public.dsg_graphmap_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  built_by text NOT NULL,
  built_at timestamptz NOT NULL DEFAULT now(),
  node_count integer NOT NULL DEFAULT 0,
  edge_count integer NOT NULL DEFAULT 0,
  include_patterns jsonb NOT NULL DEFAULT '[]',
  exclude_patterns jsonb NOT NULL DEFAULT '[]',
  graph_data jsonb NOT NULL,
  warnings text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsg_graphmap_graphs_workspace_built_at_idx
  ON public.dsg_graphmap_graphs (workspace_id, built_at DESC);

ALTER TABLE public.dsg_graphmap_graphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read own graphs"
  ON public.dsg_graphmap_graphs FOR SELECT
  USING (workspace_id = auth.uid()::text);

-- Security definer RPC so service-role can insert bypassing RLS
CREATE OR REPLACE FUNCTION public.upsert_graphmap_graph(
  p_workspace_id text,
  p_built_by text,
  p_node_count integer,
  p_edge_count integer,
  p_include_patterns jsonb,
  p_exclude_patterns jsonb,
  p_graph_data jsonb,
  p_warnings text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.dsg_graphmap_graphs (
    workspace_id,
    built_by,
    node_count,
    edge_count,
    include_patterns,
    exclude_patterns,
    graph_data,
    warnings
  ) VALUES (
    p_workspace_id,
    p_built_by,
    p_node_count,
    p_edge_count,
    p_include_patterns,
    p_exclude_patterns,
    p_graph_data,
    COALESCE(p_warnings, '{}')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
