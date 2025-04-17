import express, { Router } from 'express';
import { 
  updateBin, 
  getBins, 
  createBin, 
  getBinDetails, 
  reportIssue, 
  assignBinToArea, 
  collectBin,
  updateBinFillLevel,
  directUpdateBin,
  getBinsByWasteType,
  updateBinWasteType,
  getBinsByStatus,
  updateBinStatus
} from '../controllers/binController';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Existing routes
router.post('/create', createBin);
router.post('/update', updateBin);
router.get('/', getBins);

// Waste type related routes
router.get('/waste-type/:wasteType', getBinsByWasteType);
router.put('/:binId/waste-type', updateBinWasteType);

// Status related routes
router.get('/status/:status', getBinsByStatus);
router.put('/:binId/status', updateBinStatus);

// New endpoints
router.get('/:binId', getBinDetails);
router.post('/:binId/report-issue', reportIssue);
router.post('/:binId/collect', auth, requireRole('collector'), collectBin);
router.put('/:binId/update-fill-level', updateBinFillLevel);
router.post('/direct-update', directUpdateBin);

router.post('/assign', auth, requireRole('admin'), assignBinToArea);

export default router;