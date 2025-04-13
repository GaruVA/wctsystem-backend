import { Router } from 'express';
import { 
  getUnreadAlerts, 
  markAsRead, 
  markAllAsRead
} from '../controllers/alertController';
import { auth } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(auth);

// GET /api/alerts/unread - Get all unread alerts
router.get('/unread', getUnreadAlerts);

// PATCH /api/alerts/:id/read - Mark a single alert as read
router.patch('/:id/read', markAsRead);

// PATCH /api/alerts/mark-all-read - Mark all alerts as read
router.patch('/mark-all-read', markAllAsRead);

export default router;