import { Request, Response, NextFunction } from 'express';
import Schedule, { ISchedule } from '../models/Schedule';
import Area from '../models/Area';
import Collector from '../models/Collector';
import mongoose, { Schema } from 'mongoose';
import Bin from '../models/Bin';
import { format } from 'date-fns';
import * as routeOptimizationService from '../services/routeOptimizationService';

/**
 * Create a new collection route schedule
 */
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
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
      binSequence,
      wasteType
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
    
    // Add waste type if provided
    if (wasteType) {
      scheduleData.wasteType = wasteType;
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

/**
 * Get all schedules with filtering options
 */
export const getSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      areaId, 
      collectorId, 
      status, 
      fromDate, 
      toDate, 
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    const query: any = {};
    
    if (areaId) {
      query.areaId = areaId;
    }
    
    if (collectorId) {
      query.collectorId = collectorId;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        query.date.$lte = new Date(toDate as string);
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get schedules with pagination - routes are now integrated into the schedule
    const schedules = await Schedule.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('areaId', 'name')
      .populate('collectorId', 'firstName lastName');
    
    // Get total count for pagination
    const totalCount = await Schedule.countDocuments(query);
    
    res.json({
      data: schedules,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error getting schedules:', error);
    res.status(500).json({ 
      message: 'Failed to get schedules', 
      error: error.message 
    });
  }
};

/**
 * Get a single schedule by ID
 */
export const getScheduleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { populateBins } = req.query;
    
    let scheduleQuery = Schedule.findById(id)
      .populate('areaId', 'name geometry startLocation endLocation')
      .populate('collectorId', 'firstName lastName email phone');
    
    // If populateBins is true, also populate the bin objects from the binSequence
    if (populateBins === 'true') {
      // This requires the Bin model to be imported
      const Bin = mongoose.model('Bin');
      
      // First get the schedule with its binSequence
      const schedule = await scheduleQuery;
      
      if (!schedule) {
        res.status(404).json({ message: 'Schedule not found' });
        return;
      }
      
      // If we have a bin sequence, populate the bin objects
      if (schedule.binSequence && schedule.binSequence.length > 0) {
        // Convert schedule to a plain object so we can modify it
        const scheduleObj = schedule.toObject();
        
        // Fetch all the bins in the sequence
        const binIds = schedule.binSequence.map(binId => 
          new mongoose.Types.ObjectId(binId.toString())
        );
        
        const bins = await Bin.find({ _id: { $in: binIds } });
        
        // Create a map for quick lookups
        const binMap = new Map();
        bins.forEach(bin => {
          binMap.set(bin._id.toString(), bin);
        });
        
        // Replace the bin IDs with the actual bin objects in the correct order
        scheduleObj.binSequence = schedule.binSequence.map(binId => {
          return binMap.get(binId.toString()) || binId;
        });
        
        res.json(scheduleObj);
        return;
      }
      
      res.json(schedule);
      return;
    }
    
    // If not populating bins, just return the schedule as is
    const schedule = await scheduleQuery;
    
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    
    res.json(schedule);
  } catch (error: any) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ 
      message: 'Failed to get schedule', 
      error: error.message 
    });
  }
};

/**
 * Update a schedule
 */
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      collectorId,
      date,
      startTime,
      endTime,
      status,
      route,
      distance,
      duration,
      notes
    } = req.body;

    // Find the schedule
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }

    // Update schedule fields if provided
    if (name) schedule.name = name;
    if (collectorId) {
      schedule.collectorId = collectorId as unknown as Schema.Types.ObjectId;
    }
    if (date) schedule.date = new Date(date);
    if (startTime) schedule.startTime = new Date(startTime);
    if (endTime) schedule.endTime = new Date(endTime);
    if (status) schedule.status = status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    if (route) schedule.route = route;
    if (distance !== undefined) schedule.distance = distance;
    if (duration !== undefined) schedule.duration = duration;
    if (notes !== undefined) schedule.notes = notes;

    // Save updated schedule
    await schedule.save();
    
    // Return the updated schedule with populated fields
    const updatedSchedule = await Schedule.findById(id)
      .populate('areaId', 'name')
      .populate('collectorId', 'firstName lastName');
      
    res.json(updatedSchedule);
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      message: 'Failed to update schedule', 
      error: error.message 
    });
  }
};

/**
 * Delete a schedule
 */
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    
    // Delete the schedule
    await Schedule.findByIdAndDelete(id);
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      message: 'Failed to delete schedule', 
      error: error.message 
    });
  }
};

/**
 * Assign a collector to a schedule
 */
export const assignCollector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params;
    const { collectorId } = req.body;
    
    if (!collectorId) {
      res.status(400).json({ message: 'Collector ID is required' });
      return;
    }
    
    // Check if collector exists
    const collector = await Collector.findById(collectorId);
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    
    // Update schedule
    const schedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { collectorId: new mongoose.Types.ObjectId(collectorId) as unknown as Schema.Types.ObjectId },
      { new: true }
    );
    
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }
    
    res.json(schedule);
  } catch (error: any) {
    console.error('Error assigning collector to schedule:', error);
    res.status(500).json({ 
      message: 'Failed to assign collector', 
      error: error.message 
    });
  }
};

/**
 * Get weekly schedule overview (counts per day)
 */
