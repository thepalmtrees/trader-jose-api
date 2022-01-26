import { BN_1E18, JOE_TROLLER_ADDRESS } from '../configs/index';

import BN from 'bn.js';
import Moralis from 'moralis/node';
import JoeTrollerABI from '../abis/JoeTrollerABI.json';
import JTokenABI from '../abis/JTokenABI.json';
import JERC20ABI from '../abis/JERC20.json';
import PriceService from './price.service';
import { logger } from '@utils/logger';

type RunContractParams = {
  chain: 'avalanche';
  address: string;
  function_name: string;
  abi: any;
  params?: any;
};

const secondsPerDay = 86400;
const daysPerYear = 365;

const _1E18 = Math.pow(10, 18);

/**
 * This service is currently not used as it faces rate limiting issues with Moralis.
 * We created a cloud function that populates a cache as a workaround.
 */
class LendingService {
  private priceService = new PriceService();

  public async getLendingMarkets(): Promise<object> {
    const allMarketsFn: RunContractParams = {
      chain: 'avalanche',
      address: JOE_TROLLER_ADDRESS,
      function_name: 'getAllMarkets',
      abi: JoeTrollerABI,
    };

    const marketAddresses = Array.from(await Moralis.Web3API.native.runContractFunction(allMarketsFn));
    const allMarketsMetrics = [];
    for (let i = 0; i < marketAddresses.length; i++) {
      await new Promise(res => setTimeout(res, 30000));
      const marketMetrics = await this.getLendingMarket(marketAddresses[i]);
      allMarketsMetrics.push(marketMetrics);
    }
    return allMarketsMetrics;
  }

  public async getLendingMarket(oneMarket: string): Promise<object> {
    logger.info(`Getting market metrics for ${oneMarket}`);
    const underlyingFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'underlying',
      abi: JERC20ABI,
    };
    const underlyingAddress = await Moralis.Web3API.native.runContractFunction(underlyingFn);
    const decimalsFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'decimals',
      abi: JERC20ABI,
    };
    const decimals = await Moralis.Web3API.native.runContractFunction(decimalsFn);

    const underlyingDecimalsFn: RunContractParams = {
      chain: 'avalanche',
      address: underlyingAddress,
      function_name: 'decimals',
      abi: JERC20ABI,
    };
    const underlyingDecimals = await Moralis.Web3API.native.runContractFunction(underlyingDecimalsFn);

    const _1Edecimals = Math.pow(10, parseInt(underlyingDecimals));

    const tokenPriceInUSD = await this.priceService.getPriceUSD(underlyingAddress);

    const exchangeRateStoredFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'exchangeRateStored',
      abi: JTokenABI,
    };
    const exchangeRateStored = parseFloat(await Moralis.Web3API.native.runContractFunction(exchangeRateStoredFn)) / _1Edecimals;

    const totalSupplyFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'totalSupply',
      abi: JTokenABI,
    };
    const totalSupply = parseInt(await Moralis.Web3API.native.runContractFunction(totalSupplyFn));

    const deposits = (totalSupply / _1E18) * exchangeRateStored;
    const depositsUSD = deposits * tokenPriceInUSD;

    const totalReservesFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'totalReserves',
      abi: JTokenABI,
    };
    const totalReserves = parseInt(await Moralis.Web3API.native.runContractFunction(totalReservesFn));
    const reservesUSD = (totalReserves / _1Edecimals) * tokenPriceInUSD;

    const cashFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'getCash',
      abi: JTokenABI,
    };
    const cash = parseFloat(await Moralis.Web3API.native.runContractFunction(cashFn));

    const totalBorrowsFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'totalBorrows',
      abi: JTokenABI,
    };
    const totalBorrows = parseInt(await Moralis.Web3API.native.runContractFunction(totalBorrowsFn));
    const borrowsNative = totalBorrows / _1Edecimals;
    const borrowsUSD = borrowsNative * tokenPriceInUSD;

    const reserveFactorMantissaFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'reserveFactorMantissa',
      abi: JTokenABI,
    };
    const reserveFactorMantissa = parseInt(await Moralis.Web3API.native.runContractFunction(reserveFactorMantissaFn));
    const reserveFactor = reserveFactorMantissa / _1Edecimals;

    const marketFn: RunContractParams = {
      chain: 'avalanche',
      address: JOE_TROLLER_ADDRESS,
      function_name: 'markets',
      abi: JoeTrollerABI,
      params: { '': oneMarket },
    };
    let maybeCollateralFactor = 0;
    try {
      const market: any = await Moralis.Web3API.native.runContractFunction(marketFn);
      maybeCollateralFactor = market.collateralFactorMantissa / _1Edecimals;
    } catch (e) {
      // do nothing
      console.log(e);
    }

    const borrowAPY = await this.getMarketBorrowAPY(oneMarket);
    const supplyAPY = await this.getMarketSupplyAPY(oneMarket);

    const utilizationRate = totalBorrows / (cash + totalBorrows - totalReserves);
    const liquidityNative = (cash - totalReserves) / _1Edecimals;
    const liquidityUSD = liquidityNative * tokenPriceInUSD;

    return {
      decimals,
      underlyingDecimals,
      deposits,
      depositsUSD,
      reservesUSD,
      borrowsNative,
      borrowsUSD,
      liquidityNative,
      liquidityUSD,
      utilizationRate,
      borrowAPY,
      supplyAPY,
      reserveFactor,
      maybeCollateralFactor,
      exchangeRateStored,
      totalSupply,
    };
  }

  private async getMarketBorrowAPY(oneMarket: string) {
    const borrowRatePerSecondFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'borrowRatePerSecond',
      abi: JTokenABI,
    };
    const borrowResultBN = new BN(await Moralis.Web3API.native.runContractFunction(borrowRatePerSecondFn));

    const borrowPerSecond = parseFloat(borrowResultBN.toString()) / _1E18;

    return (Math.pow(borrowPerSecond * secondsPerDay + 1, daysPerYear) - 1) * 100;
  }

  private async getMarketSupplyAPY(oneMarket: string) {
    const supplyRatePerSecondFn: RunContractParams = {
      chain: 'avalanche',
      address: oneMarket,
      function_name: 'supplyRatePerSecond',
      abi: JTokenABI,
    };
    const supplyResultBN = new BN(await Moralis.Web3API.native.runContractFunction(supplyRatePerSecondFn));

    const supplyPerSecond = parseFloat(supplyResultBN.toString()) / _1E18;

    return (Math.pow(supplyPerSecond * secondsPerDay + 1, daysPerYear) - 1) * 100;
  }
}

export default LendingService;
