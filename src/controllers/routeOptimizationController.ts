import { Request, Response } from 'express';
import { optimizeRoute, OptimizedRoute } from '../services/routeOptimizationService';
import Area from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import mongoose, { Document } from 'mongoose';

// Helper type to ensure _id property is recognized
interface BinDocument extends IBin {
  _id: mongoose.Types.ObjectId;
}

/**
 * Generate an optimized route for an area
 */
export const getOptimizedRouteForArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const { areaId } = req.params;
    const { fillLevelThreshold = 70 } = req.query;
    
    // Validate area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Get all bins for this area that meet the fill level threshold
    const threshold = Number(fillLevelThreshold);
    const bins = await Bin.find({
      area: areaId,
      fillLevel: { $gte: threshold }
    });
    
    if (bins.length === 0) {
      res.status(404).json({ message: 'No bins found that meet the fill level threshold' });
      return;
    }
    
    // Extract bin locations for route optimization
    const stops: Array<[number, number]> = bins.map(bin => 
      bin.location.coordinates as [number, number]
    );
    
    // Get start and end points from the area
    const start = area.startLocation.coordinates as [number, number];
    const end = area.endLocation.coordinates as [number, number];
    
    // Call the optimization service
    const optimizedRoute: OptimizedRoute = await optimizeRoute(start, stops, end);
    
    // Map the bin IDs to the optimized sequence
    const includedBins = bins.map((bin) => {
      // Ensure bin._id is treated as string or ObjectId that can be stringified
      return bin._id.toString();
    });
    
    // Return the complete route optimization response
    res.json({
      route: optimizedRoute,
      totalBins: bins.length,
      areaId: area._id,
      areaName: area.name,
      includedBins: includedBins,
      fillLevelThreshold: threshold
    });
  } catch (error: any) {
    console.error('Error generating optimized route:', error);
    res.status(500).json({ 
      message: 'Failed to generate optimized route', 
      error: error.message 
    });
  }
};

/**
 * Adjust an existing route by including/excluding bins
 */
