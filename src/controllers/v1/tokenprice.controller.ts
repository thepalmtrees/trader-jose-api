import { NextFunction, Request, Response } from 'express';
import PriceService from '@/services/price.service';

class TokenPriceController {
  private priceService = new PriceService();

  public getPriceAVAX = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenAddress = req.params.tokenAddress;
      const priceAVAX = await this.priceService.getPriceAVAX(tokenAddress);
      res
        .status(200)
        .setHeader('content-type', 'text/plain')
        .send((priceAVAX * Math.pow(10, 18)).toString());
    } catch (error) {
      next(error);
    }
  };

  public getPriceUSD = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenAddress = req.params.tokenAddress;
      const priceUSD = await this.priceService.getPriceUSD(tokenAddress);
      res
        .status(200)
        .setHeader('content-type', 'text/plain')
        .send((priceUSD * Math.pow(10, 18)).toString());
    } catch (error) {
      next(error);
    }
  };
}

export default TokenPriceController;
