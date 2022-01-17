import { NextFunction, Request, Response } from 'express';
import FarmService from '@/services/farm.service';
import { Farm, FarmsPage } from '@/interfaces/types';

class FarmController {
  private farmService = new FarmService();

  public getFarmsFromTheGraph = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const farmsPage: FarmsPage = await this.farmService.getFarmsFromTheGraph(offset, limit);

      res.status(200).json(farmsPage);
    } catch (error) {
      next(error);
    }
  };

  public getFarmFromTheGraph = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmAddress = req.params.farmAddress as string;
      const masterchef = req.params.masterchef as string;

      const farm: Farm = await this.farmService.getFarmFromTheGraph(farmAddress, masterchef);

      res.status(200).json(farm);
    } catch (error) {
      next(error);
    }
  };

  public getFarms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const farmsPage: FarmsPage = await this.farmService.getFarmsFromYieldMonitor(offset, limit);

      res.status(200).json(farmsPage);
    } catch (error) {
      next(error);
    }
  };

  public getFarm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmNumber = req.params.farmNumber as string;

      const farm: Farm = await this.farmService.getFarmFromYieldMonitor(farmNumber);

      res.status(200).json(farm);
    } catch (error) {
      next(error);
    }
  };
}

export default FarmController;
