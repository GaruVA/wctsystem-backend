import { Request, Response, NextFunction } from 'express';
import Schedule, { ISchedule } from '../models/Schedule';
import Route, { IRoute } from '../models/Route';
import Area from '../models/Area';
import Collector from '../models/Collector';
import mongoose, { Schema } from 'mongoose';

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
      route,
      status = 'scheduled'
    } = req.body;

    // Validate required fields
    if (!name || !areaId || !date || !route || !route.coordinates) {
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

    // First create the route
    const routeData: Partial<IRoute> = {
      coordinates: route.coordinates,
      distance: route.distance || '0 km',
      duration: route.duration || '0 min',
      fillLevelThreshold: route.fillLevelThreshold || 70,
      areaId: areaId as unknown as Schema.Types.ObjectId
    };

    const newRoute = new Route(routeData);
    await newRoute.save();

    // Then create the schedule with a reference to the route
    const scheduleData: Partial<ISchedule> = {
      name,
      areaId: areaId as unknown as Schema.Types.ObjectId,
      routeId: newRoute._id as Schema.Types.ObjectId,
      date: new Date(date),
      status: status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
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

    // Create and save the schedule
    const newSchedule = new Schedule(scheduleData);
    await newSchedule.save();

    res.status(201).json({
      ...newSchedule.toObject(),
      route: newRoute.toObject()
    });
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
    
    // Get schedules with pagination - now populate routeId too
    const schedules = await Schedule.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('areaId', 'name')
      .populate('routeId')
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
    
    const schedule = await Schedule.findById(id)
      .populate('areaId', 'name geometry startLocation endLocation')
      .populate('routeId')
      .populate('collectorId', 'firstName lastName email phone');
    
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
      route
    } = req.body;

    // Find the schedule
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      res.status(404).json({ message: 'Schedule not found' });
      return;
    }

    // Update route if provided
    if (route) {
      const routeDoc = await Route.findById(schedule.routeId);
      if (!routeDoc) {
        res.status(404).json({ message: 'Route not found' });
        return;
      }
      
      if (route.coordinates) routeDoc.coordinates = route.coordinates;
      if (route.distance) routeDoc.distance = route.distance;
      if (route.duration) routeDoc.duration = route.duration;
      if (route.fillLevelThreshold) routeDoc.fillLevelThreshold = route.fillLevelThreshold;
      
      await routeDoc.save();
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

    // Save updated schedule
    await schedule.save();
    
    // Return the updated schedule with its route
    const updatedSchedule = await Schedule.findById(id)
      .populate('routeId')
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
    
    // Delete the associated route as well
    if (schedule.routeId) {
      await Route.findByIdAndDelete(schedule.routeId);
    }
    
    // Delete the schedule
    await Schedule.findByIdAndDelete(id);
    
    res.json({ message: 'Schedule and associated route deleted successfully' });
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