import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class FinanceController {
  public financeService = new FinanceService();

  public getTVL = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tvl = await this.financeService.getTVL();

      res.status(200).json({ tvl });
    } catch (error) {
      next(error);
    }
  };

  public getAPR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apr = await this.financeService.getAPY();

      res.status(200).json({ apr });
    } catch (error) {
      next(error);
    }
  };

  public getAPY = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apr = await this.financeService.getAPY();

      res.status(200).json({ apr });
    } catch (error) {
      next(error);
    }
  };
}

export default FinanceController;
