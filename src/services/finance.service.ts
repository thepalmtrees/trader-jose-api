import { FACTORY_ADDRESS, JOE_TOKEN_ADDRESS, GRAPH_BAR_URI, GRAPH_BLOCKS_URI, GRAPH_EXCHANGE_URI } from '../configs/index';
import { logger } from '@utils/logger';

import { GraphQLClient } from 'graphql-request';
import Moralis from 'moralis/node';
import BN from 'bn.js';
import JoeContractABI from '../abis/JoeTokenContractABI.json';
import { startOfMinute, subDays } from 'date-fns';

import { barQuery, blockQuery, factoryQuery, factoryTimeTravelQuery, tokenQuery, avaxPriceQuery, dayDatasQuery } from '../queries/exchange';

const FEE_RATE = 0.0005;

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
    // runContractFunction function was complaining because of typing issues.
    const maxSupplyFn: { chain: 'avalanche' } & any = {
      chain: 'avalanche',
      address: JOE_TOKEN_ADDRESS,
      function_name: 'maxSupply',
      abi: JoeContractABI,
    };

    const maxSupply = await Moralis.Web3API.native.runContractFunction(maxSupplyFn);

    return maxSupply;
  }
}

export default FinanceService;
