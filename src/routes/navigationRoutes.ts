import { Router } from 'express';
import { NavigationController } from '../controllers/navigationController';
import { auth, requireRole } from '../middleware/auth';

const router = Router();

// All routes require collector authentication
router.use(auth, requireRole('collector'));

// Get directions
router.post('/directions', NavigationController.getDirections);

// Get remaining distance
router.post('/distance', NavigationController.getRemainingDistance);

// Update current location
router.post('/location', NavigationController.updateLocation);

// Get location history
router.get('/location/history', NavigationController.getLocationHistory);

export default router;