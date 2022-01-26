import { NextFunction, Request, Response } from 'express';
import LegacyJoeService from '@/services/legacyjoe.service';
import CachedLendingService from '@/services/cached.lending.service';

class LendingController {
  private legacyJoeService = new LegacyJoeService();
  private cachedLendingService = new CachedLendingService();

  public getLendingTotalSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalSupply = await this.legacyJoeService.getLendingTotalSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalSupply);
    } catch (error) {
      next(error);
    }
  };

  public getLendingTotalBorrow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalBorrow = await this.legacyJoeService.getLendingTotalBorrow();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalBorrow);
    } catch (error) {
      next(error);
    }
  };

  public getLendingMarkets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingMarkets = await this.cachedLendingService.getLendingMarkets();

      res.status(200).setHeader('content-type', 'application/json').send(lendingMarkets);
    } catch (error) {
      next(error);
    }
  };

  public getLendingMarket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const marketAddress = req.params.marketAddress;
      const lendingMarkets = await this.cachedLendingService.getLendingMarket(marketAddress.toLowerCase());

      res.status(200).setHeader('content-type', 'application/json').send(lendingMarkets);
    } catch (error) {
      next(error);
    }
  };
}

export default LendingController;
