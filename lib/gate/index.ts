export type { GatePlugin, GateInput, GateOutput, Decision } from './types';
export { registerGate, resolveGate, listGates } from './registry';
export { riskGatePlugin } from './plugins/risk-gate';
export { remoteCorePlugin } from './plugins/remote-core';

import { registerGate } from './registry';
import { riskGatePlugin } from './plugins/risk-gate';
import { remoteCorePlugin } from './plugins/remote-core';

registerGate(riskGatePlugin);

const remoteUrl = process.env.DSG_CORE_URL?.replace(/\/$/, '') || '';
if (remoteUrl) {
  registerGate(remoteCorePlugin);
}
