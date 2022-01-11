import {
  JOE_TOKEN_ADDRESS,
  GRAPH_BAR_URI,
  GRAPH_BLOCKS_URI,
  GRAPH_EXCHANGE_URI,
  BURN_ADDRESS,
  TEAM_TREASURY_WALLETS,
  BN_1E18,
  SUPPLY_BORROW_ADDRESS,
  WAVAX_ADDRESS,
  XJOE_ADDRESS,
  GRAPH_MASTERCHEFV2_URI,
  GRAPH_MASTERCHEFV3_URI,
  MASTERCHEFV2_ADDRESS,
  MASTERCHEFV3_ADDRESS,
} from '../configs/index';
import { logger } from '@utils/logger';

import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import createError from 'http-errors';
import TotalSupplyAndBorrowABI from '../abis/TotalSupplyAndBorrowABI.json';
import JoeBarContractABI from '../abis/JoeBarContractABI.json';
import JoeContractABI from '../abis/JoeTokenContractABI.json';
import { startOfHour, subDays } from 'date-fns';

import { dayDatasQuery, poolsQuery, poolQuery, poolByPairQuery } from '../graphql/queries/exchange';
import { farmQuery, farmsQuery, masterchefMetricsQuery } from '../graphql/queries/masterchef';

import { MasterChef, Pool as GraphQLFarmV2 } from '@/graphql/generated/masterchefv2';
import { Pool as GraphQLFarmV3 } from '@/graphql/generated/masterchefv3';
import { DayData, Pair, PairHourData } from '@/graphql/generated/exchange';
import Utils from './utils';

type TokenPriceRequestParams = {
  chain: 'avalanche';
  address: string;
  exchange: string;
};

type RunContractParams = {
  chain: 'avalanche';
  address: string;
  function_name: string;
  abi: any;
  params?: any;
};

type Hat = {
  id?: string;
  external_url?: string;
  name: string;
  description?: string;
  image?: string;
};

/**
 * For now, a Pool is just an object.
 * We will need to expose more granular types once
 * we know what we want to return.
 */
type Pool = object;

type Farm = {
  id: string;
  pair: string;
  allocPoint: string;
  lastRewardTimestamp: string;
  accJoePerShare: string;
  jlpBalance: string;
  balance: string;
  userCount: string;
  owner: {
    id: string;
    joePerSec: string;
    totalAllocPoint: string;
  };
  timestamp: string;
  tvl: number | null;
  apy: number | null;
  apr: number | null;
};

type GraphFarmsV2Response = { pools: Array<GraphQLFarmV2> };
type GraphFarmsV3Response = { pools: Array<GraphQLFarmV3> };
type GraphMasterChefV2Response = { masterChef: MasterChef };

type GraphDayResponse = { dayDatas: Array<DayData> };
type GraphPoolsResponse = { pairs: Array<Pair> };

type FarmsPage = {
  offset: number;
  limit: number;
  farms: Array<Farm>;
};

type PoolsPage = {
  offset: number;
  limit: number;
  pools: Array<Pool>;
};

