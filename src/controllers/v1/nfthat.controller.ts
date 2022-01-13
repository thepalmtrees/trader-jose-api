import { NextFunction, Request, Response } from 'express';
import LegacyJoeService from '@/services/legacyjoe.service';

class NftHatController {
  private legacyJoeService = new LegacyJoeService();

  public getNftHat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hatId = req.params.id;
      const nftHat = this.legacyJoeService.getNftHat(hatId);

      res.status(200).json(nftHat);
    } catch (error) {
      next(error);
    }
  };
}

export default NftHatController;
