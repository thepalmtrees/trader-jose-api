// THIS IS A GENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigDecimal: string;
  BigInt: string;
  Bytes: string;
};

export type Bundle = {
  __typename?: 'Bundle';
  avaxPrice: Scalars['BigDecimal'];
  id: Scalars['ID'];
};

export type Burn = {
  __typename?: 'Burn';
  amount0?: Maybe<Scalars['BigDecimal']>;
  amount1?: Maybe<Scalars['BigDecimal']>;
  amountUSD?: Maybe<Scalars['BigDecimal']>;
  complete: Scalars['Boolean'];
  feeLiquidity?: Maybe<Scalars['BigDecimal']>;
  feeTo?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  liquidity: Scalars['BigDecimal'];
  logIndex?: Maybe<Scalars['BigInt']>;
  pair: Pair;
  sender?: Maybe<Scalars['Bytes']>;
  timestamp: Scalars['BigInt'];
  to?: Maybe<Scalars['Bytes']>;
  transaction: Transaction;
};

export type DayData = {
  __typename?: 'DayData';
  date: Scalars['Int'];
  factory: Factory;
  id: Scalars['ID'];
  liquidityAVAX: Scalars['BigDecimal'];
  liquidityUSD: Scalars['BigDecimal'];
  txCount: Scalars['BigInt'];
  untrackedVolume: Scalars['BigDecimal'];
  volumeAVAX: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type Factory = {
  __typename?: 'Factory';
  dayData: Array<DayData>;
  hourData: Array<HourData>;
  id: Scalars['ID'];
  liquidityAVAX: Scalars['BigDecimal'];
  liquidityUSD: Scalars['BigDecimal'];
  pairCount: Scalars['BigInt'];
  pairs: Array<Pair>;
  tokenCount: Scalars['BigInt'];
  tokens: Array<Token>;
  txCount: Scalars['BigInt'];
  untrackedVolumeUSD: Scalars['BigDecimal'];
  userCount: Scalars['BigInt'];
  volumeAVAX: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type HourData = {
  __typename?: 'HourData';
  date: Scalars['Int'];
  factory: Factory;
  id: Scalars['ID'];
  liquidityAVAX: Scalars['BigDecimal'];
  liquidityUSD: Scalars['BigDecimal'];
  txCount: Scalars['BigInt'];
  untrackedVolume: Scalars['BigDecimal'];
  volumeAVAX: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type LiquidityPosition = {
  __typename?: 'LiquidityPosition';
  block: Scalars['Int'];
  id: Scalars['ID'];
  liquidityTokenBalance: Scalars['BigDecimal'];
  pair: Pair;
  snapshots: Array<Maybe<LiquidityPositionSnapshot>>;
  timestamp: Scalars['Int'];
  user: User;
};

export type LiquidityPositionSnapshot = {
  __typename?: 'LiquidityPositionSnapshot';
  block: Scalars['Int'];
  id: Scalars['ID'];
  liquidityPosition: LiquidityPosition;
  liquidityTokenBalance: Scalars['BigDecimal'];
  liquidityTokenTotalSupply: Scalars['BigDecimal'];
  pair: Pair;
  reserve0: Scalars['BigDecimal'];
  reserve1: Scalars['BigDecimal'];
  reserveUSD: Scalars['BigDecimal'];
  timestamp: Scalars['Int'];
  token0PriceUSD: Scalars['BigDecimal'];
  token1PriceUSD: Scalars['BigDecimal'];
  user: User;
};

export type Mint = {
  __typename?: 'Mint';
  amount0?: Maybe<Scalars['BigDecimal']>;
  amount1?: Maybe<Scalars['BigDecimal']>;
  amountUSD?: Maybe<Scalars['BigDecimal']>;
  feeLiquidity?: Maybe<Scalars['BigDecimal']>;
  feeTo?: Maybe<Scalars['Bytes']>;
  id: Scalars['ID'];
  liquidity: Scalars['BigDecimal'];
  logIndex?: Maybe<Scalars['BigInt']>;
  pair: Pair;
  sender?: Maybe<Scalars['Bytes']>;
  timestamp: Scalars['BigInt'];
  to: Scalars['Bytes'];
  transaction: Transaction;
};

export type Pair = {
  __typename?: 'Pair';
  block: Scalars['BigInt'];
  burns: Array<Burn>;
  dayData: Array<PairDayData>;
  factory: Factory;
  hourData: Array<PairHourData>;
  id: Scalars['ID'];
  liquidityPositionSnapshots: Array<LiquidityPositionSnapshot>;
  liquidityPositions: Array<LiquidityPosition>;
  liquidityProviderCount: Scalars['BigInt'];
  mints: Array<Mint>;
  name: Scalars['String'];
  reserve0: Scalars['BigDecimal'];
  reserve1: Scalars['BigDecimal'];
  reserveAVAX: Scalars['BigDecimal'];
  reserveUSD: Scalars['BigDecimal'];
  swaps: Array<Swap>;
  timestamp: Scalars['BigInt'];
  token0: Token;
  token0Price: Scalars['BigDecimal'];
  token1: Token;
  token1Price: Scalars['BigDecimal'];
  totalSupply: Scalars['BigDecimal'];
  trackedReserveAVAX: Scalars['BigDecimal'];
  txCount: Scalars['BigInt'];
  untrackedVolumeUSD: Scalars['BigDecimal'];
  volumeToken0: Scalars['BigDecimal'];
  volumeToken1: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type PairDayData = {
  __typename?: 'PairDayData';
  date: Scalars['Int'];
  id: Scalars['ID'];
  pair: Pair;
  reserve0: Scalars['BigDecimal'];
  reserve1: Scalars['BigDecimal'];
  reserveUSD: Scalars['BigDecimal'];
  token0: Token;
  token1: Token;
  totalSupply: Scalars['BigDecimal'];
  txCount: Scalars['BigInt'];
  untrackedVolumeUSD: Scalars['BigDecimal'];
  volumeToken0: Scalars['BigDecimal'];
  volumeToken1: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type PairHourData = {
  __typename?: 'PairHourData';
  date: Scalars['Int'];
  id: Scalars['ID'];
  pair: Pair;
  reserve0: Scalars['BigDecimal'];
  reserve1: Scalars['BigDecimal'];
  reserveUSD: Scalars['BigDecimal'];
  txCount: Scalars['BigInt'];
  untrackedVolumeUSD: Scalars['BigDecimal'];
  volumeToken0: Scalars['BigDecimal'];
  volumeToken1: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type Query = {
  __typename?: 'Query';
  hello: Scalars['String'];
};

export type Swap = {
  __typename?: 'Swap';
  amount0In: Scalars['BigDecimal'];
  amount0Out: Scalars['BigDecimal'];
  amount1In: Scalars['BigDecimal'];
  amount1Out: Scalars['BigDecimal'];
  amountUSD: Scalars['BigDecimal'];
  id: Scalars['ID'];
  logIndex?: Maybe<Scalars['BigInt']>;
  pair: Pair;
  sender: Scalars['Bytes'];
  timestamp: Scalars['BigInt'];
  to: Scalars['Bytes'];
  transaction: Transaction;
};

export type Token = {
  __typename?: 'Token';
  basePairs: Array<Pair>;
  basePairsDayData: Array<PairDayData>;
  dayData: Array<TokenDayData>;
  decimals: Scalars['BigInt'];
  derivedAVAX: Scalars['BigDecimal'];
  factory: Factory;
  hourData: Array<TokenHourData>;
  id: Scalars['ID'];
  liquidity: Scalars['BigDecimal'];
  name: Scalars['String'];
  quotePairs: Array<Pair>;
  quotePairsDayData: Array<PairDayData>;
  symbol: Scalars['String'];
  totalSupply: Scalars['BigInt'];
  txCount: Scalars['BigInt'];
  untrackedVolumeUSD: Scalars['BigDecimal'];
  volume: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type TokenDayData = {
  __typename?: 'TokenDayData';
  date: Scalars['Int'];
  id: Scalars['ID'];
  liquidity: Scalars['BigDecimal'];
  liquidityAVAX: Scalars['BigDecimal'];
  liquidityUSD: Scalars['BigDecimal'];
  priceUSD: Scalars['BigDecimal'];
  token: Token;
  txCount: Scalars['BigInt'];
  volume: Scalars['BigDecimal'];
  volumeAVAX: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type TokenHourData = {
  __typename?: 'TokenHourData';
  date: Scalars['Int'];
  id: Scalars['ID'];
  liquidity: Scalars['BigDecimal'];
  liquidityAVAX: Scalars['BigDecimal'];
  liquidityUSD: Scalars['BigDecimal'];
  priceUSD: Scalars['BigDecimal'];
  token: Token;
  txCount: Scalars['BigInt'];
  volume: Scalars['BigDecimal'];
  volumeAVAX: Scalars['BigDecimal'];
  volumeUSD: Scalars['BigDecimal'];
};

export type Transaction = {
  __typename?: 'Transaction';
  blockNumber: Scalars['BigInt'];
  burns: Array<Maybe<Burn>>;
  id: Scalars['ID'];
  mints: Array<Maybe<Mint>>;
  swaps: Array<Maybe<Swap>>;
  timestamp: Scalars['BigInt'];
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID'];
  liquidityPositions: Array<LiquidityPosition>;
};

export type _Schema_ = {
  __typename?: '_Schema_';
};
