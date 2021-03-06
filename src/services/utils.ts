const tokenList = require('../utils/tokenList.json');

const POOLS_FEE_RATE = 0.0025;

class Utils {
  public static resolveTokenAddress(requestedTokenAddress: string): string {
    if (requestedTokenAddress.toLowerCase() in tokenList) {
      return tokenList[requestedTokenAddress.toLowerCase()];
    } else {
      return requestedTokenAddress;
    }
  }

  public static calculatePoolFees24h(volume24h: number): number {
    return volume24h * POOLS_FEE_RATE;
  }

  public static calculatePoolAPR(fees24hs: number, tvl: number): number {
    if (tvl === 0) {
      return 0;
    }
    return (fees24hs * 365) / tvl;
  }

  public static calculatePoolAPRFromAPY(apy: number): number {
    return 365 * (Math.pow(apy + 1, 1 / 365) - 1);
  }

  public static calculatePoolAPY(apr: number): number {
    return Math.pow(1 + apr / 365, 365) - 1;
  }
}

export default Utils;
