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

class PoolService {
  public async getPools(offset: number, limit: number): Promise<PoolsPage> {
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

  public async getPool(requestedToken1Address: string, requestedToken2Address: string): Promise<Pool> {
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
}

export default PoolService;
