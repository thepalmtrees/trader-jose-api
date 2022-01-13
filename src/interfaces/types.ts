export type Hat = {
  id?: string;
  external_url?: string;
  name: string;
  description?: string;
  image?: string;
};

export type StakeMetrics = {
  totalStakedUSD: number;
  oneDayFees: number;
  apr24h: number;
  apy24h: number;
  apyAverage: number;
  apr7d: number;
};

// TODO: We need to add name and symbol of each token.
// And if possible their logos
export type Pool = {
  address: string;
  token0: string;
  token0_symbol: string;
  token1: string;
  token1_symbol: string;
  volume24hs: number;
  tvl: number;
  apr: number;
  apy: number;
  fees24hs: number;
};

export type PoolsPage = {
  offset: number;
  limit: number;
  pools: Array<Pool>;
};

// TODO: We need to add more fields to return. A user cannot identify a farm just by id or pair.
// Ideally it would need the LP token name and logo.
export type Farm = {
  id: string;
  pair: string;
  tvl: number | null;
  apy: number | null;
  apr: number | null;
};

export type FarmsPage = {
  offset: number;
  limit: number;
  farms: Array<Farm>;
};

export type PoolsTVL = {
  tvl: number;
};
