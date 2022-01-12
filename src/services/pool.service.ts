import { GRAPH_EXCHANGE_URI } from '@/configs';
import { Pair, PairHourData } from '@/graphql/generated/exchange';
import { poolsQuery, poolQuery } from '@/graphql/queries/exchange';
import { startOfHour, subDays } from 'date-fns';
import { GraphQLClient } from 'graphql-request';
import Moralis from 'moralis/node';
import Utils from './utils';

/**
 * For now, a Pool is just an object.
 * We will need to expose more granular types once
 * we know what we want to return.
 * Same for farms.
 */
type Pool = object;

type PoolsPage = {
  offset: number;
  limit: number;
  pools: Array<Pool>;
};

type GraphPoolsResponse = { pairs: Array<Pair> };

class PoolService {
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });

  public async getPoolsFromCovalent(offset: number, limit: number): Promise<PoolsPage> {
    // 1. Query MongoDB pools with offset & limit
    const Pool = Moralis.Object.extend('Pool');
    const query = new Moralis.Query(Pool);
    query.limit(limit);
    query.skip(offset);
    // these two pools have a weird TVL and number that don't make sense at all. We don't know why, but it may be an issue in Covalent side.
    query.notContainedIn('exchange', ['0x4e2d00526ae280d5aa296c321a8d32cd2486a737', '0x19c6c7176218c96947636a1a48f138f3788fec5f']);
    query.descending('total_liquidity_quote'); // order by TVL desc
    const pools = await query.find();
    const poolsResponse = pools.map(pool => {
      const volume24h = pool.get('volume_24h_quote');
      const tvl = pool.get('total_liquidity_quote');
      return this.createPool(
        pool.get('exchange'),
        pool.get('token_0').contract_address,
        pool.get('token_0').contract_name,
        pool.get('token_1').contract_address,
        pool.get('token_1').contract_name,
        volume24h,
        tvl,
      );
    });

    return {
      offset,
      limit,
      pools: poolsResponse,
    };
  }

  public async getPoolFromCovalent(requestedToken1Address: string, requestedToken2Address: string): Promise<Pool> {
    const token1Address = Utils.resolveTokenAddress(requestedToken1Address).toLowerCase();
    const token2Address = Utils.resolveTokenAddress(requestedToken2Address).toLowerCase();

    const Pool = Moralis.Object.extend('Pool');
    const query = new Moralis.Query(Pool);
    const pipeline = [
      {
        match: {
          $or: [
            {
              $and: [{ 'token_0.contract_address': token1Address }, { 'token_1.contract_address': token2Address }],
            },
            {
              $and: [{ 'token_0.contract_address': token2Address }, { 'token_1.contract_address': token1Address }],
            },
          ],
        },
      },
    ];

    const pool = (await query.aggregate(pipeline))[0];

    const volume24h = pool.volume_24h_quote;
    const tvl = pool.total_liquidity_quote;
    return this.createPool(
      pool.exchange,
      pool.token_0.contract_address,
      pool.token_0.contract_name,
      pool.token_1.contract_address,
      pool.token_1.contract_name,
      volume24h,
      tvl,
    );
  }

  private createPool(
    exchange: string,
    token0: string,
    token0Symbol: string,
    token1: string,
    token1Symbol: string,
    volume24h: number,
    tvl: number,
  ): Pool {
    const fees24hs = Utils.calculatePoolFees24h(volume24h);
    const apr = Utils.calculatePoolAPR(fees24hs, tvl);
    return {
      address: exchange,
      token0: token0,
      token0_symbol: token0Symbol,
      token1: token1,
      token1_symbol: token1Symbol,
      volume24hs: volume24h,
      tvl: tvl,
      apr: apr,
      apy: Utils.calculatePoolAPY(apr),
      fees24hs: fees24hs,
    };
  }

  public async getPoolsFromTheGraph(offset: number, limit: number): Promise<PoolsPage> {
    const pairsData = await this.exchangeClient.request<GraphPoolsResponse>(poolsQuery, {
      skip: offset,
      first: limit,
    });

    return {
      offset,
      limit,
      pools: pairsData.pairs.map(x => this.enrichPool(x)).sort((a, b) => b.tvl - a.tvl),
    };
  }

  public async getPoolFromTheGraph(requestedToken1Address: string, requestedToken2Address: string): Promise<Pool> {
    const yesterdayInSeconds = startOfHour(subDays(Date.now(), 1)).getTime() / 1000;

    const token1Address = Utils.resolveTokenAddress(requestedToken1Address).toLowerCase();
    const token2Address = Utils.resolveTokenAddress(requestedToken2Address).toLowerCase();

    const pairData = await this.exchangeClient.request<GraphPoolsResponse>(poolQuery, {
      tokens: [token1Address, token2Address],
      dateAfter: yesterdayInSeconds,
    });

    if (!pairData.pairs || pairData.pairs.length === 0) {
      // return a 404 error.
      throw new Error('Pool not found');
    }

    if (pairData.pairs.length > 1) {
      throw new Error('Several pools were found');
    }

    const pool = pairData.pairs[0];

    return this.enrichPool(pool);
  }

  private enrichPool(pool: Pair) {
    const { hourData, reserveUSD } = pool;

    const tvl = parseFloat(reserveUSD);

    const volume24hs = this.getVolume24hs(hourData);
    const fees24hs = Utils.calculatePoolFees24h(volume24hs);

    const apr = Utils.calculatePoolAPR(fees24hs, tvl);
    const apy = Utils.calculatePoolAPY(apr);

    return {
      ...pool,
      volume24hs,
      tvl,
      apr,
      apy,
      fees24hs,
    };
  }

  private getVolume24hs(last24hours: PairHourData[]): number {
    return last24hours.reduce((accum, hour) => {
      if (parseFloat(hour.volumeUSD) === 0) {
        return accum + parseFloat(hour.untrackedVolumeUSD);
      }
      return accum + parseFloat(hour.volumeUSD);
    }, 0);
  }
}

export default PoolService;
