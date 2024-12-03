import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import compress from 'compression';
import helmet from 'helmet';
import loadConfig from './config/environments';
import rateLimit from 'express-rate-limit';
loadConfig();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message:
    'Too many accounts created from this IP, please try again after an 1 minute',
});

import router from './routes';
class App {
  public app: express.Application;
  constructor() {
    this.app = express();
    this.config();
  }
  private config(): void {
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(compress());
    this.app.use(helmet());
    this.app.use(limiter);
    this.app.use('/v1', router);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.use(
      (err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || 500;
        const message = err.message || 'Something went wrong';
        res.status(status).send({
          status,
          message,
        });
      },
    );
    this.app.listen(process.env.API_PORT || process.env.PORT, async () => {
      console.log('server started', process.env.API_PORT || process.env.PORT);
    });
  }
}
new App();
