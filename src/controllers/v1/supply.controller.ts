import { NextFunction, Request, Response } from 'express';
import LegacyJoeService from '@/services/legacyjoe.service';

class SupplyController {
  private legacyJoeService = new LegacyJoeService();

  public getMaxSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const maxSupply = await this.legacyJoeService.getMaxSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(maxSupply);
    } catch (error) {
      next(error);
    }
  };

  public getTotalSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalSupply = await this.legacyJoeService.getTotalSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(totalSupply);
    } catch (error) {
      next(error);
    }
  };

  public getCirculatingSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const circulatingSupply = await this.legacyJoeService.getCirculatingSupply();

      res.status(200).setHeader('content-type', 'text/plain').send(circulatingSupply);
    } catch (error) {
      next(error);
    }
  };

  public getCirculatingSupplyAdjusted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adjustedSupply = await this.legacyJoeService.getCirculatingSupplyAdjusted();

      res.status(200).setHeader('content-type', 'text/plain').send(adjustedSupply);
    } catch (error) {
      next(error);
    }
  };
}

export default SupplyController;
