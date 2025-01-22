import express from 'express';
import { updateBin, getBins } from '../controllers/binController';

const router = express.Router();

// Route to update bin data
router.post('/update', updateBin);

// Route to fetch all bins
router.get('/', getBins);

export default router;