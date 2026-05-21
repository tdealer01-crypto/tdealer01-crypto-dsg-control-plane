export const KUB_CHAIN_ID = 96;
export const KUB_RPC_URL = process.env.KUB_CHAIN_RPC_URL ?? 'https://rpc.bitkub.com';
export const REBALANCE_THRESHOLD_PCT = parseFloat(
  process.env.YIELD_OPTIMIZER_REBALANCE_THRESHOLD_PCT ?? '1.0'
);
export const MAX_ALLOCATION_USD = parseInt(
  process.env.YIELD_OPTIMIZER_MAX_ALLOCATION_USD ?? '5000',
  10
);
// KUB/USD price feed — replace with Chainlink oracle address once available
export const KUB_PRICE_USD = parseFloat(process.env.KUB_PRICE_USD ?? '10');

export const CONTRACT_ADDRESSES = {
  kubLiquidStake: process.env.KUB_LIQUID_STAKE_ADDRESS ?? '',
  kubLend: process.env.KUB_LEND_ADDRESS ?? '',
  kubswapRouter: process.env.KUBSWAP_ROUTER_ADDRESS ?? '',
  kkub: process.env.KKUB_ADDRESS ?? '',
  usdt: process.env.KUB_USDT_ADDRESS ?? '',
} as const;
