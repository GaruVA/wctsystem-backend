import express from 'express';
import { addArea, removeArea, updateArea, getAreas } from '../controllers/areaController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

router.post('/add', auth, requireRole('admin'), addArea);
router.delete('/:areaId', auth, requireRole('admin'), removeArea);
router.put('/update', auth, requireRole('admin'), updateArea);
router.get('/', auth, requireRole('admin'), getAreas); // Add this line

export default router;