import express from 'express';
import { 
  getIssues, 
  createIssue, 
  updateIssueStatus, 
  getIssuesNearby,
  getIssuesByFilter,
  getIssueSummary,
  getIssueById,
  getIssuesByBin,
  getIssueReportData
} from '../controllers/issueController';
import { auth, requireRole } from '../middleware/auth'; // Fixed import of auth middleware

const router = express.Router();

// Public routes
router.get('/nearby', getIssuesNearby);

// Protected routes
router.get('/', auth, requireRole('admin'), getIssues);
router.post('/', createIssue);
router.patch('/:issueId/status', auth, requireRole('admin'), updateIssueStatus);

// MapScreen ReportSection routes
router.get('/filter', getIssuesByFilter);
router.get('/summary', getIssueSummary);
router.get('/report-data', getIssueReportData);
router.get('/:issueId', getIssueById);
router.get('/bin/:binId', getIssuesByBin);

export default router;