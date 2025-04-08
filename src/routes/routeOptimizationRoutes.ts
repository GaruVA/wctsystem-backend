import express from 'express';
import {
  generateOptimizedRoute,
  generateCustomRoute,
  adjustExistingRoute,
  createRouteAssignment
} from '../controllers/routeOptimizationController';
import { auth, requireRole } from '../middleware/auth';

const router = express.Router();

// Get optimized route for an area with parameters (threshold, include, exclude)
router.get('/area/:areaId', auth, requireRole('admin'), generateOptimizedRoute);

// Generate custom route with specific coordinates
router.post('/custom', auth, requireRole('admin'), generateCustomRoute);

// Adjust an existing route by reordering, adding, or removing bins
router.post('/adjust-existing', auth, requireRole('admin'), adjustExistingRoute);

// Create a route and assign it to a collector (specialized endpoint for route planning)
router.post('/assign', auth, requireRole('admin'), createRouteAssignment);

export default router;