class FinanceService {
  blocksClient = new GraphQLClient(GRAPH_BLOCKS_URI, { headers: {} });
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });
  masterchefv2Client = new GraphQLClient(GRAPH_MASTERCHEFV2_URI, { headers: {} });
  masterchefv3Client = new GraphQLClient(GRAPH_MASTERCHEFV3_URI, { headers: {} });
  barClient = new GraphQLClient(GRAPH_BAR_URI, { headers: {} });

  private async getBalanceOf(address: string): Promise<string> {
    const balanceOfFn: RunContractParams = {
      chain: 'avalanche',
      address: JOE_TOKEN_ADDRESS,
      function_name: 'balanceOf',
      abi: JoeContractABI,
      params: { account: address },
    };
    const balance = await Moralis.Web3API.native.runContractFunction(balanceOfFn);

    return balance;
  }

  // TODO from where do we get this? / TVL of what?
  public async getTVL(): Promise<number> {
    const { dayDatas } = await this.exchangeClient.request<GraphDayResponse>(dayDatasQuery);

    const tvl = parseFloat(dayDatas[0].liquidityUSD);

    return tvl;
  }

  public async getMaxSupply(): Promise<string> {
    const maxSupplyFn: RunContractParams = {
      chain: 'avalanche',
      address: JOE_TOKEN_ADDRESS,
      function_name: 'maxSupply',
      abi: JoeContractABI,
    };

    const maxSupply = await Moralis.Web3API.native.runContractFunction(maxSupplyFn);

    return maxSupply;
  }

  private async getXJoePriceInAVAX(): Promise<string> {
    const xJoeTokenBalance = (await Moralis.Web3API.account.getTokenBalances({ chain: 'avalanche', address: XJOE_ADDRESS })).find(
      t => t.token_address.toUpperCase() === JOE_TOKEN_ADDRESS.toUpperCase(),
    ).balance;

    const totalSupplyParams: RunContractParams = {
      chain: 'avalanche',
      address: XJOE_ADDRESS,
      function_name: 'totalSupply',
      abi: JoeBarContractABI,
    };

    const totalSupply = await Moralis.Web3API.native.runContractFunction(totalSupplyParams);

    const ratio = new BN(xJoeTokenBalance).mul(BN_1E18).div(new BN(totalSupply));
    const result = new BN(await this.getPriceAVAX(JOE_TOKEN_ADDRESS)).mul(ratio).div(BN_1E18);

    return result.toString();
  }

  public async getPriceAVAX(requestedTokenAddress: string): Promise<string> {
    if (!requestedTokenAddress) {
      // this is a bit silly as it should never happen, express should reject requests that come without address
      // but this is what the code looked like in the initial joe-api, so keeping to make sure we don't miss anything.
      return '';
    } else {
      const tokenAddress = Utils.resolveTokenAddress(requestedTokenAddress);
      if (tokenAddress === WAVAX_ADDRESS) {
        return BN_1E18.toString();
      }
      if (tokenAddress === XJOE_ADDRESS) {
        const xJoePrice = await this.getXJoePriceInAVAX();
        return xJoePrice;
      }
      const options: TokenPriceRequestParams = {
        address: tokenAddress,
        chain: 'avalanche',
        exchange: 'TraderJoe',
      };
      try {
        const price = await Moralis.Web3API.token.getTokenPrice(options);
        logger.info(`For address ${tokenAddress} got price from ${price.exchangeName}`);
        if (price.nativePrice?.symbol !== 'AVAX') {
          return `Unable to get price in AVAX for ${tokenAddress}`;
        }
        return price.nativePrice?.value;
      } catch (e) {
        return `Error code {} ${e.code} - ${e.error}`;
      }
    }
  }

  public async getPriceUSD(requestedTokenAddress: string): Promise<string> {
    if (!requestedTokenAddress) {
      // this is a bit silly as it should never happen, express should reject requests that come without address
      // but this is what the code looked like in the initial joe-api, so keeping to make sure we don't miss anything.
      return '';
    } else {
      const tokenAddress = Utils.resolveTokenAddress(requestedTokenAddress);
      if (tokenAddress === XJOE_ADDRESS) {
        return new BN(await this.getXJoePriceInAVAX())
          .mul(new BN(await this.getPriceUSD(WAVAX_ADDRESS)))
          .div(BN_1E18)
          .toString();
      }
      const options: TokenPriceRequestParams = {
        address: tokenAddress,
        chain: 'avalanche',
        exchange: 'TraderJoe',
      };
      try {
        const price = await Moralis.Web3API.token.getTokenPrice(options);
        logger.info(`For address ${tokenAddress} got price from ${price.exchangeName}`);
        return (price.usdPrice * Math.pow(10, 18)).toString();
      } catch (e) {
        return `Error code {} ${e.code} - ${e.error}`;
      }
    }
  }

  public getNftHat(hatId?: string): Hat {
    if (!hatId) {
      return {
        name: 'Joe Hat NFT',
      };
    }

    return {
      id: hatId,
      external_url: `https://api.traderjoexyz.com/nft/hat/${hatId}`,
      name: `Joe Hat NFT #${hatId}`,
      description: 'Redeemed a real HAT and burned 1 $HAT',
      image: 'https://ipfs.io/ipfs/QmaYPV2VKW5vHtD92m8h9Q4YFiukFx2fBWPAfCWKg6513s',
    };
  }

  public async getTotalSupply(): Promise<string> {
    const burned = await this.getBalanceOf(BURN_ADDRESS);

    const totalSupplyFn: RunContractParams = {
      chain: 'avalanche',
      address: JOE_TOKEN_ADDRESS,
      function_name: 'totalSupply',
      abi: JoeContractABI,
    };

    const supply = await Moralis.Web3API.native.runContractFunction(totalSupplyFn);

    const totalSupply = new BN(supply).sub(new BN(burned));

    return totalSupply.toString();
  }

  public async getCirculatingSupply(): Promise<string> {
    const teamTreasuryBalances = TEAM_TREASURY_WALLETS.map((wallet: string) => this.getBalanceOf(wallet));

    const totalSupply = await this.getTotalSupply();
    const otherBalances = await Promise.all([...teamTreasuryBalances, this.getBalanceOf(BURN_ADDRESS)]);

    let circulatingSupply = new BN(totalSupply);

    otherBalances.forEach(balance => {
      circulatingSupply = circulatingSupply.sub(new BN(balance));
    });

    return circulatingSupply.toString();
  }

  public async getCirculatingSupplyAdjusted(): Promise<string> {
    const circulatingSupply = await this.getCirculatingSupply();
    const adjustedSupply = new BN(circulatingSupply).div(BN_1E18);

    return adjustedSupply.toString();
  }

  private async getLendingState(): Promise<{ totalSupply: string; totalBorrow: string }> {
    const totalSupplyAndBorrowFn: RunContractParams = {
      chain: 'avalanche',
      address: SUPPLY_BORROW_ADDRESS,
      function_name: 'getTotalSupplyAndTotalBorrow',
      abi: TotalSupplyAndBorrowABI,
    };

    const result = await Moralis.Web3API.native.runContractFunction(totalSupplyAndBorrowFn);
    const totalSupply = result[0];
    const totalBorrow = result[1];

    return {
      totalSupply,
      totalBorrow,
    };
  }

  public async getLendingTotalSupply(): Promise<string> {
    const lendingState = await this.getLendingState();

    return lendingState.totalSupply;
  }

  public async getLendingTotalBorrow(): Promise<string> {
    const lendingState = await this.getLendingState();

    return lendingState.totalBorrow;
  }

  public async getPools(offset: number, limit: number): Promise<PoolsPage> {
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

  public async getPool(requestedToken1Address: string, requestedToken2Address: string): Promise<Pool> {
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

  private joinFarms(farms1: Array<GraphQLFarmV2>, farms2: Array<GraphQLFarmV3>): Array<GraphQLFarmV2 | GraphQLFarmV3> {
    // TODO: We need to build our own types at some point and convert from graphql types to ours.
    const allFarms: Array<GraphQLFarmV3 | GraphQLFarmV2> = farms1.concat(farms2 as unknown as GraphQLFarmV2);

    const allFarmsWithTimestamp = allFarms.map(farm => {
      return {
        innerFarm: farm,
        timestamp: new Date(parseInt(farm.timestamp) * 100),
      };
    });

    return allFarmsWithTimestamp.sort((farmOne, farmTwo) => farmOne.timestamp.getTime() - farmTwo.timestamp.getTime()).map(farm => farm.innerFarm);
  }

  /**
   * Since there are only hundreds of farms, for now we can request all of them
   * and do the sorting ourselves.
   *
   * @param offset
   * @param limit
   * @returns farms from masterchef v2 and v3.
   */
  public async getFarms(offset: number, limit: number): Promise<FarmsPage> {
    const v2farms = await this.masterchefv2Client.request<GraphFarmsV2Response>(farmsQuery);
    const v3farms = await this.masterchefv3Client.request<GraphFarmsV3Response>(farmsQuery);
    const allFarms = this.joinFarms(v2farms.pools, v3farms.pools);

    const options: TokenPriceRequestParams = {
      address: JOE_TOKEN_ADDRESS,
      chain: 'avalanche',
      exchange: 'TraderJoe',
    };
    const joePrice = (await Moralis.Web3API.token.getTokenPrice(options)).usdPrice;
    const masterchefv2Response = await this.masterchefv2Client.request<GraphMasterChefV2Response>(masterchefMetricsQuery);
    const poolsResponse = await this.exchangeClient.request<GraphPoolsResponse>(poolByPairQuery, {
      pairs: allFarms.map(f => f.pair.toLowerCase()),
    });

    return {
      offset,
      limit,
      farms: allFarms.slice(offset, limit).map(farm => this.enrichFarm(farm, joePrice, poolsResponse.pairs, masterchefv2Response.masterChef)),
    };
  }

  private enrichFarm(farm: GraphQLFarmV2 | GraphQLFarmV3, joePriceUSD: number, pools: Array<Pair>, masterChef: MasterChef): Farm {
    const SECONDS_PER_YEAR = 86400 * 365;
    const pool = pools.find(p => p.id === farm.pair);

    // If this farm doesn't have a pool, return the farm without enrichment
    if (!pool) {
      return {
        ...farm,
        tvl: null,
        apr: null,
        apy: null,
      };
    }

    const liquidity = parseFloat(pool.reserveUSD); // Liquidity == Pool TVL

    const { totalAllocPoint, joePerSec } = masterChef;
    const joePerSecNumber = new BN(joePerSec).div(BN_1E18).toNumber();

    const tvl = (parseFloat(farm.jlpBalance) * liquidity) / parseFloat(pool.totalSupply);

    const farmApr = ((((joePerSecNumber * SECONDS_PER_YEAR) / tvl) * parseFloat(farm.allocPoint)) / parseFloat(totalAllocPoint) / 2) * joePriceUSD;

    return {
      ...farm,
      tvl,
      apy: Utils.calculatePoolAPY(farmApr),
      apr: farmApr,
    };
  }

  /**
   * For now, we allow only farm ids with this convention:
   * farmId = "0xPairAddress-0xMasterchefAddress".
   * @param farmId farm identifier
   * @returns a farm content
   */
  public async getFarm(farmId: string): Promise<Farm> {
    const [farmAddress, masterchefAddress] = farmId.split('-');
    let farmResponse: GraphFarmsV2Response | GraphFarmsV3Response;

    if (masterchefAddress?.toLowerCase() === MASTERCHEFV2_ADDRESS) {
      farmResponse = await this.masterchefv2Client.request<GraphFarmsV2Response>(farmQuery, {
        pair: farmAddress,
      });
    } else if (masterchefAddress?.toLowerCase() === MASTERCHEFV3_ADDRESS) {
      farmResponse = await this.masterchefv3Client.request<GraphFarmsV3Response>(farmQuery, {
        pair: farmAddress,
      });
    } else {
      throw new createError.BadRequest('Invalid Farm id');
    }

    if (!farmResponse.pools || farmResponse.pools.length === 0) {
      throw new createError.NotFound('Farm not found');
    }

    if (farmResponse.pools.length > 1) {
      throw new Error('Several farms were found');
    }

    const farm = farmResponse.pools[0];

    const options: TokenPriceRequestParams = {
      address: JOE_TOKEN_ADDRESS,
      chain: 'avalanche',
      exchange: 'TraderJoe',
    };
    const joePrice = (await Moralis.Web3API.token.getTokenPrice(options)).usdPrice;
    const masterchefv2Response = await this.masterchefv2Client.request<GraphMasterChefV2Response>(masterchefMetricsQuery);
    const poolResponse = await this.exchangeClient.request<GraphPoolsResponse>(poolByPairQuery, {
      pairs: [farm.pair.toLowerCase()],
    });

    const enrichedFarm = this.enrichFarm(farm, joePrice, poolResponse.pairs, masterchefv2Response.masterChef);

    return enrichedFarm;
  }
}

export default FinanceService;
