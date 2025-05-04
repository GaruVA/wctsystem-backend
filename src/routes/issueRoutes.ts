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
import  authenticate from '../middleware/auth'; // Import authentication middleware

const router = express.Router();

// Public routes
router.get('/nearby', getIssuesNearby);

// Protected routes
router.get('/', authenticate, getIssues);
router.post('/', authenticate, createIssue);
router.patch('/:issueId/status', authenticate, updateIssueStatus);

// MapScreen ReportSection routes
router.get('/filter', authenticate, getIssuesByFilter);
router.get('/summary', authenticate, getIssueSummary);
router.get('/report-data', authenticate, getIssueReportData);
router.get('/:issueId', authenticate, getIssueById);
router.get('/bin/:binId', authenticate, getIssuesByBin);

export default router;