export const adjustExistingRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      areaId, 
      existingRoute, 
      includeBins = [], // explicitly included bin IDs
      excludeBins = [], // explicitly excluded bin IDs
      binOrder = [] // manually ordered bin IDs
    } = req.body;
    
    // Validate area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Get fill level threshold from the existing route or default to 70
    const fillLevelThreshold = existingRoute.fillLevelThreshold || 70;
    
    // Get all bins in this area
    const allBins = await Bin.find({ area: areaId });
    if (allBins.length === 0) {
      res.status(404).json({ message: 'No bins found in this area' });
      return;
    }
    
    // Type guard function to check if a bin has an _id property
    function hasBinId(bin: any): bin is BinDocument {
      return bin && bin._id && (typeof bin._id.toString === 'function');
    }
    
    // Determine which bins to include
    let includedBins: BinDocument[] = [];
    
    // First, add all explicitly included bins
    if (includeBins.length > 0) {
      const explicitlyIncludedBins = allBins.filter(bin => 
        hasBinId(bin) && includeBins.includes(bin._id.toString())
      );
      includedBins.push(...(explicitlyIncludedBins as BinDocument[]));
    }
    
    // Then, add bins from the existing route that aren't explicitly excluded
    if (existingRoute.includedBins) {
      const existingBins = allBins.filter(bin => 
        hasBinId(bin) && 
        existingRoute.includedBins.includes(bin._id.toString()) && 
        !excludeBins.includes(bin._id.toString()) &&
        !includedBins.some(included => included._id.toString() === bin._id.toString())
      );
      includedBins.push(...(existingBins as BinDocument[]));
    }
    
    // Add bins that meet the threshold and aren't explicitly excluded or already included
    const thresholdBins = allBins.filter(bin => 
      hasBinId(bin) &&
      bin.fillLevel >= fillLevelThreshold &&
      !excludeBins.includes(bin._id.toString()) &&
      !includedBins.some(included => included._id.toString() === bin._id.toString())
    );
    includedBins.push(...(thresholdBins as BinDocument[]));
    
    // If no bins to include, return error
    if (includedBins.length === 0) {
      res.status(400).json({ message: 'No bins to include in route after applying filters' });
      return;
    }
    
    // Extract coordinates for route optimization
    const stops: Array<[number, number]> = includedBins.map(bin => 
      bin.location.coordinates as [number, number]
    );
    
    // Get start and end points from the area
    const start = area.startLocation.coordinates as [number, number];
    const end = area.endLocation.coordinates as [number, number];
    
    // Generate map of bin ID to its location to help with reordering
    const binLocationMap = new Map(
      includedBins.map(bin => [bin._id.toString(), bin.location.coordinates])
    );
    
    // If a custom bin order is provided, use it to reorder the stops
    if (binOrder.length > 0 && includedBins.length > 0) {
      // Get only the bins that are both in binOrder and includedBins
      const orderedBinIds = binOrder.filter(binId => 
        includedBins.some(bin => bin._id.toString() === binId)
      );
      
      // If we have valid ordered bins, use that sequence instead of calculating a new route
      if (orderedBinIds.length > 0) {
        // Create the ordered sequence of stops based on binOrder
        const orderedStops = orderedBinIds
          .map(binId => binLocationMap.get(binId))
          .filter(Boolean) as Array<[number, number]>;
          
        // Extract the bin IDs for response
        const includedBinIds = includedBins.map(bin => bin._id.toString());
        
        // Create a simplified response with the manual order
        const response = {
          route: {
            route: [start, ...orderedStops, end],
            distance: existingRoute.route.distance,  // Keep existing distance
            duration: existingRoute.route.duration,  // Keep existing duration
            steps: existingRoute.route.steps,        // Keep existing steps
          },
          totalBins: includedBins.length,
          areaId: area._id,
          areaName: area.name,
          includedBins: includedBinIds,
          excludedBins: excludeBins,
          fillLevelThreshold: fillLevelThreshold
        };
        
        res.json(response);
        return;
      }
    }
    
    // If no manual ordering or invalid ordering, generate a new optimized route
    const optimizedRoute: OptimizedRoute = await optimizeRoute(start, stops, end);
    
    // Extract the bin IDs for response
    const includedBinIds = includedBins.map(bin => bin._id.toString());
    
    // Return the complete route optimization response
    res.json({
      route: optimizedRoute,
      totalBins: includedBins.length,
      areaId: area._id,
      areaName: area.name,
      includedBins: includedBinIds,
      excludedBins: excludeBins,
      fillLevelThreshold: fillLevelThreshold
    });
  } catch (error: any) {
    console.error('Error adjusting route:', error);
    res.status(500).json({ 
      message: 'Failed to adjust route', 
      error: error.message 
    });
  }
};

/**
 * Get optimized route for an area
 */
export const getOptimizedRoute = async (req: Request, res: Response): Promise<void> => {
  return getOptimizedRouteForArea(req, res);
};

/**
 * Optimize a collection route based on waypoints
 * Legacy endpoint for backward compatibility
 */
export const optimizeCollectionRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, stops, end } = req.body;
    
    // Validate inputs
    if (!start || !stops || !stops.length || !end) {
      res.status(400).json({
        message: 'Missing required parameters: start, stops, and end coordinates'
      });
      return;
    }
    
    // Call the optimization service
    const optimizedRoute = await optimizeRoute(start, stops, end);
    
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
    const { start, stops, end } = req.body;
    
    // Validate inputs
    if (!start || !stops || !end || !Array.isArray(stops) || stops.length === 0) {
      res.status(400).json({
        message: 'Invalid inputs. Need start, stops, and end coordinates'
      });
      return;
    }
    
    // Import the actual function from service
    const { optimizeBinOrder: optimizeBinOrderService } = require('../services/routeOptimizationService');
    
    // Call the bin order optimization service only
    const optimizedBinOrder = await optimizeBinOrderService(start, stops, end);
    
    res.json(optimizedBinOrder);
  } catch (error: any) {
    console.error('Bin order optimization error:', error);
    res.status(500).json({
      message: 'Failed to optimize bin collection order',
      error: error.message
    });
  }
};

/**
 * Generate a route polyline for a set of waypoints
 */
export const generateRoutePolyline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waypoints, stopsSequence } = req.body;
    
    // Validate inputs
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      res.status(400).json({
        message: 'Invalid inputs. Need at least two waypoints'
      });
      return;
    }
    
    // Import the actual function from service
    const { generateRoutePolyline: generateRoutePolylineService } = require('../services/routeOptimizationService');
    
    // Call the polyline generation service
    const routePolyline = await generateRoutePolylineService(
      waypoints, 
      stopsSequence || []
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
