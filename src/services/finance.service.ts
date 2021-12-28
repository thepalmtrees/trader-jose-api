import {
  FACTORY_ADDRESS,
  JOE_TOKEN_ADDRESS,
  GRAPH_BAR_URI,
  GRAPH_BLOCKS_URI,
  GRAPH_EXCHANGE_URI,
  BURN_ADDRESS,
  TEAM_TREASURY_WALLETS,
  BN_1E18,
  SUPPLY_BORROW_ADDRESS,
} from '../configs/index';
import { logger } from '@utils/logger';

import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import TotalSupplyAndBorrowABI from '../abis/TotalSupplyAndBorrowABI.json';
import JoeContractABI from '../abis/JoeTokenContractABI.json';
import { startOfMinute, subDays } from 'date-fns';

import {
  barQuery,
  blockQuery,
  factoryQuery,
  factoryTimeTravelQuery,
  tokenQuery,
  avaxPriceQuery,
  dayDatasQuery,
  pairsQuery,
  pairQuery,
} from '../queries/exchange';

const tokenList = require('../utils/tokenList.json');

const FEE_RATE = 0.0005;

type TokenPriceRequestParams = {
  chain: 'avalanche';
  address: string;
};

type RunContractParams = {
  chain: 'avalanche';
  address: string;
  function_name: string;
  abi: any;
  params?: any;
};

/**
 * For now, a Pool is just an object.
 * We will need to expose more granular types once
 * we know what we want to return.
 */
type Pool = object;

type PoolsPage = {
  offset: number;
  limit: number;
  pairs: Array<Pool>;
};

class FinanceService {
  blocksClient = new GraphQLClient(GRAPH_BLOCKS_URI, { headers: {} });
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });
  barClient = new GraphQLClient(GRAPH_BAR_URI, { headers: {} });
  private async getFirstBundleAVAXPrice(): Promise<number> {
    const bundleData = await this.exchangeClient.request(avaxPriceQuery);
    return parseFloat(bundleData?.bundles[0].avaxPrice);
  }

  private async getTokenDerivedAVAX(): Promise<number> {
    const tokenData = await this.exchangeClient.request(tokenQuery, {
      id: JOE_TOKEN_ADDRESS,
    });
    return parseFloat(tokenData?.token.derivedAVAX);
  }

  private async getJoeStaked(): Promise<number> {
    const barData = await this.barClient.request(barQuery);
    return barData?.bar.joeStaked;
  }

  private async getOneDayVolumeUSD(): Promise<number> {
    const oneDayBlockNumber = await this.getOneDayBlock();
    const factoryTimeTravelData = await this.exchangeClient.request(factoryTimeTravelQuery, {
      block: oneDayBlockNumber,
    });
    return factoryTimeTravelData?.factory.volumeUSD;
  }

  private async getOneDayBlock(): Promise<{ number: number }> {
    // https://stackoverflow.com/questions/48274028/the-left-hand-and-right-hand-side-of-an-arithmetic-operation-must-be-of-type-a
    const date = startOfMinute(subDays(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;

    const blocksData = await this.blocksClient.request(blockQuery, {
      start,
      end,
    });
    return { number: Number(blocksData?.blocks[0].number) };
  }

  private async getFactoryVolumeUSD(): Promise<number> {
    const factoryData = await this.exchangeClient.request(factoryQuery);
    return factoryData?.factory.volumeUSD;
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

  public async getTVL(): Promise<number> {
    const { dayDatas } = await this.exchangeClient.request(dayDatasQuery);

    const tvl = parseFloat(dayDatas[0].liquidityUSD);

    return tvl;
  }

  public async getAPR(): Promise<number> {
    logger.info(FACTORY_ADDRESS);
    logger.info(FEE_RATE);
    const oneDayVolumeUSD = await this.getOneDayVolumeUSD();
    const factoryVolumeUSD = await this.getFactoryVolumeUSD();

    // get last day volume and APY
    const oneDayVolume = factoryVolumeUSD - oneDayVolumeUSD;
    const oneDayFees = oneDayVolume * FEE_RATE;
    const tokenDerivedAVAX = await this.getTokenDerivedAVAX();
    const firstBundleAVAXPrice = await this.getFirstBundleAVAXPrice();
    const joePrice = tokenDerivedAVAX * firstBundleAVAXPrice;
    const joeStaked = await this.getJoeStaked();
    const totalStakedUSD = joeStaked * joePrice;

    return (oneDayFees * 365) / totalStakedUSD;
  }

  public async getAPY(): Promise<number> {
    const apr = await this.getAPR();
    const apy = Math.pow(1 + apr / 365, 365) - 1;
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

  public async getPriceUSD(requestedTokenAddress: string) {
    let tokenAddress;
    if (requestedTokenAddress in tokenList) {
      tokenAddress = tokenList[requestedTokenAddress];
    } else {
      tokenAddress = requestedTokenAddress;
    }
    const options: TokenPriceRequestParams = {
      address: tokenAddress,
      chain: 'avalanche',
    };
    const price = await Moralis.Web3API.token.getTokenPrice(options);
    logger.info(`For address ${tokenAddress} got price from ${price.exchangeName}`);
    return price.usdPrice * Math.pow(10, 18);
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
    const pairsData = await this.exchangeClient.request(pairsQuery, {
      skip: offset,
      first: limit,
    });

    return {
      offset,
      limit,
      pairs: pairsData.pairs,
    };
  }

  public async getPool(token1Address: string, token2Address: string): Promise<Pool> {
    const pairData = await this.exchangeClient.request(pairQuery, {
      tokens: [token1Address, token2Address],
    });

    return pairData.pairs[0];
  }
}

export default FinanceService;
