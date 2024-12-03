import express from 'express';
import botRouter from './bot-router';
import ReportRouter from './report-router';

const router = express.Router();

router.get('/status', (req, res) => res.send('OK'));
router.use('/bot', botRouter);
router.use('/report', ReportRouter);

export default router;
