import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class FarmController {
  public financeService = new FinanceService();

  public getFarms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const farmsPage = await this.financeService.getFarms(offset, limit);

      res.status(200).json(farmsPage);
    } catch (error) {
      next(error);
    }
  };
}

export default FarmController;
