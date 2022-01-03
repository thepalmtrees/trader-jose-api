import { TRADER_JOE_INITIAL_DATE } from '@/configs';
import gql from 'graphql-tag';

const farmFieldsFragment = gql`
  fragment farmFields on Pool {
    id
    pair
    allocPoint
    lastRewardTimestamp
    accJoePerShare
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
