
import express from 'express';
import { loginCollector, createCollector } from '../controllers/collectorController';

const router = express.Router();

router.post('/login', loginCollector);
router.post('/create', createCollector);

export default router;