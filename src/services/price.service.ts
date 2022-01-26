import { JOE_TOKEN_ADDRESS, BN_1E18, WAVAX_ADDRESS, XJOE_ADDRESS } from '../configs/index';
import { logger } from '@utils/logger';

import BN from 'bn.js';
import Moralis from 'moralis/node';
import JoeBarContractABI from '../abis/JoeBarContractABI.json';

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

class PriceService {
  private async getXJoePriceInAVAX(): Promise<number> {
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
    const joePriceInAVAX = await this.getPriceAVAX(JOE_TOKEN_ADDRESS);
    const result = new BN(joePriceInAVAX.toString()).mul(ratio).div(BN_1E18);

    return result.toNumber();
  }

  public async getPriceAVAX(requestedTokenAddress: string): Promise<number> {
    if (!requestedTokenAddress) {
      // this is a bit silly as it should never happen, express should reject requests that come without address
      // but this is what the code looked like in the initial joe-api, so keeping to make sure we don't miss anything.
      return 0;
    } else {
      const tokenAddress = Utils.resolveTokenAddress(requestedTokenAddress);
      if (tokenAddress === WAVAX_ADDRESS) {
        return BN_1E18.toNumber();
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
          throw new Error(`Unable to get price in AVAX for ${tokenAddress}`);
        }
        return parseFloat(price.nativePrice?.value);
      } catch (e) {
        throw new Error(`Error code {} ${e.code} - ${e.error}`);
      }
    }
  }

  public async getPriceUSD(requestedTokenAddress: string): Promise<number> {
    if (!requestedTokenAddress) {
      // this is a bit silly as it should never happen, express should reject requests that come without address
      // but this is what the code looked like in the initial joe-api, so keeping to make sure we don't miss anything.
      return 0;
    } else {
      const tokenAddress = Utils.resolveTokenAddress(requestedTokenAddress);
      if (tokenAddress === XJOE_ADDRESS) {
        return new BN(await this.getXJoePriceInAVAX())
          .mul(new BN(await this.getPriceUSD(WAVAX_ADDRESS)))
          .div(BN_1E18)
          .toNumber();
      }
      const options: TokenPriceRequestParams = {
        address: tokenAddress,
        chain: 'avalanche',
        exchange: 'TraderJoe',
      };
      try {
        const price = await Moralis.Web3API.token.getTokenPrice(options);
        logger.info(`For address ${tokenAddress} got price from ${price.exchangeName}`);
        return price.usdPrice;
      } catch (e) {
        throw new Error(`Error code {} ${e.code} - ${e.error}`);
      }
    }
  }
}

export default PriceService;
