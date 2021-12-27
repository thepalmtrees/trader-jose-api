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
      const apr = await this.financeService.getAPR();

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

  public getNftHat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hatId = req.params.id;
      const nftHat = this.financeService.getNftHat(hatId);

      res.status(200).json(nftHat);
    } catch (error) {
      next(error);
    }
  };

  public getMaxSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const maxSupply = await this.financeService.getMaxSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(maxSupply);
    } catch (error) {
      next(error);
    }
  };

  public getPriceUSD = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenAddress = req.params.tokenAddress;
      const priceUSD = (await this.financeService.getPriceUSD(tokenAddress)).toString();
      res.status(200).setHeader('content-type', 'text/plain').send(priceUSD);
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

  public getLendingTotalSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalSupply = await this.financeService.getLendingTotalSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalSupply);
    } catch (error) {
      next(error);
    }
  };

  public getLendingTotalBorrow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lendingTotalBorrow = await this.financeService.getLendingTotalBorrow();

      res.status(200).setHeader('content-type', 'text/plain').send(lendingTotalBorrow);
    } catch (error) {
      next(error);
    }
  };

  public getPools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const poolsPage = await this.financeService.getPools(offset, limit);
      console.log(poolsPage);

      res.status(200).json(poolsPage);
    } catch (error) {
      next(error);
    }
  };
}

export default FinanceController;
