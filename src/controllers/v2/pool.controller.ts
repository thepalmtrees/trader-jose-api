import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';
import PoolService from '@/services/pool.service';

class PoolController {
  public financeService = new FinanceService();
  public poolService = new PoolService();

  public getPools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const source = req.query.source as string;

      let poolsPage;
      if (source === 'thegraph') {
        poolsPage = await this.financeService.getPools(offset, limit);
      } else {
        poolsPage = await this.poolService.getPools(offset, limit);
      }

      res.status(200).json(poolsPage);
    } catch (error) {
      next(error);
    }
  };

  public getPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token1Address = req.params.token1 as string;
      const token2Address = req.params.token2 as string;
      const source = req.query.source as string;

      let pool;
      if (source === 'thegraph') {
        pool = await this.financeService.getPool(token1Address, token2Address);
      } else {
        pool = await this.poolService.getPool(token1Address, token2Address);
      }

      res.status(200).json(pool);
    } catch (error) {
      next(error);
    }
  };
}

export default PoolController;
