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
import { startOfHour, startOfMinute, subDays } from 'date-fns';

import { factoryQuery, factoryTimeTravelQuery, tokenQuery, avaxPriceQuery, dayDatasQuery, poolsQuery, poolQuery } from '../graphql/queries/exchange';
import { barQuery } from '@/graphql/queries/bar';
import { blockQuery } from '@/graphql/queries/block';
import { farmQuery, farmsQuery } from '@/graphql/queries/masterchef';

import { Pool as GraphQLFarmV2 } from '@/graphql/generated/masterchefv2';
import { Pool as GraphQLFarmV3 } from '@/graphql/generated/masterchefv3';
import { Bundle, DayData, Factory, Pair, PairHourData, Token } from '@/graphql/generated/exchange';
import { Bar } from '@/graphql/generated/bar';

const tokenList = require('../utils/tokenList.json');

const FEE_RATE = 0.0005;
const POOLS_FEE_RATE = 0.0025;

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
 * Same for farms.
 */
type Pool = object;
type Farm = object & { timestamp: string };

type GraphFarmsV2Response = { pools: Array<GraphQLFarmV2> };
type GraphFarmsV3Response = { pools: Array<GraphQLFarmV3> };
type GraphAvaxPriceResponse = { bundles: Array<Bundle> };
type GraphTokenResponse = { token: Token };
type GraphBarResponse = { bar: Bar };
type GraphFactoryResponse = { factory: Factory };
type GraphBlockResponse = { blocks: Array<{ number: string }> };
type GraphDayResponse = { dayDatas: Array<DayData> };
type GraphPoolsResponse = { pairs: Array<Pair> };

type FarmsPage = {
  offset: number;
  limit: number;
  farms: Farms;
};

