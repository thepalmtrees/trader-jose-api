import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class SupplyController {
  public financeService = new FinanceService();

  public getMaxSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const maxSupply = await this.financeService.getMaxSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(maxSupply);
    } catch (error) {
      next(error);
    }
  };

  public getTotalSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalSupply = await this.financeService.getTotalSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(totalSupply);
    } catch (error) {
      next(error);
    }
  };

  public getCirculatingSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const circulatingSupply = await this.financeService.getCirculatingSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(circulatingSupply);
    } catch (error) {
      next(error);
    }
  };

  public getCirculatingSupplyAdjusted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adjustedSupply = await this.financeService.getCirculatingSupplyAdjusted();

      res.status(200).setHeader('content-type', 'text/plain').send(adjustedSupply);
    } catch (error) {
      next(error);
    }
  };
}

export default SupplyController;
