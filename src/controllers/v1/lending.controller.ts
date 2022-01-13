import { NextFunction, Request, Response } from 'express';
import LegacyJoeService from '@/services/legacyjoe.service';

class LendingController {
  private legacyJoeService = new LegacyJoeService();

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
}

export default LendingController;
