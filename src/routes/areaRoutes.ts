import express from 'express';
import { addArea, removeArea, updateArea, getAreas, getAllAreasWithBins } from '../controllers/areaController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.post('/add', auth, requireRole('admin'), addArea);
router.delete('/:areaId', auth, requireRole('admin'), removeArea);
router.put('/update', auth, requireRole('admin'), updateArea);
router.get('/', auth, requireRole('admin'), getAreas); 
router.get('/with-bins', auth, getAllAreasWithBins); // New route that doesn't require admin role

export default router;