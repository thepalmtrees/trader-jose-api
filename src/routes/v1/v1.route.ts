import { Router } from 'express';
import PingController from '@/controllers/v1/ping.controller';
import SupplyController from '@/controllers/v1/supply.controller';
import LendingController from '@/controllers/v1/lending.controller';
import NftHatController from '@/controllers/v1/nfthat.controller';
import TokenPriceController from '@/controllers/v1/tokenprice.controller';
import { Routes } from '@interfaces/routes.interface';

class TraderJoeRouter implements Routes {
  public router = Router();
  public path = '';
  private pingController = new PingController();
  private supplyController = new SupplyController();
  private lendingController = new LendingController();
  private nftHatController = new NftHatController();
  private tokenPriceController = new TokenPriceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/', this.pingController.hello);
    this.router.get('/status', this.pingController.status);

    // backwards compatible with joe-api
    this.router.get('/supply/circulating', this.supplyController.getCirculatingSupply);
    this.router.get('/supply/circulating-adjusted', this.supplyController.getCirculatingSupplyAdjusted);
    this.router.get('/supply/total', this.supplyController.getTotalSupply);
    this.router.get('/supply/max', this.supplyController.getMaxSupply);
    this.router.get('/nft/hat', this.nftHatController.getNftHat);
    this.router.get('/nft/hat/:id', this.nftHatController.getNftHat);
    this.router.get('/priceavax/:tokenAddress', this.tokenPriceController.getPriceAVAX);
    this.router.get('/priceusd/:tokenAddress', this.tokenPriceController.getPriceUSD);
    this.router.get('/lending/supply', this.lendingController.getLendingTotalSupply);
    this.router.get('/lending/borrow', this.lendingController.getLendingTotalBorrow);
  }
}

export default TraderJoeRouter;
