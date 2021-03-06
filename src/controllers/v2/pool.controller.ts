import { NextFunction, Request, Response } from 'express';
import PoolService from '@/services/pool.service';
import { Pool, PoolsPage } from '@/interfaces/types';

class PoolController {
  private poolService = new PoolService();

  public getPoolsFromTheGraph = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const poolsPage: PoolsPage = await this.poolService.getPoolsFromTheGraph(offset, limit);

      res.status(200).json(poolsPage);
    } catch (error) {
      next(error);
    }
  };

  public getPoolFromTheGraph = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token1Address = req.params.token1 as string;
      const token2Address = req.params.token2 as string;

      const pool: Pool = await this.poolService.getPoolFromTheGraph(token1Address, token2Address);

      res.status(200).json(pool);
    } catch (error) {
      next(error);
    }
  };

  public getPools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const poolsPage: PoolsPage = await this.poolService.getPoolsFromCovalent(offset, limit);

      res.status(200).json(poolsPage);
    } catch (error) {
      next(error);
    }
  };

  public getPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token1Address = req.params.token1 as string;
      const token2Address = req.params.token2 as string;

      const pool: Pool = await this.poolService.getPoolFromCovalent(token1Address, token2Address);

      res.status(200).json(pool);
    } catch (error) {
      next(error);
    }
  };

  public getPoolsTVL = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tvl = await this.poolService.getPoolsTVL();

      res.status(200).json({ tvl });
    } catch (error) {
      next(error);
    }
  };
}

export default PoolController;
