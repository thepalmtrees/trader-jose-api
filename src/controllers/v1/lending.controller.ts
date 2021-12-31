import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class LendingController {
  public financeService = new FinanceService();

  public getLendingTotalSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalSupply = await this.financeService.getLendingTotalSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalSupply);
    } catch (error) {
      next(error);
    }
  };

  public getLendingTotalBorrow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalBorrow = await this.financeService.getLendingTotalBorrow();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalBorrow);
    } catch (error) {
      next(error);
    }
  };
}

export default LendingController;
