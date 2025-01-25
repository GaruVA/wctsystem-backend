import express from 'express';
import { updateBin, getBins, createBin } from '../controllers/binController';

const router = express.Router();

// Add new route for bin creation
router.post('/create', createBin);

// Route to update bin data
router.post('/update', updateBin);

// Route to fetch all bins
router.get('/', getBins);

export default router;