process.env['NODE_CONFIG_DIR'] = __dirname + '/configs';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from 'config';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Routes } from '@interfaces/routes.interface';
import errorMiddleware from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import Moralis from 'moralis/node';
import fs from 'fs';

class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor(routes: Routes[]) {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.env = process.env.NODE_ENV || 'development';

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
    this.initializeMoralis();
  }

  public listen() {
    if (this.env === 'production') {
      this.app.listen('/tmp/nginx.socket', () => {
        logger.info(`=================================`);
        logger.info(`======= ENV: ${this.env} =======`);
        logger.info(`🚀 App listening on /tmp/nginx.socket`);
        logger.info(`=================================`);
        fs.openSync('/tmp/app-initialized', 'w');
      });
    } else {
      this.app.listen(this.port, () => {
        logger.info(`=================================`);
        logger.info(`======= ENV: ${this.env} =======`);
        logger.info(`🚀 App listening on the port ${this.port}`);
        logger.info(`=================================`);
      });
    }
  }

  public getServer() {
    return this.app;
  }

  private initializeMoralis() {
    Moralis.start({
      serverUrl: process.env.MORALIS_SERVER_URL,
      appId: process.env.MORALIS_APP_ID,
      masterKey: process.env.MORALIS_MASTER_KEY,
    });
  }

  private initializeMiddlewares() {
    this.app.use(morgan(config.get('log.format'), { stream }));
    this.app.use(cors({ origin: config.get('cors.origin'), credentials: config.get('cors.credentials') }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use(route.path, route.router);
    });
  }

  private initializeSwagger() {
    const options: swaggerJSDoc.OAS3Options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Trader Joe API',
          description: 'Trader Joe API',
          version: '1.0.0',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
