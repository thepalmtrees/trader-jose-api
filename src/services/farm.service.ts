import {
  JOE_TOKEN_ADDRESS,
  GRAPH_EXCHANGE_URI,
  BN_1E18,
  GRAPH_MASTERCHEFV2_URI,
  GRAPH_MASTERCHEFV3_URI,
  MASTERCHEFV2_ADDRESS,
  MASTERCHEFV3_ADDRESS,
} from '../configs/index';

import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import createError from 'http-errors';

import { poolByPairQuery } from '../graphql/queries/exchange';
import { farmQuery, farmsQuery, masterchefMetricsQuery } from '../graphql/queries/masterchef';

import { MasterChef, Pool as GraphQLFarmV2 } from '@/graphql/generated/masterchefv2';
import { Pool as GraphQLFarmV3 } from '@/graphql/generated/masterchefv3';
import { Pair } from '@/graphql/generated/exchange';
import Utils from './utils';

type TokenPriceRequestParams = {
  chain: 'avalanche';
  address: string;
  exchange: string;
};

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

type GraphPoolsResponse = { pairs: Array<Pair> };

type FarmsPage = {
  offset: number;
  limit: number;
  farms: Array<Farm>;
};

class FarmService {
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });
  masterchefv2Client = new GraphQLClient(GRAPH_MASTERCHEFV2_URI, { headers: {} });
  masterchefv3Client = new GraphQLClient(GRAPH_MASTERCHEFV3_URI, { headers: {} });

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

export default FarmService;
