import express from 'express';
import { optimizeCollectionRoute, optimizeBinOrder, generateRoutePolyline, getOptimizedRouteForArea, adjustExistingRoute } from '../controllers/routeOptimizationController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Full route optimization (combined approach)
router.post('/optimize', auth, requireRole('collector'), optimizeCollectionRoute);

// Separate endpoints for bin order optimization and route polyline generation
router.post('/optimize-bin-order', auth, requireRole('collector'), optimizeBinOrder);
router.post('/generate-polyline', auth, requireRole('collector'), generateRoutePolyline);

// Area-specific route optimization
router.get('/area/:areaId', auth, getOptimizedRouteForArea);

// Route adjustment endpoint
router.post('/adjust-existing', auth, requireRole('admin'), adjustExistingRoute);

export default router;