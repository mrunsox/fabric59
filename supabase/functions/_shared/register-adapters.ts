// Adapter registration stub.
//
// NOTE: Each provider adapter (clio/, mycase/, smokeball/) is its own deployed
// edge function with its own Deno.serve handler. The Supabase edge bundler
// does not allow cross-function imports, so we cannot import those adapters
// directly into the registry from the consumer side.
//
// Consumers that need real adapter calls invoke the provider edge function
// over HTTP (see `legal-connect-jobs` for the smokeball example). The registry
// remains the canonical place for in-process adapter lookups when adapters
// are colocated under `_shared/` in the future.

export function ensureAdaptersRegistered(): void {
  // Intentional no-op until adapters are migrated under _shared/.
}

ensureAdaptersRegistered();
