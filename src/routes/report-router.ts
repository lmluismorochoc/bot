import express, { NextFunction, Request, Response } from 'express';
import ReportApiController from '../controllers/report-controller';

const reportRouter = express.Router();
const controller = new ReportApiController();

reportRouter.post('/deuda_ci', (req, res, next) =>
  controller.testClaro(req, res).catch(next),
);
reportRouter.get('/keep_alive', (req, res, next) =>
  controller.keepAlive(req, res).catch(next),
);

export default reportRouter;
