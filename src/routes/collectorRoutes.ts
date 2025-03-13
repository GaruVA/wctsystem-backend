import express from 'express';
import { loginCollector, createCollector, getCollectorArea, getLocation, updateLocation, addCollector, removeCollector, assignCollectorToArea } from '../controllers/collectorController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.post('/login', loginCollector);
router.post('/create', auth, requireRole('admin'), createCollector);
router.get('/area', auth, requireRole('collector'), getCollectorArea);

// Location routes
router.get('/location', auth, requireRole('collector'), getLocation);
router.post('/location', auth, requireRole('collector'), updateLocation);

router.post('/add', auth, requireRole('admin'), addCollector);
router.delete('/:collectorId', auth, requireRole('admin'), removeCollector);
router.post('/assign', auth, requireRole('admin'), assignCollectorToArea);

export default router;