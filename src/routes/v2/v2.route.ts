import { Router } from 'express';
import PoolController from '@/controllers/v2/pool.controller';
import ExperimentalController from '@/controllers/v2/experimental.controller';
import FarmController from '@/controllers/v2/farm.controller';
import { Routes } from '@interfaces/routes.interface';

class TraderJoeRouter implements Routes {
  public router = Router();
  public path = '/v2';
  private poolController = new PoolController();
  private experimentalController = new ExperimentalController();
  private farmController = new FarmController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // new endpoints
    this.router.get('/pools', this.poolController.getPools);
    this.router.get('/pools/:token1/:token2', this.poolController.getPool);
    this.router.get('/farms', this.farmController.getFarms);
    this.router.get('/farms/:farmId', this.farmController.getFarm);
    // experimental
    this.router.get(`/tvl`, this.experimentalController.getTVL);
    this.router.get(`/apr`, this.experimentalController.getAPR);
    this.router.get(`/apy`, this.experimentalController.getAPY);
  }
}

export default TraderJoeRouter;
