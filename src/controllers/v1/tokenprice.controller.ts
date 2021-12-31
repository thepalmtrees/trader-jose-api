import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class TokenPriceController {
  public financeService = new FinanceService();

  public getPriceAVAX = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenAddress = req.params.tokenAddress;
      const priceAVAX = await this.financeService.getPriceAVAX(tokenAddress);
      res.status(200).setHeader('content-type', 'text/plain').send(priceAVAX);
    } catch (error) {
      next(error);
    }
  };

  public getPriceUSD = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenAddress = req.params.tokenAddress;
      const priceUSD = await this.financeService.getPriceUSD(tokenAddress);
      res.status(200).setHeader('content-type', 'text/plain').send(priceUSD);
    } catch (error) {
      next(error);
    }
  };
}

export default TokenPriceController;
