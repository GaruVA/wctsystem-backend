import { Request, Response } from 'express';
import Area from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import mongoose, { Schema } from 'mongoose';
import { createOptimalRoute } from '../services/routeOptimizationService';
import Schedule, { ISchedule } from '../models/Schedule';
import Collector from '../models/Collector';

/**
 * Generate an optimized collection route for a specific area
 * Optimizes the sequence of bin collections to minimize travel distance
 */
export const generateOptimizedRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { areaId } = req.params;
    const { 
      threshold = 70, 
      wasteType
    } = req.query;
    
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
    
    // Build the query for bin selection
    const fillLevelThreshold = parseInt(threshold as string);
    let query: any = {
      area: areaId,
      fillLevel: { $gte: fillLevelThreshold }
    };
    
    // Apply waste type filter if specified
    if (wasteType) {
      query.wasteType = wasteType;
    }
    
    // Find all bins that match the criteria
    const eligibleBins = await Bin.find(query).select('location fillLevel lastCollected wasteType _id') as IBin[];
    
    if (eligibleBins.length === 0) {
      res.status(200).json({
        message: 'No bins match the criteria for route optimization',
        route: {
          coordinates: [startLocation, endLocation],
          distance: 0,
          duration: 0
        },
        binSequence: []
      });
      return;
    }
    
    // Extract coordinates for optimization
    const binCoordinates = eligibleBins.map(bin => bin.location.coordinates as [number, number]);
    
    // Optimize the route, passing bins for accurate duration calculation
    const optimizedRoute = await createOptimalRoute(
      startLocation as [number, number],
      binCoordinates,
      endLocation as [number, number],
      eligibleBins
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
    
    // Return the optimized route with bin sequence - metrics are already calculated
    res.status(200).json({
      route: optimizedRoute,
      binSequence
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to generate optimized route', 
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
      endTime,
      status = 'scheduled',
      notes,
      route,
      distance,
      duration,
      binSequence
    } = req.body;

    // Validate required fields
    if (!name || !areaId || !date || !route) {
      res.status(400).json({ message: 'Missing required fields' });
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

    // Create schedule data
    const scheduleData: Partial<ISchedule> = {
      name,
      areaId: areaId as unknown as Schema.Types.ObjectId,
      date: new Date(date),
      status: status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
      route,
      distance,
      duration,
      binSequence: binSequence || []
    };

    // Add optional fields if provided
    if (collectorId) {
      scheduleData.collectorId = collectorId as unknown as Schema.Types.ObjectId;
    }
    
    if (startTime) {
      scheduleData.startTime = new Date(startTime);
    }
    
    if (endTime) {
      scheduleData.endTime = new Date(endTime);
    }

    // Add notes if provided
    if (notes) {
      scheduleData.notes = notes;
    }

    // Create and save the schedule
    const newSchedule = new Schedule(scheduleData);
    await newSchedule.save();

    res.status(201).json(newSchedule);
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ 
      message: 'Failed to create schedule', 
      error: error.message 
    });
  }
};
