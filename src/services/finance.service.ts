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
} from '../configs/index';
import { logger } from '@utils/logger';

import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import TotalSupplyAndBorrowABI from '../abis/TotalSupplyAndBorrowABI.json';
import JoeBarContractABI from '../abis/JoeBarContractABI.json';
import JoeContractABI from '../abis/JoeTokenContractABI.json';
import { startOfHour, subDays } from 'date-fns';

import { dayDatasQuery, poolsQuery, poolQuery } from '../graphql/queries/exchange';

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

type GraphDayResponse = { dayDatas: Array<DayData> };
type GraphPoolsResponse = { pairs: Array<Pair> };

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
}

export default FinanceService;
