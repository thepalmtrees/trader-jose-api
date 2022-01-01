import gql from 'graphql-tag';
import { FACTORY_ADDRESS } from '../../configs/index';

export const factoryQuery = gql`
  query factoryQuery($id: String! = "${FACTORY_ADDRESS}") {
    factory(id: $id) {
      id
      volumeUSD
    }
  }
`;

export const factoryTimeTravelQuery = gql`
  query factoryTimeTravelQuery($id: String! = "${FACTORY_ADDRESS}", $block: Block_height!) {
    factory(id: $id, block: $block) {
      id
      volumeUSD
    }
  }
`;

// Tokens...
const tokenFieldsFragment = gql`
  fragment tokenFields on Token {
    id
    symbol
    name
    decimals
    totalSupply
    volume
    volumeUSD
    untrackedVolumeUSD
    txCount
    liquidity
    derivedAVAX
  }
`;

export const tokenQuery = gql`
  query tokenQuery($id: String!) {
    token(id: $id) {
      ...tokenFields
    }
  }
  ${tokenFieldsFragment}
`;

const bundleFieldsFragment = gql`
  fragment bundleFields on Bundle {
    id
    avaxPrice
  }
`;

export const avaxPriceQuery = gql`
  query avaxPriceQuery($id: Int! = 1) {
    bundles(id: $id) {
      ...bundleFields
    }
  }
  ${bundleFieldsFragment}
`;

export const dayDatasQuery = gql`
  query dayDatasQuery($first: Int! = 1, $date: Int! = 0) {
    dayDatas(first: $first, orderBy: date, orderDirection: desc) {
      id
      date
      volumeAVAX
      volumeUSD
      untrackedVolume
      liquidityAVAX
      liquidityUSD
      txCount
    }
  }
`;

const pairTokenFieldsFragment = gql`
  fragment pairTokenFields on Token {
    id
    name
    symbol
    totalSupply
    derivedAVAX
  }
`;

export const poolFieldsFragment = gql`
  fragment poolFields on Pair {
    id
    reserveUSD
    reserveAVAX
    volumeUSD
    untrackedVolumeUSD
    trackedReserveAVAX
    token0 {
      ...pairTokenFields
    }
    token1 {
      ...pairTokenFields
    }
    reserve0
    reserve1
    token0Price
    token1Price
    totalSupply
    txCount
    timestamp
  }
  ${pairTokenFieldsFragment}
`;

export const poolsQuery = gql`
  query poolsQuery(
    $first: Int! = 100
    $skip: Int! = 0
    $orderBy: String! = "reserveUSD"
    $orderDirection: String! = "desc"
    $dateAfter: Int! = 1622419200
  ) {
    pairs(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, dateAfter: $dateAfter) {
      ...poolFields
    }
  }
  ${poolFieldsFragment}
`;

export const poolQuery = gql`
  query poolQuery($dateAfter: Int! = 1622419200, $tokens: [String!] = []) {
    pairs(where: { token0_in: $tokens, token1_in: $tokens }) {
      ...poolFields
    }
  }
  ${poolFieldsFragment}
`;
