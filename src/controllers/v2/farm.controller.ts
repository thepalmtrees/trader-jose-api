import { NextFunction, Request, Response } from 'express';
import FarmService from '@/services/farm.service';
import { Farm, FarmsPage } from '@/interfaces/types';

class FarmController {
  private farmService = new FarmService();

  public getFarms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const farmsPage: FarmsPage = await this.farmService.getFarms(offset, limit);

      res.status(200).json(farmsPage);
    } catch (error) {
      next(error);
    }
  };

  public getFarm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmId = req.params.farmId as string;

      const farm: Farm = await this.farmService.getFarm(farmId);

      res.status(200).json(farm);
    } catch (error) {
      next(error);
    }
  };
}

export default FarmController;
