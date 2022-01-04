import { Router } from 'express';
import PoolController from '@/controllers/v2/pool.controller';
import ExperimentalController from '@/controllers/v2/experimental.controller';
import FarmController from '@/controllers/v2/farm.controller';
import StakeController from '@/controllers/v2/stake.controller';
import { Routes } from '@interfaces/routes.interface';

class TraderJoeRouter implements Routes {
  public router = Router();
  public path = '/v2';
  private poolController = new PoolController();
  private experimentalController = new ExperimentalController();
  private farmController = new FarmController();
  private stakeController = new StakeController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // new endpoints
    this.router.get('/pools', this.poolController.getPools);
    this.router.get('/pools/:token1/:token2', this.poolController.getPool);
    this.router.get('/farms', this.farmController.getFarms);
    this.router.get('/farms/:farmId', this.farmController.getFarm);
    this.router.get('/stake', this.stakeController.getStakeMetrics);
    // experimental
    this.router.get(`/tvl`, this.experimentalController.getTVL);
  }
}

export default TraderJoeRouter;
