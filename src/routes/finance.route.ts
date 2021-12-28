import { Router } from 'express';
import { Request, Response } from 'express';
import FinanceController from '@/controllers/finance.controller';
import { Routes } from '@interfaces/routes.interface';

async function methodNotImplemented(req: Request, res: Response): Promise<void> {
  res.status(501).json({ message: 'Method not implemented' });
}
class FinanceRoute implements Routes {
  public router = Router();
  public financeController = new FinanceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`/tvl`, this.financeController.getTVL);
    this.router.get(`/apr`, this.financeController.getAPR);
    this.router.get(`/apy`, this.financeController.getAPY);

    this.router.get('/supply/circulating', this.financeController.getCirculatingSupply);
    this.router.get('/supply/circulating-adjusted', this.financeController.getCirculatingSupplyAdjusted);
    this.router.get('/supply/total', this.financeController.getTotalSupply);
    this.router.get('/supply/max', this.financeController.getMaxSupply);
    this.router.get('/nft/hat', methodNotImplemented);
    this.router.get('/nft/hat/:id', methodNotImplemented);
    this.router.get('/priceavax/:tokenAddress', methodNotImplemented);
    this.router.get('/priceusd/:tokenAddress', this.financeController.getPriceUSD);
    this.router.get('/lending/supply', this.financeController.getLendingTotalSupply);
    this.router.get('/lending/borrow', this.financeController.getLendingTotalBorrow);

    this.router.get('/pools', this.financeController.getPools);
    this.router.get('/pools/:token1/:token2', this.financeController.getPool);
  }
}

export default FinanceRoute;
