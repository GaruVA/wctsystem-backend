import express from 'express';
import { 
  getIssues, 
  createIssue, 
  updateIssueStatus, 
  getIssuesNearby 
} from '../controllers/issueController';
import { auth } from '../middleware/auth'; // Import authentication middleware

const router = express.Router();

// Public routes
router.get('/nearby', getIssuesNearby);

// Protected routes
router.get('/', auth, getIssues);
router.post('/', auth, createIssue);
router.patch('/:issueId/status', auth, updateIssueStatus);

export default router;