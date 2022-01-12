import { JOE_TOKEN_ADDRESS, GRAPH_EXCHANGE_URI, BURN_ADDRESS, TEAM_TREASURY_WALLETS, BN_1E18, SUPPLY_BORROW_ADDRESS } from '../configs/index';

import { GraphQLClient } from 'graphql-request';
import BN from 'bn.js';
import Moralis from 'moralis/node';
import TotalSupplyAndBorrowABI from '../abis/TotalSupplyAndBorrowABI.json';
import JoeContractABI from '../abis/JoeTokenContractABI.json';
import { dayDatasQuery } from '../graphql/queries/exchange';

import { DayData } from '@/graphql/generated/exchange';

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

type GraphDayResponse = { dayDatas: Array<DayData> };

class FinanceService {
  exchangeClient = new GraphQLClient(GRAPH_EXCHANGE_URI, { headers: {} });

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
}

export default FinanceService;
