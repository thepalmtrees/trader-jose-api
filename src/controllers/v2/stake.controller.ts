import { NextFunction, Request, Response } from 'express';
import StakeService from '@/services/stake.service';

class StakeController {
  private stakeService = new StakeService();

  public getStakeMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalStakedUSD = await this.stakeService.getTotalStakedUSD();
      const oneDayFees = await this.stakeService.getOneDayFees();
      const apr24h = await this.stakeService.getAPR(totalStakedUSD, oneDayFees);
      const apy24h = await this.stakeService.getAPY(apr24h);
      const apr7d = 0;
      const apyAverage = 0;

      res.status(200).json({ totalStakedUSD, oneDayFees, apr24h, apy24h, apyAverage, apr7d });
    } catch (error) {
      next(error);
    }
  };
}

export default StakeController;
