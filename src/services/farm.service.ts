import {
  JOE_TOKEN_ADDRESS,
  GRAPH_EXCHANGE_URI,
  BN_1E18,
  GRAPH_MASTERCHEFV2_URI,
  GRAPH_MASTERCHEFV3_URI,
  MASTERCHEFV2_ADDRESS,
  MASTERCHEFV3_ADDRESS,
  YIELD_MONITOR_BASE_URI,
} from '../configs/index';
import fetch from 'node-fetch';
import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import { URLSearchParams } from 'url';
import createError from 'http-errors';

import { poolByPairQuery } from '../graphql/queries/exchange';
import { farmQuery, farmsQuery, masterchefMetricsQuery } from '../graphql/queries/masterchef';

import { MasterChef, Pool as GraphQLFarmV2 } from '@/graphql/generated/masterchefv2';
import { Pool as GraphQLFarmV3 } from '@/graphql/generated/masterchefv3';
import { Pair } from '@/graphql/generated/exchange';
import Utils from './utils';
import { Farm, FarmsPage } from '@/interfaces/types';

type TokenPriceRequestParams = {
  chain: 'avalanche';
  address: string;
  exchange: string;
};

type YieldMonitorFarm = {
  poolNumber: string;
  symbol0Name: string;
  symbol1Name: string;
  symbol0address: string;
  symbol0price: string;
  symbol1address: string;
  symbol1price: string;
  network: string;
  lpAddress: string;
  coinsASec: string;
  tvl: string | null;
  apy: string; // Can be empty string. It shouldn't
  apyDaily: string;
  apyMonthly: string;
  totalApy: number | null;
  totalApyDaily: string;
  totalApyMonthly: string;
  extraRewards: string | object[] | null;
  isActive: boolean;
};

type GraphFarmsV2Response = { pools: Array<GraphQLFarmV2> };
type GraphFarmsV3Response = { pools: Array<GraphQLFarmV3> };
type GraphMasterChefV2Response = { masterChef: MasterChef };

type GraphPoolsResponse = { pairs: Array<Pair> };
class FarmService {
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });
  masterchefv2Client = new GraphQLClient(GRAPH_MASTERCHEFV2_URI, { headers: {} });
  masterchefv3Client = new GraphQLClient(GRAPH_MASTERCHEFV3_URI, { headers: {} });

  private joinFarms(farms1: Array<GraphQLFarmV2>, farms2: Array<GraphQLFarmV3>): Array<GraphQLFarmV2 | GraphQLFarmV3> {
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
  public async getFarmsFromTheGraph(offset: number, limit: number): Promise<FarmsPage> {
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
      farms: allFarms
        .slice(offset, limit)
        .map(farm => this.createFarmFromTheGraph(farm, joePrice, poolsResponse.pairs, masterchefv2Response.masterChef)),
    };
  }

  /**
   * For now, we allow only farm ids with this convention:
   * farmId = "0xPairAddress-0xMasterchefAddress".
   * @param farmId farm identifier
   * @returns a farm content
   */
  public async getFarmFromTheGraph(farmId: string): Promise<Farm> {
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

    const enrichedFarm = this.createFarmFromTheGraph(farm, joePrice, poolResponse.pairs, masterchefv2Response.masterChef);

    return enrichedFarm;
  }

  private createFarmFromTheGraph(farm: GraphQLFarmV2 | GraphQLFarmV3, joePriceUSD: number, pools: Array<Pair>, masterChef: MasterChef): Farm {
    const SECONDS_PER_YEAR = 86400 * 365;
    const pool = pools.find(p => p.id === farm.pair);

    // If this farm doesn't have a pool, return the farm without enrichment
    if (!pool) {
      return {
        id: farm.id,
        pair: farm.pair,
        masterchef: farm.owner.id,
        tvl: null,
        apr: null,
        apy: null,
        token0Name: null,
        token0: null,
        token1Name: null,
        token1: null,
      };
    }

    const liquidity = parseFloat(pool.reserveUSD); // Liquidity == Pool TVL

    const { totalAllocPoint, joePerSec } = masterChef;
    const joePerSecNumber = new BN(joePerSec).div(BN_1E18).toNumber();

    const tvl = (parseFloat(farm.jlpBalance) * liquidity) / parseFloat(pool.totalSupply);

    const farmApr = ((((joePerSecNumber * SECONDS_PER_YEAR) / tvl) * parseFloat(farm.allocPoint)) / parseFloat(totalAllocPoint) / 2) * joePriceUSD;

    return {
      id: farm.id,
      pair: farm.pair,
      masterchef: farm.owner.id,
      tvl,
      apy: Utils.calculatePoolAPY(farmApr),
      apr: farmApr,
      token0Name: pool.token0.symbol,
      token0: pool.token0.id,
      token1Name: pool.token1.symbol,
      token1: pool.token1.id,
    };
  }

  private createFarmFromYieldMonitor(farm: YieldMonitorFarm): Farm {
    // YieldMonitor returns APY as percentage.
    const apy = parseFloat(farm.apy) / 100;
    const tvl = parseFloat(farm.tvl);

    return {
      id: farm.poolNumber,
      pair: farm.lpAddress,
      // This is because YieldMonitor only handles masterchefv2 farms for now.
      masterchef: MASTERCHEFV2_ADDRESS,
      token0Name: farm.symbol0Name,
      token0: farm.symbol0address,
      token1Name: farm.symbol1Name,
      token1: farm.symbol1address,
      tvl,
      apy,
      apr: Utils.calculatePoolAPRFromAPY(apy),
    };
  }

  // TODO: convert the offset and limit.
  public async getFarmsFromYieldMonitor(offset: number, limit: number): Promise<FarmsPage> {
    const page = offset || 1;
    const queryParams = new URLSearchParams({
      partner: 'trader-jose',
      dexName: 'traderjoe',
      page: page.toString(),
      limit: limit.toString(),
      order: 'liquidity',
    });

    const farmsResponse = await fetch(`${YIELD_MONITOR_BASE_URI}/symbol/getFarmsForDex?` + queryParams.toString());

    const farms = (await farmsResponse.json()) as Array<YieldMonitorFarm>;

    return {
      offset,
      limit,
      farms: farms.map(farm => this.createFarmFromYieldMonitor(farm)),
    };
  }

  public async getFarmFromYieldMonitor(farmId: string): Promise<Farm> {
    // masterchefAddress should always be the same as MASTERCHEFV2_ADDRESS. No V3 in YieldMonitor yet.
    const [farmNumber, masterchefAddress] = farmId.split('-');
    const farmResponse = await fetch(`${YIELD_MONITOR_BASE_URI}/farm/getFarmDetails/${masterchefAddress}/${farmNumber}`);

    const farm = (await farmResponse.json()) as YieldMonitorFarm;

    // YieldMonitor returns a 200 with a string when a farm is not found.
    if (typeof farm === 'string') {
      throw new createError.NotFound('Farm not found');
    }

    return this.createFarmFromYieldMonitor(farm);
  }
}

export default FarmService;
