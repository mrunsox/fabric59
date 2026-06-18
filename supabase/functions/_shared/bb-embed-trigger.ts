/**
 * Best-effort enqueue for the bb-embed function. Fire-and-forget — never
 * throws and never blocks the caller. Used by bb-ingest after processing
 * and by bb-approve-fact after approving/merging a fact.
 */
export function enqueueBbEmbed(
  workspaceId: string,
  target: "facts" | "chunks" | "both" = "both",
): void {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !svc) return;
    fetch(`${url}/functions/v1/bb-embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${svc}`,
        "x-supabase-source": "internal",
      },
      body: JSON.stringify({
        workspaceId,
        mode: "enqueue",
        target,
        limit: 50,
      }),
    }).catch(() => {
      /* swallow */
    });
  } catch {
    /* swallow */
  }
}
