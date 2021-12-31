import { Request, Response } from 'express';

class PingController {
  public hello = async (req: Request, res: Response): Promise<void> => {
    res.status(200).send('Hello /');
  };

  public status = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ status: 'OK' });
  };
}

export default PingController;