export const getWeeklyScheduleOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    // Validate date parameters
    if (!fromDate || !toDate) {
      res.status(400).json({ message: 'Both fromDate and toDate are required' });
      return;
    }
    
    // Create date range for the query
    const startDate = new Date(fromDate as string);
    const endDate = new Date(toDate as string);
    
    // Set times to start and end of day to ensure we capture all schedules
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Aggregate schedules for the week, grouped by date and status
    const weeklyOverview = await Schedule.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          date: { $first: "$_id.date" },
          statusCounts: {
            $push: {
              status: "$_id.status",
              count: "$count"
            }
          },
          totalCount: { $sum: "$count" }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
    
    res.json({
      success: true,
      data: weeklyOverview
    });
  } catch (error: any) {
    console.error('Error getting weekly schedule overview:', error);
    res.status(500).json({ 
      message: 'Failed to get weekly schedule overview', 
      error: error.message 
    });
  }
};

/**
 * Auto-generate a schedule for an area based on a specific waste type that needs attention
 * Called automatically when alerts for specific waste types reach critical levels
 */
export const autoGenerateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { areaId, wasteType } = req.body;

    // Validate input
    if (!areaId || !wasteType) {
      res.status(400).json({
        success: false,
        message: 'Area ID and waste type are required'
      });
      return;
    }

    // Check if area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({
        success: false,
        message: 'Area not found'
      });
      return;
    }

    // Check if waste type is valid
    const validWasteTypes = ['GENERAL', 'ORGANIC', 'RECYCLE', 'HAZARDOUS'];
    if (!validWasteTypes.includes(wasteType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid waste type'
      });
      return;
    }

    // Check if there's already a pending schedule for this area and waste type
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const existingSchedule = await Schedule.findOne({
      areaId,
      wasteType,
      date: { $gte: tomorrow, $lte: nextWeek },
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (existingSchedule) {
      res.status(200).json({
        success: true,
        message: `A schedule for ${wasteType} collection in this area already exists for ${format(existingSchedule.date, 'EEEE, MMMM d')}`,
        existingSchedule
      });
      return;
    }

    // Get all bins of the specified waste type in the area
    const bins = await Bin.find({
      area: areaId,
      wasteType,
      status: { $in: ['ACTIVE', 'MAINTENANCE'] }, // Only include active or maintenance bins
    }).lean();

    if (bins.length === 0) {
      res.status(400).json({
        success: false,
        message: `No ${wasteType} bins found in the area`
      });
      return;
    }

    // Find available collector for this area
    const collector = await Collector.findOne({ 
      area: areaId,
      status: 'active'
    });

    if (!collector) {
      res.status(400).json({
        success: false,
        message: 'No active collectors assigned to this area'
      });
      return;
    }

    // Get area start and end locations for route planning
    const startLocation = area.startLocation?.coordinates || [0, 0];
    const endLocation = area.endLocation?.coordinates || [0, 0];

    // Extract bin locations for route optimization
    const binLocations = bins.map(bin => {
      if (bin.location && bin.location.coordinates) {
        return {
          id: bin._id.toString(),
          location: bin.location.coordinates as [number, number]
        };
      }
      return null;
    }).filter(bin => bin !== null);

    if (binLocations.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Could not extract valid bin locations for route planning'
      });
      return;
    }

    try {
      // Calculate optimized route using RouteOptimizationService
      const routeResult = await routeOptimizationService.createOptimalRoute(
        startLocation as [number, number],
        binLocations.map(bin => bin!.location),
        endLocation as [number, number],
        bins // Pass the actual bins with fill levels for accurate duration calculation
      );

      // Set schedule time to tomorrow morning
      const scheduleDate = new Date(tomorrow);
      const scheduleStartTime = new Date(tomorrow);
      scheduleStartTime.setHours(8, 0, 0, 0); // 8:00 AM
      
      // Duration is now directly usable from the route optimization service
      const scheduleDuration = routeResult.duration as number;
      
      const scheduleEndTime = new Date(scheduleStartTime);
      scheduleEndTime.setMinutes(scheduleEndTime.getMinutes() + scheduleDuration);

      // Create bin sequence from the stops_sequence
      // Map the bin IDs based on the stops_sequence from the route optimization
      const binSequence = (routeResult.stops_sequence || []).map((stopIndex: number) => {
        const binLocation = binLocations[stopIndex];
        return binLocation ? new mongoose.Types.ObjectId(binLocation.id) : null;
      }).filter((id): id is mongoose.Types.ObjectId => id !== null);

      // Create schedule name
      const scheduleName = `${format(scheduleDate, 'EEEE, MMM d')} - ${area.name} (${wasteType})`;

      // Create new schedule
      const newSchedule = new Schedule({
        name: scheduleName,
        areaId: areaId,
        collectorId: collector._id,
        date: scheduleDate,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        status: 'scheduled',
        wasteType: wasteType,
        route: routeResult.route,
        distance: routeResult.distance,
        duration: scheduleDuration,
        binSequence: binSequence,
        notes: `Auto-generated schedule for ${wasteType} waste collection due to high fill levels`
      });

      await newSchedule.save();

      res.status(201).json({
        success: true,
        message: `Schedule automatically generated for ${wasteType} collection in ${area.name} for ${format(scheduleDate, 'EEEE, MMMM d')}`,
        schedule: newSchedule
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate an optimal route',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  } catch (error) {
    console.error('Error auto-generating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};