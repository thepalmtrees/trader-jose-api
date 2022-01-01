import gql from 'graphql-tag';

export const blockQuery = gql`
  query blockQuery($start: Int!, $end: Int!) {
    blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: { timestamp_gt: $start, timestamp_lt: $end }) {
      id
      number
      timestamp
    }
  }
`;
