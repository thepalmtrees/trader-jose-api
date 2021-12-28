import gql from 'graphql-tag';
import { BAR_ADDRESS, FACTORY_ADDRESS } from '../configs/index';

// Tokens...
const blockFieldsQuery = gql`
  fragment blockFields on Block {
    id
    number
    timestamp
  }
`;

export const blockQuery = gql`
  query blockQuery($start: Int!, $end: Int!) {
    blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: { timestamp_gt: $start, timestamp_lt: $end }) {
      ...blockFields
    }
  }
  ${blockFieldsQuery}
`;

export const factoryQuery = gql`
  query factoryQuery(
    $id: String! = "${FACTORY_ADDRESS}"
  ) {
    factory(id: $id) {
      id
      volumeUSD
    }
  }
`;

export const factoryTimeTravelQuery = gql`
  query factoryTimeTravelQuery(
    $id: String! = "${FACTORY_ADDRESS}"
    $block: Block_height!
  ) {
    factory(id: $id, block: $block) {
      id
      volumeUSD
    }
  }
`;

export const barQuery = gql`
  query barQuery($id: String! = "${BAR_ADDRESS}") {
    bar(id: $id) {
      id
      totalSupply
      ratio
      xJoeMinted
      xJoeBurned
      joeStaked
      joeStakedUSD
      joeHarvested
      joeHarvestedUSD
      xJoeAge
      xJoeAgeDestroyed
    }
  }
`;

// Tokens...
export const tokenFieldsQuery = gql`
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
  ${tokenFieldsQuery}
`;

export const bundleFields = gql`
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
  ${bundleFields}
`;

export const dayDataFieldsQuery = gql`
  fragment dayDataFields on DayData {
    id
    date
    volumeAVAX
    volumeUSD
    untrackedVolume
    liquidityAVAX
    liquidityUSD
    txCount
  }
`;

export const dayDatasQuery = gql`
  query dayDatasQuery($first: Int! = 1, $date: Int! = 0) {
    dayDatas(first: $first, orderBy: date, orderDirection: desc) {
      ...dayDataFields
    }
  }
  ${dayDataFieldsQuery}
`;

export const pairTokenFieldsQuery = gql`
  fragment pairTokenFields on Token {
    id
    name
    symbol
    totalSupply
    derivedAVAX
  }
`;

export const pairFieldsQuery = gql`
  fragment pairFields on Pair {
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
  ${pairTokenFieldsQuery}
`;

export const pairsQuery = gql`
  query pairsQuery(
    $first: Int! = 100
    $skip: Int! = 0
    $orderBy: String! = "reserveUSD"
    $orderDirection: String! = "desc"
    $dateAfter: Int! = 1622419200
  ) {
    pairs(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, dateAfter: $dateAfter) {
      ...pairFields
    }
  }
  ${pairFieldsQuery}
`;

export const pairQuery = gql`
  query pairQuery($dateAfter: Int! = 1622419200, $tokens: [String!] = []) {
    pairs(where: { token0_in: $tokens, token1_in: $tokens }) {
      ...pairFields
    }
  }
  ${pairFieldsQuery}
`;
