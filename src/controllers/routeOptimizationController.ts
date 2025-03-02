import { Request, Response } from 'express';
import * as routeOptimizationService from '../services/routeOptimizationService';

interface RouteOptimizationRequest {
  start: [number, number]; // [longitude, latitude]
  stops: Array<[number, number]>; // Array of [longitude, latitude]
  end: [number, number]; // [longitude, latitude] 
}

/**
 * Optimize a collection route
 */
export const optimizeCollectionRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, stops, end } = req.body as RouteOptimizationRequest;
    
    // Validate inputs
    if (!start || !stops || !end || !Array.isArray(stops) || stops.length === 0) {
      res.status(400).json({
        message: 'Invalid inputs. Need start, stops, and end coordinates'
      });
      return;
    }
    
    // Call the optimization service
    const optimizedRoute = await routeOptimizationService.optimizeRoute(start, stops, end);
    
    res.json(optimizedRoute);
  } catch (error: any) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      message: 'Failed to optimize route',
      error: error.message
    });
  }
};
