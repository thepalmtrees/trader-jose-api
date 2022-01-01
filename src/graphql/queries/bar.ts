import gql from 'graphql-tag';
import { BAR_ADDRESS } from '../../configs/index';

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
