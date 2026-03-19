import { WorkOS } from "@workos-inc/node";
import { env } from "@/lib/env";

export const workos = env.workosApiKey
  ? new WorkOS(env.workosApiKey, {
      clientId: env.workosClientId || undefined
    })
  : null;
