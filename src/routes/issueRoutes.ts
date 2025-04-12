import express from 'express';
import { getIssues } from '../controllers/issueController';

const router = express.Router();

// Route to fetch all issues
router.get('/', getIssues);

export default router;