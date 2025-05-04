import express from 'express';
import { 
  getIssues, 
  createIssue, 
  updateIssueStatus
} from '../controllers/issueController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', createIssue);

// Protected routes
router.get('/', auth, requireRole('admin'), getIssues);
router.patch('/:issueId/status', auth, requireRole('admin'), updateIssueStatus);

export default router;