import { Request, Response } from 'express';
import Area from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import Route, { IRoute } from '../models/Route';
import mongoose, { Schema } from 'mongoose';
import { optimizeRoute, calculateDistance, formatDistance, formatDuration } from '../services/routeOptimizationService';
import Schedule, { ISchedule } from '../models/Schedule';
import Collector from '../models/Collector';
import { calculateRouteMetrics } from '../utils/routeCalculations'; // Import our custom calculation utility

/**
 * Generate an optimized collection route for a specific area
 * Optimizes the sequence of bin collections to minimize travel distance
 */
export const generateOptimizedRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { areaId } = req.params;
    const { 
      threshold = 70, 
      wasteType, 
      includeCritical = "false" 
    } = req.query;
    
    console.log(`[Route Optimization] Generating optimized route for area ${areaId} with threshold ${threshold}%`);
    console.log(`[Route Optimization] User: ${req.user?.id}, Role: ${req.user?.role}`);
    console.log(`[Route Optimization] Waste Type: ${wasteType}, Include Critical: ${includeCritical}`);
    
    // Find area
    const area = await Area.findById(areaId);
    if (!area) {
      console.log(`[Route Optimization] Area not found: ${areaId}`);
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Get start and end location from area
    const startLocation = area.startLocation?.coordinates;
    const endLocation = area.endLocation?.coordinates || startLocation;
    
    if (!startLocation) {
      res.status(400).json({ message: 'Area does not have a valid start location' });
      return;
    }
    
    // Build the query for bin selection
    const fillLevelThreshold = parseInt(threshold as string);
    let query: any = {
      area: areaId,
      fillLevel: { $gte: fillLevelThreshold }
    };
    
    // Apply waste type filter if specified
    if (wasteType) {
      query.wasteTypes = wasteType;
    }
    
    // Find all bins that match the criteria
    let eligibleBins = await Bin.find(query).select('location fillLevel lastCollected wasteTypes _id') as IBin[];
    
    // If includeCritical is true, add critical bins (>=90% fill) regardless of waste type
    if (includeCritical === 'true') {
      // Query for critical bins that aren't already in the eligible bins list
      const criticalBinsQuery: any = { 
        area: areaId,
        fillLevel: { $gte: 90 }
      };
      
      // If we're filtering by waste type, make sure we don't duplicate bins
      if (wasteType) {
        const eligibleBinIds = eligibleBins.map(bin => (bin._id as mongoose.Types.ObjectId).toString());
        criticalBinsQuery._id = { $nin: eligibleBinIds };
      }
      
      const criticalBins = await Bin.find(criticalBinsQuery)
        .select('location fillLevel lastCollected wasteTypes _id') as IBin[];
      
      console.log(`[Route Optimization] Adding ${criticalBins.length} critical bins to route`);
      
      // Combine the eligible bins with critical bins
      eligibleBins = [...eligibleBins, ...criticalBins];
    }
    
    console.log(`[Route Optimization] Found ${eligibleBins.length} eligible bins`);
    
    if (eligibleBins.length === 0) {
      res.status(200).json({
        message: 'No bins match the criteria for route optimization',
        route: {
          coordinates: [startLocation, endLocation],
          distance: formatDistance(calculateDistance(startLocation as [number, number], endLocation as [number, number])),
          duration: formatDuration(0),
          steps: []
        },
        binSequence: []
      });
      return;
    }
    
    // Extract coordinates for optimization
    const binCoordinates = eligibleBins.map(bin => bin.location.coordinates as [number, number]);
    
    // Optimize the route
    const optimizedRoute = await optimizeRoute(
      startLocation as [number, number],
      binCoordinates,
      endLocation as [number, number]
    );
    
    // Map the original bin IDs to the optimized sequence
    let binSequence: string[] = [];
    let orderedBins: IBin[] = [];
    
    if (optimizedRoute.stops_sequence) {
      // Map indices to bin objects and IDs in the optimized sequence
      orderedBins = optimizedRoute.stops_sequence.map(index => {
        const binIndex = index as number;
        return eligibleBins[binIndex];
      });
      
      binSequence = orderedBins.map(bin => (bin._id as mongoose.Types.ObjectId).toString());
    }
    
    // Build the full route coordinates (start → bins → end)
    const fullRouteCoordinates: [number, number][] = [
      startLocation as [number, number],
      ...orderedBins.map(bin => bin.location.coordinates as [number, number]),
      endLocation as [number, number]
    ];
    
    // Calculate realistic metrics using our custom algorithm
    const customMetrics = calculateRouteMetrics(fullRouteCoordinates, orderedBins);
    
    // Clone the ORS route output but replace with our custom metrics
    const routeWithCustomMetrics = {
      ...optimizedRoute,
      // Use our custom metrics (already in km and minutes)
      distance: customMetrics.distance,
      duration: customMetrics.duration
    };
    
    // Return the optimized route with bin sequence and custom metrics
    res.status(200).json({
      route: routeWithCustomMetrics,
      binSequence
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
 * Generate a custom route with provided coordinates
 */
export const generateCustomRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, stops, end } = req.body;
    
    if (!start || !stops || !end || !Array.isArray(stops)) {
      res.status(400).json({ message: 'Missing required parameters: start, stops, end' });
      return;
    }
    
    // Validate coordinates format
    if (!Array.isArray(start) || start.length !== 2 ||
        !Array.isArray(end) || end.length !== 2) {
      res.status(400).json({ message: 'Coordinates must be in format [longitude, latitude]' });
      return;
    }
    
    for (const stop of stops) {
      if (!Array.isArray(stop) || stop.length !== 2) {
        res.status(400).json({ message: 'All stops must be in format [longitude, latitude]' });
        return;
      }
    }
    
    // Generate optimized route
    const optimizedRoute = await optimizeRoute(
      start as [number, number],
      stops as Array<[number, number]>,
      end as [number, number]
    );
    
    res.status(200).json(optimizedRoute);
  } catch (error: any) {
    console.error('Error generating custom route:', error);
    res.status(500).json({ 
      message: 'Failed to generate custom route', 
      error: error.message 
    });
  }
};

