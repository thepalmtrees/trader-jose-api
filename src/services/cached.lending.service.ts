import Moralis from 'moralis/node';
import { logger } from '@utils/logger';
import createError from 'http-errors';

class CachedLendingService {
  public async getLendingMarkets(): Promise<object> {
    const marketObject = Moralis.Object.extend('Market');
    const query = new Moralis.Query(marketObject);
    const results = await query.find();
    return results;
  }

  public async getLendingMarket(oneMarket: string): Promise<object> {
    logger.info(`Getting cached market metrics for ${oneMarket}`);
    const marketObject = Moralis.Object.extend('Market');
    const query = new Moralis.Query(marketObject);
    const results = await query.equalTo('address', oneMarket).find();
    if (results.length != 1) {
      throw new createError.NotFound(`Market ${oneMarket} not found`);
    }
    const result: any = results[0];
    return result;
  }
}

export default CachedLendingService;
