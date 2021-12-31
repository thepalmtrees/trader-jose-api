import { NextFunction, Request, Response } from 'express';
import FinanceService from '@/services/finance.service';

class NftHatController {
  public financeService = new FinanceService();

  public getNftHat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hatId = req.params.id;
      const nftHat = this.financeService.getNftHat(hatId);

      res.status(200).json(nftHat);
    } catch (error) {
      next(error);
    }
  };
}

export default NftHatController;
