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
      date,
      limit = 100,
      page = 1
    } = req.query;

    console.log('Query parameters:', { areaId, collectorId, status, fromDate, toDate, date });

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
    
    // Date filtering logic
    if (date) {
      // If a specific date is provided, filter for that exact date
      // Create start and end of the day for the given date in UTC
      const dateString = date as string;
      const startDate = new Date(`${dateString}T00:00:00.000Z`);
      const endDate = new Date(`${dateString}T23:59:59.999Z`);
      
      // Filter schedules for the exact day using UTC dates
      query.date = { $gte: startDate, $lte: endDate };
      console.log(`Filtering schedules for date: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } 
    // Date range filter - only apply if specific date not provided
    else if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        const fromDateObj = new Date(`${fromDate as string}T00:00:00.000Z`);
        query.date.$gte = fromDateObj;
      }
      if (toDate) {
        const toDateObj = new Date(`${toDate as string}T23:59:59.999Z`);
        query.date.$lte = toDateObj;
      }
    }

    console.log('Final query:', JSON.stringify(query));

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

    console.log(`Found ${schedules.length} schedules matching query`);
    
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
      route,
      distance,
      duration,
      notes,
      wasteType
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
    
    // If route is updated, recalculate the distance if not provided
    if (route) {
      schedule.route = route;
      
      // If distance is not explicitly provided but route changes, recalculate it
      if (distance === undefined) {
        const { calculateDistance } = require('../services/routeOptimizationService');
        let totalDistance = 0;
        
        // Calculate distance using the existing function from routeOptimizationService
        for (let i = 0; i < route.length - 1; i++) {
          const [lon1, lat1] = route[i];
          const [lon2, lat2] = route[i + 1];
          totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
        }
        
        // Update the distance
        schedule.distance = Math.round(totalDistance * 100) / 100;
      } else {
        schedule.distance = distance;
      }
    } else if (distance !== undefined) {
      schedule.distance = distance;
    }
    
    // Update duration if provided
    if (duration !== undefined) {
      schedule.duration = duration;
    }
    
    // Auto-calculate end time based on start time and duration
    // This happens if either startTime or duration has changed
    if (schedule.startTime && schedule.duration) {
      const startDateTime = new Date(schedule.startTime);
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(startDateTime.getMinutes() + schedule.duration);
      schedule.endTime = endDateTime;
    }
    
    if (notes !== undefined) schedule.notes = notes;
    if (wasteType !== undefined) schedule.wasteType = wasteType;

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
    const startDate = new Date(`${fromDate as string}T00:00:00.000Z`);
    const endDate = new Date(`${toDate as string}T23:59:59.999Z`);
    
    // No need to set hours again since we're already doing it with the ISO strings
    console.log(`Weekly overview date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Aggregate schedules for the week, grouped by date and status
    const weeklyOverview = await Schedule.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        // Extract the date part only for grouping by day
        $addFields: {
          dateWithoutTime: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          }
        }
      },
      {
        $group: {
          _id: {
            date: "$dateWithoutTime", // Group by the date without time
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
    
    // Ensure all dates in the range have entries, even if there are no schedules
    const allDatesInRange = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Check if this date exists in the weeklyOverview
      const existingEntry = weeklyOverview.find(entry => entry.date === dateStr);
      
      if (!existingEntry) {
        // Add an empty entry for this date
        allDatesInRange.push({
          date: dateStr,
          statusCounts: [],
          totalCount: 0
        });
      } else {
        // Use the existing entry
        allDatesInRange.push(existingEntry);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Weekly overview results:`, JSON.stringify(allDatesInRange, null, 2));
    
    res.json({
      success: true,
      data: allDatesInRange
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
    const { areaId, wasteType, fillThreshold = 70 } = req.body;

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

    // Get bins of the specified waste type in the area with fill level above the threshold
    const bins = await Bin.find({
      area: areaId,
      wasteType,
      fillLevel: { $gte: fillThreshold },  // Only include bins with fill level >= threshold
      status: { $in: ['ACTIVE', 'MAINTENANCE'] }
    }).lean();

    if (bins.length === 0) {
      res.status(400).json({
        success: false,
        message: `No ${wasteType} bins with fill level >= ${fillThreshold}% found in the area`
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

      // Create a date object for tomorrow but use proper UTC date handling
      const scheduleDate = new Date(`${format(tomorrow, 'yyyy-MM-dd')}T00:00:00.000Z`);
      
      // Set the start time to 8:00 AM
      const scheduleStartTime = new Date(`${format(tomorrow, 'yyyy-MM-dd')}T08:00:00.000Z`);
      
      // Duration is now directly usable from the route optimization service
      const scheduleDuration = routeResult.duration as number;
      
      // Calculate end time based on start time and duration
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
        notes: `Auto-generated schedule for ${wasteType} waste collection due to high fill levels (${fillThreshold}%+)`
      });

      await newSchedule.save();

      res.status(201).json({
        success: true,
        message: `Schedule automatically generated for ${wasteType} collection in ${area.name} for ${format(scheduleDate, 'EEEE, MMMM d')} (${bins.length} bins with fill level >= ${fillThreshold}%)`,
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