/**
 * Adjust an existing route by reordering, adding, or removing bins
 */
export const adjustExistingRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { areaId, existingRoute, includeBins, excludeBins, binOrder } = req.body;
    
    // Validate required parameters
    if (!areaId || !existingRoute) {
      res.status(400).json({ message: 'Missing required parameters' });
      return;
    }
    
    // Find area
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Get start and end location from area
    const startLocation = area.startLocation?.coordinates;
    const endLocation = area.endLocation?.coordinates || startLocation;
    
    if (!startLocation) {
      res.status(400).json({ message: 'Area does not have a valid start location' });
      return;
    }
    
    // If bin order is provided, use it to reorder the route
    if (binOrder && Array.isArray(binOrder) && binOrder.length > 0) {
      // Find all bins in the ordered list
      const orderedBins = await Bin.find({
        _id: { $in: binOrder }
      }).select('location') as IBin[];
      
      // Map bin IDs to their coordinates
      const binMap = new Map();
      orderedBins.forEach(bin => {
        binMap.set((bin._id as mongoose.Types.ObjectId).toString(), bin.location.coordinates);
      });
      
      // Create ordered coordinates array
      const orderedCoordinates = binOrder
        .map(id => binMap.get(id))
        .filter(coords => coords !== undefined);
      
      // Generate route with ordered coordinates
      const adjustedRoute = await optimizeRoute(
        startLocation as [number, number],
        orderedCoordinates as Array<[number, number]>,
        endLocation as [number, number]
      );
      
      // Build the full route coordinates (start → bins → end)
      const fullRouteCoordinates: [number, number][] = [
        startLocation as [number, number],
        ...orderedCoordinates as Array<[number, number]>,
        endLocation as [number, number]
      ];
      
      // Get the full bin objects for better collection time estimation
      const fullBins = await Bin.find({
        _id: { $in: binOrder }
      }).select('location fillLevel _id') as IBin[];
      
      // Calculate realistic metrics using our custom algorithm
      const customMetrics = calculateRouteMetrics(fullRouteCoordinates, fullBins);
      
      // Clone the ORS route output but replace with our custom metrics
      const routeWithCustomMetrics = {
        ...adjustedRoute,
        // Use our custom metrics (already in km and minutes)
        distance: customMetrics.distance,
        duration: customMetrics.duration
      };
      
      res.status(200).json({
        route: routeWithCustomMetrics,
        binSequence: binOrder
      });
      return;
    }
    
    // If include/exclude bins provided, adjust the route
    let binsQuery: any = { area: areaId };
    
    // Include specific bins
    if (includeBins && Array.isArray(includeBins) && includeBins.length > 0) {
      binsQuery = {
        ...binsQuery,
        _id: { $in: includeBins }
      };
    }
    
    // Exclude specific bins
    if (excludeBins && Array.isArray(excludeBins) && excludeBins.length > 0) {
      binsQuery = {
        ...binsQuery,
        _id: { $nin: excludeBins }
      };
    }
    
    // Get bins based on filters
    const filteredBins = await Bin.find(binsQuery).select('location') as IBin[];
    
    if (filteredBins.length === 0) {
      res.status(400).json({ message: 'No bins to route after filtering' });
      return;
    }
    
    // Extract coordinates
    const binCoordinates = filteredBins.map(bin => bin.location.coordinates as [number, number]);
    
    // Optimize the route
    const optimizedRoute = await optimizeRoute(
      startLocation as [number, number],
      binCoordinates,
      endLocation as [number, number]
    );
    
    // Map the bin IDs to the optimized sequence
    const binSequence = optimizedRoute.stops_sequence?.map(index => {
      const indexNum = index as number;
      const bin = filteredBins[indexNum];
      return (bin._id as mongoose.Types.ObjectId).toString();
    });
    
    res.status(200).json({
      route: optimizedRoute,
      binSequence
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
 * Create a route and assign it to a collector
 * This is a specialized endpoint for the route planning feature
 */
export const createRouteAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      areaId,
      collectorId,
      date,
      startTime,
      binIds,
      routeData
    } = req.body;
    
    // Validate required fields
    if (!name || !areaId || !date || !binIds || !Array.isArray(binIds) || binIds.length === 0) {
      res.status(400).json({ message: 'Missing required fields for route assignment' });
      return;
    }
    
    // Validate area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Validate collector if provided
    if (collectorId) {
      const collector = await Collector.findById(collectorId);
      if (!collector) {
        res.status(404).json({ message: 'Collector not found' });
        return;
      }
    }
    
    // Check that all bins exist and are in the specified area
    const bins = await Bin.find({
      _id: { $in: binIds },
      area: areaId
    }).select('location') as IBin[];
    
    if (bins.length !== binIds.length) {
      res.status(400).json({ 
        message: 'Some bins were not found or are not in the specified area',
        found: bins.length,
        requested: binIds.length
      });
      return;
    }
    
    // Create route data - either use provided routeData or generate it
    let routeCoordinates, routeDistance, routeDuration;
    
    if (routeData && routeData.coordinates && routeData.distance && routeData.duration) {
      // Use provided route data
      routeCoordinates = routeData.coordinates;
      routeDistance = routeData.distance;
      routeDuration = routeData.duration;
    } else {
      // Generate route using bins' coordinates and area's start/end locations
      const startLocation = area.startLocation?.coordinates;
      const endLocation = area.endLocation?.coordinates || startLocation;
      
      if (!startLocation) {
        res.status(400).json({ message: 'Area does not have a valid start location' });
        return;
      }
      
      // Extract bin coordinates in the order they were provided
      const binMap = new Map<string, [number, number]>();
      bins.forEach(bin => {
        binMap.set((bin._id as mongoose.Types.ObjectId).toString(), bin.location.coordinates as [number, number]);
      });
      
      const orderedCoordinates = binIds
        .map(id => binMap.get(id))
        .filter(coords => coords !== undefined) as [number, number][];
      
      // Generate optimized route
      try {
        const optimizedRoute = await optimizeRoute(
          startLocation as [number, number],
          orderedCoordinates,
          endLocation as [number, number]
        );
        
        // Build full route coordinates for our custom calculation
        const fullRouteCoordinates: [number, number][] = [
          startLocation as [number, number],
          ...orderedCoordinates,
          endLocation as [number, number]
        ];
        
        // Get full bins with fill level for more accurate time estimation
        const fullBins = await Bin.find({
          _id: { $in: binIds }
        }).select('location fillLevel _id');
        
        // Calculate realistic metrics using our custom algorithm
        const customMetrics = calculateRouteMetrics(fullRouteCoordinates, fullBins);
        
        // Use our custom calculations instead of ORS
        routeCoordinates = optimizedRoute.route;
        routeDistance = customMetrics.distance;
        routeDuration = customMetrics.duration;
      } catch (error) {
        console.error('Error generating route:', error);
        res.status(500).json({ message: 'Failed to generate route' });
        return;
      }
    }
    
    // Create and save the route
    const newRoute = new Route({
      coordinates: routeCoordinates,
      distance: routeDistance,
      duration: routeDuration
    });
    
    await newRoute.save();
    
    // Create and save the schedule
    const scheduleData: Partial<ISchedule> = {
      name,
      areaId: new mongoose.Types.ObjectId(areaId) as unknown as Schema.Types.ObjectId,
      routeId: newRoute._id as Schema.Types.ObjectId,
      date: new Date(date),
      status: 'scheduled'
    };
    
    // Add optional fields if provided
    if (collectorId) {
      scheduleData.collectorId = new mongoose.Types.ObjectId(collectorId) as unknown as Schema.Types.ObjectId;
    }
    
    if (startTime) {
      scheduleData.startTime = new Date(startTime);
    }
    
    const newSchedule = new Schedule(scheduleData);
    await newSchedule.save();
    
    // Return response with created schedule and route
    res.status(201).json({
      message: 'Route assigned successfully',
      schedule: {
        ...newSchedule.toObject(),
        route: newRoute.toObject(),
        binIds: binIds // Include the bin IDs in the order they were provided
      }
    });
  } catch (error: any) {
    console.error('Error creating route assignment:', error);
    res.status(500).json({ 
      message: 'Failed to create route assignment', 
      error: error.message 
    });
  }
};