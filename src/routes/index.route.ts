import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';

class IndexRoute implements Routes {
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/', (req, res, next) => {
      res.status(200).send('Hello /');
    });
    this.router.get('/status', (req, res, next) => {
      res.status(200).json({ status: 'OK' });
    });
  }
}

export default IndexRoute;
