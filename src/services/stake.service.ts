import { JOE_TOKEN_ADDRESS, GRAPH_BAR_URI, GRAPH_BLOCKS_URI, GRAPH_EXCHANGE_URI } from '../configs/index';

import { GraphQLClient } from 'graphql-request';
import { startOfMinute, subDays } from 'date-fns';

import { factoryQuery, factoryTimeTravelQuery, tokenQuery, avaxPriceQuery } from '../graphql/queries/exchange';
import { barQuery } from '@/graphql/queries/bar';
import { blockQuery } from '@/graphql/queries/block';

import { Bundle, Factory, Token } from '@/graphql/generated/exchange';
import { Bar } from '@/graphql/generated/bar';

const FEE_RATE = 0.0005;

type GraphAvaxPriceResponse = { bundles: Array<Bundle> };
type GraphTokenResponse = { token: Token };
type GraphBarResponse = { bar: Bar };
type GraphFactoryResponse = { factory: Factory };
type GraphBlockResponse = { blocks: Array<{ number: string }> };

class StakeService {
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });
  barClient = new GraphQLClient(GRAPH_BAR_URI, { headers: {} });
  blocksClient = new GraphQLClient(GRAPH_BLOCKS_URI, { headers: {} });

  public async getTotalStakedUSD(): Promise<number> {
    const avaxPriceInUSD = await this.getFirstBundleAVAXPrice();
    const tokenDerivedAVAX = await this.getTokenDerivedAVAX();
    const joePriceInUSD = tokenDerivedAVAX * avaxPriceInUSD;
    const joeStaked = await this.getJoeStaked();
    return joeStaked * joePriceInUSD;
  }

  public async getOneDayFees(): Promise<number> {
    const oneDayVolumeUSD = await this.getOneDayVolumeUSD();
    const factoryVolumeUSD = await this.getFactoryVolumeUSD();
    const oneDayVolume = factoryVolumeUSD - oneDayVolumeUSD;
    return oneDayVolume * FEE_RATE;
  }

  public async getAPR(totalStakedUSD: number, oneDayFees: number): Promise<number> {
    return (oneDayFees * 365) / totalStakedUSD;
  }

  public async getAPY(apr: number): Promise<number> {
    return Math.pow(1 + apr / 365, 365) - 1;
  }

  private async getFirstBundleAVAXPrice(): Promise<number> {
    const bundleData = await this.exchangeClient.request<GraphAvaxPriceResponse>(avaxPriceQuery);
    return parseFloat(bundleData?.bundles[0].avaxPrice);
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

  private async getOneDayVolumeUSD(): Promise<number> {
    const oneDayBlockNumber = await this.getOneDayBlock();
    const factoryTimeTravelData = await this.exchangeClient.request<GraphFactoryResponse>(factoryTimeTravelQuery, {
      block: oneDayBlockNumber,
    });
    return parseFloat(factoryTimeTravelData?.factory.volumeUSD);
  }

  private async getJoeStaked(): Promise<number> {
    const barData = await this.barClient.request<GraphBarResponse>(barQuery);

    return parseFloat(barData?.bar.joeStaked);
  }

  private async getTokenDerivedAVAX(): Promise<number> {
    const tokenData = await this.exchangeClient.request<GraphTokenResponse>(tokenQuery, {
      id: JOE_TOKEN_ADDRESS,
    });
    return parseFloat(tokenData?.token.derivedAVAX);
  }

  private async getFactoryVolumeUSD(): Promise<number> {
    const factoryData = await this.exchangeClient.request<GraphFactoryResponse>(factoryQuery);
    return parseFloat(factoryData?.factory.volumeUSD);
  }
}

export default StakeService;
