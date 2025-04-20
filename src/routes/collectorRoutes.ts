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
    deleteCollector,
    updateCollectorStatus,
    getActiveCollectors,
    updateCollectorEfficiency,
    getCollectorEfficiencyStats,
    getCollectorSchedules,
    updateCollectorScheduleStatus
} from '../controllers/collectorController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Authentication
router.post('/login', loginCollector);

// Collector-specific routes
router.get('/area', auth, requireRole('collector'), getCollectorArea);
router.get('/location', auth, requireRole('collector'), getLocation);
router.post('/location', auth, requireRole('collector'), updateLocation);
router.get('/schedules', auth, requireRole('collector'), getCollectorSchedules);
// New route for collectors to update their schedule status
router.put('/schedules/:scheduleId/status', auth, requireRole('collector'), updateCollectorScheduleStatus);

// Admin management routes
router.post('/assign', auth, requireRole('admin'), assignCollectorToArea);
router.get('/', auth, requireRole('admin'), getAllCollectors);
router.get('/active', auth, requireRole('admin'), getActiveCollectors);
router.get('/efficiency/stats', auth, requireRole('admin'), getCollectorEfficiencyStats);
router.post('/', auth, requireRole('admin'), addCollector);  
router.get('/:collectorId', auth, requireRole('admin'), getCollectorById);
router.put('/:collectorId', auth, requireRole('admin'), updateCollector);
router.delete('/:collectorId', auth, requireRole('admin'), deleteCollector);
router.patch('/:collectorId/status', auth, requireRole('admin'), updateCollectorStatus);
router.patch('/:collectorId/efficiency', auth, requireRole('admin'), updateCollectorEfficiency);

export default router;