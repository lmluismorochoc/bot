import express from 'express';
import BotController from '../controllers/bot-controller';

const botRouter = express.Router();
const controller = new BotController();

botRouter.post('/message_handler', (req, res, next) =>
  controller.handlerFinder(req, res).catch(next),
);
export default botRouter;
