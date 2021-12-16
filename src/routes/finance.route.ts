import { Router } from 'express';
import FinanceController from '@/controllers/finance.controller';
import { Routes } from '@interfaces/routes.interface';

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
  }
}

export default FinanceRoute;
