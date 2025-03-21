import express from 'express';
import { 
    loginCollector, 
    createCollector, 
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

router.post('/login', loginCollector);
router.post('/create', auth, requireRole('admin'), createCollector);
router.get('/area', auth, requireRole('collector'), getCollectorArea);

// Location routes
router.get('/location', auth, requireRole('collector'), getLocation);
router.post('/location', auth, requireRole('collector'), updateLocation);

router.post('/assign', auth, requireRole('admin'), assignCollectorToArea);

// CRUD routes for collectors
router.get('/', auth, requireRole('admin'), getAllCollectors);
router.get('/:collectorId', auth, requireRole('admin'), getCollectorById);
router.post('/add', auth, requireRole('admin'), addCollector);
router.put('/:collectorId', auth, requireRole('admin'), updateCollector);
router.delete('/:collectorId', auth, requireRole('admin'), deleteCollector);

export default router;