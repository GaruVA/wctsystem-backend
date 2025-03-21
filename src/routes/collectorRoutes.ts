import express from 'express';
import { 
    loginCollector, 
    getCollectorArea, 
    getLocation, 
    updateLocation, 
    addCollector, 
    assignCollectorToArea,
    getAllCollectors,
    getCollectorById,
    updateCollector,
    deleteCollector 
} from '../controllers/collectorController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Authentication
router.post('/login', loginCollector);

// Collector-specific routes
router.get('/area', auth, requireRole('collector'), getCollectorArea);
router.get('/location', auth, requireRole('collector'), getLocation);
router.post('/location', auth, requireRole('collector'), updateLocation);

// Admin management routes
router.post('/assign', auth, requireRole('admin'), assignCollectorToArea);
router.get('/', auth, requireRole('admin'), getAllCollectors);
router.post('/', auth, requireRole('admin'), addCollector);  // Changed from /add to /
router.get('/:collectorId', auth, requireRole('admin'), getCollectorById);
router.put('/:collectorId', auth, requireRole('admin'), updateCollector);
router.delete('/:collectorId', auth, requireRole('admin'), deleteCollector);

export default router;