import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class PoolController {
  public financeService = new FinanceService();

  public getPools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const poolsPage = await this.financeService.getPools(offset, limit);

      res.status(200).json(poolsPage);
    } catch (error) {
      next(error);
    }
  };

  public getPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token1Address = req.params.token1 as string;
      const token2Address = req.params.token2 as string;

      const pool = await this.financeService.getPool(token1Address, token2Address);

      res.status(200).json(pool);
    } catch (error) {
      next(error);
    }
  };
}

export default PoolController;
