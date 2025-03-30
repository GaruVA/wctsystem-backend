import { Request, Response, NextFunction } from 'express';
import Bin, { IBin } from '../models/Bin';
import Area from '../models/Area';
import * as routeOptimizationService from '../services/routeOptimizationService';
import { Document, Types } from 'mongoose';

// Add a type definition that includes the _id property
type BinDocument = IBin & {
  _id: Types.ObjectId;
};

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

/**
 * Get optimized route for a specific area
 */
export const getOptimizedRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    
    // Parse query parameters
    const includeBinIds = req.query.include ? String(req.query.include).split(',') : [];
    const excludeBinIds = req.query.exclude ? String(req.query.exclude).split(',') : [];
    const fillLevelThreshold = req.query.threshold ? parseInt(String(req.query.threshold)) : 70;

    console.log(`Route optimization request for area ${areaId}`);
    console.log(`- Include bin IDs: ${includeBinIds.join(', ') || 'none'}`);
    console.log(`- Exclude bin IDs: ${excludeBinIds.join(', ') || 'none'}`);
    console.log(`- Fill level threshold: ${fillLevelThreshold}%`);

    // Get area details including start and end locations
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }

    // Build the query for bins that need collection
    const binQuery: any = { area: areaId };
    
    // Initialize bins to include and exclude
    let binsToInclude: BinDocument[] = [];
    let binsToExclude: BinDocument[] = [];
    
    // If specific bins are to be included, get them regardless of fill level
    if (includeBinIds.length > 0) {
      binsToInclude = await Bin.find({
        _id: { $in: includeBinIds },
        area: areaId
      }) as BinDocument[];
    }
    
    // If specific bins are to be excluded, mark them
    if (excludeBinIds.length > 0) {
      binsToExclude = await Bin.find({
        _id: { $in: excludeBinIds },
        area: areaId
      }) as BinDocument[];
    }

    // Get bins that meet the threshold
    binQuery.fillLevel = { $gte: fillLevelThreshold };
    if (excludeBinIds.length > 0) {
      binQuery._id = { $nin: excludeBinIds }; // Exclude specified bins
    }
    
    const thresholdBins = await Bin.find(binQuery) as BinDocument[];
    
    // Combine bins from threshold and specifically included bins
    let binsSet = new Set<string>();
    let bins: BinDocument[] = [];
    
    // Add threshold bins to the set
    for (const bin of thresholdBins) {
      binsSet.add(bin._id.toString());
      bins.push(bin);
    }
    
    // Add specifically included bins if not already in the set
    for (const bin of binsToInclude) {
      if (!binsSet.has(bin._id.toString())) {
        binsSet.add(bin._id.toString());
        bins.push(bin);
      }
    }
    
    // If no bins need collection, return empty route
    if (bins.length === 0) {
      res.status(200).json({
        message: 'No bins need collection in this area',
        route: [],
        startLocation: area.startLocation.coordinates,
        endLocation: area.endLocation.coordinates,
        totalBins: 0
      });
      return;
    }

    console.log(`Found ${bins.length} bins to include in route optimization`);

    // Extract bin locations for optimization and ensure they are properly typed as [number, number]
    const binLocations = bins.map(bin => {
      // Ensure we have a proper [longitude, latitude] tuple
      const [longitude, latitude] = bin.location.coordinates;
      return [longitude, latitude] as [number, number];
    });

    // Ensure start and end locations are also properly typed
    const startCoords = area.startLocation.coordinates as [number, number];
    const endCoords = area.endLocation.coordinates as [number, number];

    // Optimize route using the service function
    const optimizedRoute = await routeOptimizationService.optimizeRoute(
      startCoords,     // Start from area's start location
      binLocations,    // Visit bins that need collection
      endCoords        // End at area's end location
    );

    res.status(200).json({
      route: optimizedRoute,
      startLocation: area.startLocation.coordinates,
      endLocation: area.endLocation.coordinates,
      totalBins: bins.length,
      includedBins: binsToInclude.map(bin => bin._id.toString()),
      excludedBins: binsToExclude.map(bin => bin._id.toString())
    });
  } catch (error) {
    console.error('[Route Optimization] Error:', error);
    res.status(500).json({ message: 'Failed to calculate optimized route.' });
  }
};
