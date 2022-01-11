import { MASTERCHEFV2_ADDRESS, TRADER_JOE_INITIAL_DATE } from '@/configs';
import gql from 'graphql-tag';

const farmFieldsFragment = gql`
  fragment farmFields on Pool {
    id
    pair
    allocPoint
    lastRewardTimestamp
    accJoePerShare
    jlpBalance
    balance
    userCount
    owner {
      id
      joePerSec
      totalAllocPoint
    }
    timestamp
  }
`;

export const farmsQuery = gql`
  query farmsQuery($first: Int! = 500, $skip: Int! = 0, $orderBy: String! = "timestamp", $orderDirection: String! = "desc") {
    pools(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      ...farmFields
    }
  }
  ${farmFieldsFragment}
`;

export const farmQuery = gql`
  query farmQuery($dateAfter: Int! = ${TRADER_JOE_INITIAL_DATE}, $pair: String!) {
    pools(where: { pair: $pair }) {
      ...farmFields
    }
  }
  ${farmFieldsFragment}
`;

export const masterchefMetricsQuery = gql`
  query masterchefMetricsQuery($dateAfter: Int! = ${TRADER_JOE_INITIAL_DATE}, $id: String! = "${MASTERCHEFV2_ADDRESS}") {
    masterChef(id: $id) {
      id
      joePerSec
      totalAllocPoint
    }
  }
`;
