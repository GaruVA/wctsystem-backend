import express from 'express';
import { 
  getIssues, 
  createIssue, 
  updateIssueStatus,
  uploadImage,
  upload
} from '../controllers/issueController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', createIssue);
// Image upload endpoint - no authentication required to allow mobile uploads
router.post('/uploads/images', upload.single('image'), uploadImage);

// Protected routes
router.get('/', auth, requireRole('admin'), getIssues);
router.patch('/:issueId/status', auth, requireRole('admin'), updateIssueStatus);

export default router;