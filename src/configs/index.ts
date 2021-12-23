import BN from 'bn.js';

export const GRAPH_BAR_URI = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/bar';
export const GRAPH_MASTERCHEF_URI = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/masterchefv2';
export const GRAPH_EXCHANGE_URI = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange';
export const GRAPH_BLOCKS_URI = 'https://api.thegraph.com/subgraphs/name/dasconnor/avalanche-blocks';
export const GRAPH_LENDING_URI = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending-rinkeby';

export const FACTORY_ADDRESS = '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10'.toLowerCase();
export const JOE_TOKEN_ADDRESS = '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd'.toLowerCase();
export const MASTERCHEF_ADDRESS = '0xd6a4F121CA35509aF06A0Be99093d08462f53052'.toLowerCase();
export const BAR_ADDRESS = '0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33'.toLowerCase();
export const LENDING_ADDRESS = '0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258'.toLowerCase();
export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

export const TEAM_TREASURY_WALLETS = [
  '0xaFF90532E2937fF290009521e7e120ed062d4F34', // 1st Team vesting contract
  '0xFea7879Bf27B4461De9a9b8A03dBcc7f49C52bEa', // 2nd Team vesting contract
  '0xc13B1C927565C5AF8fcaF9eF7387172c447f6796', // Investor cliff contract
  '0x66Fb02746d72bC640643FdBa3aEFE9C126f0AA4f', // Treasury wallet
  '0x15f08E8656FA6205B53819e36dCBeC8f481Da14C', // Team wallet
  '0x5D3e4C0FE11e0aE4c32F0FF74B4544C49538AC61', // Dev operational wallet
  '0x381f39231576f52185EDE4b670bc39e9FF2Aab96', // Investor wallet
];

export const BN_1E18 = new BN('1000000000000000000');
