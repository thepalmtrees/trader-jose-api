import { NextFunction, Request, Response } from 'express';
import FarmService from '@/services/farm.service';
import { Farm, FarmsPage } from '@/interfaces/types';

class FarmController {
  private farmService = new FarmService();

  public getFarms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const source = req.query.source as string;

      let farmsPage: FarmsPage;
      if (source === 'thegraph') {
        farmsPage = await this.farmService.getFarmsFromTheGraph(offset, limit);
      } else {
        farmsPage = await this.farmService.getFarmsFromYieldMonitor(offset, limit);
      }

      res.status(200).json(farmsPage);
    } catch (error) {
      next(error);
    }
  };

  public getFarm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmId = req.params.farmId as string;
      const source = req.query.source as string;

      let farm: Farm;
      if (source === 'thegraph') {
        farm = await this.farmService.getFarmFromTheGraph(farmId);
      } else {
        farm = await this.farmService.getFarmFromYieldMonitor(farmId);
      }

      res.status(200).json(farm);
    } catch (error) {
      next(error);
    }
  };
}

export default FarmController;
