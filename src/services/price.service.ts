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
}

export default PriceService;
