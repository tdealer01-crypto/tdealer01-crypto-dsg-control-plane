export type YieldProtocol = 'kub-liquid-stake' | 'kub-lend' | 'kubswap';

export interface ProtocolYield {
  protocol: YieldProtocol;
  apyPct: number;       // e.g. 8.5 = 8.5%
  available: boolean;   // false if contract address not set
}

export interface CurrentPosition {
  protocol: YieldProtocol;
  usdValue: number;
  rawAmount: string;    // hex bigint
}

export type OptimizerAction = 'hold' | 'rebalance' | 'blocked' | 'no_position' | 'error' | 'disabled';

export interface OptimizerResult {
  action: OptimizerAction;
  currentProtocol?: YieldProtocol;
  targetProtocol?: YieldProtocol;
  currentApyPct?: number;
  targetApyPct?: number;
  amountUSD?: number;
  txHash?: string;
  reason?: string;
  yields?: ProtocolYield[];
  timestamp: string;
}
