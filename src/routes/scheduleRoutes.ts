import express from 'express';
import { 
  createSchedule, 
  getSchedules, 
  getScheduleById, 
  updateSchedule, 
  deleteSchedule,
  assignCollector,
  getWeeklyScheduleOverview,
  autoGenerateSchedule
} from '../controllers/scheduleController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Route for creating schedules
router.post('/', auth, requireRole('admin'), createSchedule);

// Route for getting all schedules with filtering
router.get('/', auth, getSchedules);

// Route for getting weekly schedule overview
router.get('/weekly-overview', auth, getWeeklyScheduleOverview);

// Route for getting a single schedule by ID
router.get('/:id', auth, getScheduleById);

// Route for updating a schedule
router.put('/:id', auth, requireRole('admin'), updateSchedule);

// Route for deleting a schedule
router.delete('/:id', auth, requireRole('admin'), deleteSchedule);

// Route for assigning a collector to a schedule
router.post('/:scheduleId/assign', auth, requireRole('admin'), assignCollector);

// Auto-generate schedule route - system use for alerts triggering
router.post('/auto-generate', auth, requireRole('admin'), autoGenerateSchedule);

export default router;