type Farms = Array<GraphQLFarmV2 | GraphQLFarmV3>;

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
  private async getFirstBundleAVAXPrice(): Promise<number> {
    const bundleData = await this.exchangeClient.request<GraphAvaxPriceResponse>(avaxPriceQuery);
    return parseFloat(bundleData?.bundles[0].avaxPrice);
  }

  private async getTokenDerivedAVAX(): Promise<number> {
    const tokenData = await this.exchangeClient.request<GraphTokenResponse>(tokenQuery, {
      id: JOE_TOKEN_ADDRESS,
    });
    return parseFloat(tokenData?.token.derivedAVAX);
  }

  private async getJoeStaked(): Promise<number> {
    const barData = await this.barClient.request<GraphBarResponse>(barQuery);

    return parseFloat(barData?.bar.joeStaked);
  }

  private async getOneDayVolumeUSD(): Promise<number> {
    const oneDayBlockNumber = await this.getOneDayBlock();
    const factoryTimeTravelData = await this.exchangeClient.request<GraphFactoryResponse>(factoryTimeTravelQuery, {
      block: oneDayBlockNumber,
    });
    return parseFloat(factoryTimeTravelData?.factory.volumeUSD);
  }

  private async getOneDayBlock(): Promise<{ number: number }> {
    // https://stackoverflow.com/questions/48274028/the-left-hand-and-right-hand-side-of-an-arithmetic-operation-must-be-of-type-a
    const date = startOfMinute(subDays(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;

    const blocksData = await this.blocksClient.request<GraphBlockResponse>(blockQuery, {
      start,
      end,
    });
    return { number: Number(blocksData?.blocks[0].number) };
  }

  private async getFactoryVolumeUSD(): Promise<number> {
    const factoryData = await this.exchangeClient.request<GraphFactoryResponse>(factoryQuery);
    return parseFloat(factoryData?.factory.volumeUSD);
  }

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

  // From page Stake APR
  // TODO is this APR of joe stake?
  public async getAPR(): Promise<number> {
    const oneDayVolumeUSD = await this.getOneDayVolumeUSD();
    const factoryVolumeUSD = await this.getFactoryVolumeUSD();

    // get last day volume and APY
    const oneDayVolume = factoryVolumeUSD - oneDayVolumeUSD;
    const oneDayFees = oneDayVolume * FEE_RATE;
    const tokenDerivedAVAX = await this.getTokenDerivedAVAX();
    const avaxPriceInUSD = await this.getFirstBundleAVAXPrice();
    const joePriceInUSD = tokenDerivedAVAX * avaxPriceInUSD;
    const joeStaked = await this.getJoeStaked();
    const totalStakedUSD = joeStaked * joePriceInUSD;

    return (oneDayFees * 365) / totalStakedUSD;
  }

  // From page Stake APY
  // TODO is this APY of joe stake?
  public async getAPY(): Promise<number> {
    const apr = await this.getAPR();
    const apy = this.calculateAPY(apr);
    return apy;
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
      const tokenAddress = this.resolveTokenAddress(requestedTokenAddress);
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
      const tokenAddress = this.resolveTokenAddress(requestedTokenAddress);
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

  private resolveTokenAddress(requestedTokenAddress: string): string {
    if (requestedTokenAddress in tokenList) {
      return tokenList[requestedTokenAddress];
    } else {
      return requestedTokenAddress;
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
      pools: pairsData.pairs,
    };
  }

  /**
   * IMPORTANT. We cannot use this method, for now, to calculate tvl of several pools
   * since it would take a long time to get each of the tokens price.
   */
  private async calculatePoolTVL(token0Address: string, token0Reserve: string, token1Address: string, token1Reserve: string): Promise<number> {
    const token0PriceInUSD = parseFloat(await this.getPriceUSD(token0Address)) / Math.pow(10, 18);
    const token1PriceInUSD = parseFloat(await this.getPriceUSD(token1Address)) / Math.pow(10, 18);

    const reserve0 = parseFloat(token0Reserve);
    const reserve1 = parseFloat(token1Reserve);

    const token0LiquidityUSD = reserve0 * token0PriceInUSD;
    const token1LiquidityUSD = reserve1 * token1PriceInUSD;

    return token0LiquidityUSD + token1LiquidityUSD;
  }

  private calculatePoolAPR(volume24hs: number, tvl: number): number {
    const fees24hs = volume24hs * POOLS_FEE_RATE;
    const yearlyFee = fees24hs * 365;

    return yearlyFee / tvl;
  }

  private calculateAPY(apr: number): number {
    return Math.pow(1 + apr / 365, 365) - 1;
  }

  private getVolume24hs(last24hours: PairHourData[]): number {
    return last24hours.reduce((accum, hour) => {
      if (parseFloat(hour.volumeUSD) === 0) {
        return accum + parseFloat(hour.untrackedVolumeUSD);
      }
      return accum + parseFloat(hour.volumeUSD);
    }, 0);
  }

  public async getPool(token1Address: string, token2Address: string): Promise<Pool> {
    const yesterdayInSeconds = startOfHour(subDays(Date.now(), 1)).getTime() / 1000;

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

    const { hourData, reserve0, reserve1, token0, token1 } = pairData.pairs[0];

    const tvl = await this.calculatePoolTVL(token0.id, reserve0, token1.id, reserve1);

    const volume24hs = this.getVolume24hs(hourData);
    const fees24hs = volume24hs * POOLS_FEE_RATE;

    const apr = this.calculatePoolAPR(volume24hs, tvl);
    const apy = this.calculateAPY(apr);

    return {
      ...pairData.pairs[0],
      volume24hs,
      tvl,
      apr,
      apy,
      fees24hs,
    };
  }

  private joinFarms(farms1: Array<GraphQLFarmV2>, farms2: Array<GraphQLFarmV3>): Farms {
    // TODO: We need to build our own types at some point and convert from graphql types to ours.
    const allFarms: Farms = farms1.concat(farms2 as unknown as GraphQLFarmV2);

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

    return {
      offset,
      limit,
      farms: allFarms.slice(offset, limit),
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
    let farm: GraphFarmsV2Response | GraphFarmsV3Response;

    if (masterchefAddress?.toLowerCase() === MASTERCHEFV2_ADDRESS) {
      farm = await this.masterchefv2Client.request<GraphFarmsV2Response>(farmQuery, {
        pair: farmAddress,
      });
    } else if (masterchefAddress?.toLowerCase() === MASTERCHEFV3_ADDRESS) {
      farm = await this.masterchefv3Client.request<GraphFarmsV3Response>(farmQuery, {
        pair: farmAddress,
      });
    } else {
      throw new createError.BadRequest('Invalid Farm id');
    }

    if (!farm.pools || farm.pools.length === 0) {
      throw new createError.NotFound('Farm not found');
    }

    if (farm.pools.length > 1) {
      throw new Error('Several farms were found');
    }

    return farm.pools[0];
  }
}

export default FinanceService;
