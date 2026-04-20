// Single source of adapter registration. Import this module once at the top
// of any edge function that dispatches via the provider-registry. Importing
// it has the side effect of populating the registry — there is no return value.

import { registerAdapter } from "./provider-registry.ts";
import { clioAdapter } from "../clio/index.ts";
import { mycaseAdapter } from "../mycase/index.ts";
import { smokeballAdapter } from "../smokeball/index.ts";

let registered = false;

export function ensureAdaptersRegistered(): void {
  if (registered) return;
  registerAdapter(clioAdapter);
  registerAdapter(mycaseAdapter);
  registerAdapter(smokeballAdapter);
  registered = true;
}

ensureAdaptersRegistered();
