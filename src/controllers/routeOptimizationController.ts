import { Request, Response } from 'express';
import * as routeOptimizationService from '../services/routeOptimizationService';

interface RouteOptimizationRequest {
  start: [number, number]; // [longitude, latitude]
  stops: Array<[number, number]>; // Array of [longitude, latitude]
  end: [number, number]; // [longitude, latitude] 
}

/**
 * Optimize a collection route (full process)
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

/**
 * Optimize just the bin collection order (without generating route polyline)
 */
export const optimizeBinOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, stops, end } = req.body as RouteOptimizationRequest;
    
    // Validate inputs
    if (!start || !stops || !end || !Array.isArray(stops) || stops.length === 0) {
      res.status(400).json({
        message: 'Invalid inputs. Need start, stops, and end coordinates'
      });
      return;
    }
    
    // Call the bin order optimization service only
    const optimizedOrder = await routeOptimizationService.optimizeBinOrder(start, stops, end);
    
    // Return only the optimized bin order information
    res.json({
      optimizedStops: optimizedOrder.optimizedStops,
      stops_sequence: optimizedOrder.stops_sequence
    });
  } catch (error: any) {
    console.error('Bin order optimization error:', error);
    res.status(500).json({
      message: 'Failed to optimize bin order',
      error: error.message
    });
  }
};

/**
 * Generate route polyline from ordered waypoints
 */
export const generateRoutePolyline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waypoints, stops_sequence } = req.body;
    
    // Validate inputs
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      res.status(400).json({
        message: 'Invalid inputs. Need at least 2 waypoints'
      });
      return;
    }
    
    // Call the polyline generation service
    const routePolyline = await routeOptimizationService.generateRoutePolyline(
      waypoints, 
      stops_sequence || []
    );
    
    res.json(routePolyline);
  } catch (error: any) {
    console.error('Route polyline generation error:', error);
    res.status(500).json({
      message: 'Failed to generate route polyline',
      error: error.message
    });
  }
};
