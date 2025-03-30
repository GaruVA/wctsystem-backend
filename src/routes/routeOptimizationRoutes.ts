import express from 'express';
import { optimizeCollectionRoute, optimizeBinOrder, generateRoutePolyline, getOptimizedRoute } from '../controllers/routeOptimizationController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Full route optimization (combined approach)
router.post('/optimize', auth, requireRole('collector'), optimizeCollectionRoute);

// Separate endpoints for bin order optimization and route polyline generation
router.post('/optimize-bin-order', auth, requireRole('collector'), optimizeBinOrder);
router.post('/generate-polyline', auth, requireRole('collector'), generateRoutePolyline);

// Area-specific route optimization (this was missing)
router.get('/area/:areaId', auth, getOptimizedRoute);

export default router;