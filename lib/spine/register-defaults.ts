import { registry } from './plugin';
import { arbiterPlugin } from './plugins/arbiter';
import { gateBridgePlugin } from './plugins/gate-bridge';
import { riskGatePlugin } from './plugins/risk-gate';

let registered = false;

export function ensureSpinePluginsRegistered() {
  if (registered) return;
  registry.registerIfAbsent(gateBridgePlugin);
  registry.registerIfAbsent(riskGatePlugin);
  registry.registerIfAbsent(arbiterPlugin);
  registered = true;
}
