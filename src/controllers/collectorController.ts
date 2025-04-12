import { Request, Response } from 'express';
import Collector from '../models/Collector';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { IArea } from '../models/Area';
import { IBin } from '../models/Bin';
import Area from '../models/Area';
import Bin from '../models/Bin';
import { getAddressFromCoordinates } from '../services/geocodingService';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

export const loginCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  try {
    const collector = await Collector.findOne({ username });
    if (!collector) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const isMatch = await collector.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { id: collector._id, role: 'collector' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get collector's assigned area with bins
export const getCollectorArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const collector = await Collector.findById(req.user?.id);
    if (!collector?.area) {
      res.status(404).json({ message: 'No area assigned' });
      return;
    }
    
    // Get the area with start and end locations
    const area = await Area.findById(collector.area);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Get bins in this area - include wasteType in selection
    const bins = await Bin.find({ area: area._id }).select('fillLevel lastCollected location wasteType') as IBin[];
    
    // Map bins and add address to each bin
    const mappedBinsPromises = bins.map(async bin => {
      // Get address for this bin's coordinates
      const address = await getAddressFromCoordinates(bin.location.coordinates);
      
      return {
        _id: bin._id,
        location: bin.location,
        fillLevel: bin.fillLevel,
        lastCollected: bin.lastCollected,
        wasteType: bin.wasteType,
        address // Add address to bin data
      };
    });
    
    // Wait for all address lookups to complete
    const mappedBins = await Promise.all(mappedBinsPromises);

    res.json({
      areaName: area.name,
      areaID: area._id,
      geometry: area.geometry,
      bins: mappedBins,
      startLocation: area.startLocation,
      endLocation: area.endLocation
    });
  } catch (error) {
    console.error('Error getting collector area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get the collector's current location
 */
export const getLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const collector = await Collector.findById(req.user?.id);
    
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    
    if (!collector.currentLocation) {
      res.status(404).json({ message: 'Location not available' });
      return;
    }
    
    // Return the current location
    res.json({ 
      currentLocation: collector.currentLocation,
      lastUpdate: collector.updatedAt
    });
  } catch (error) {
    console.error('Error getting collector location:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update the collector's current location
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { latitude, longitude } = req.body;
    
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({
        message: 'Valid latitude and longitude are required'
      });
      return;
    }

    // Update the collector's location
    const updatedCollector = await Collector.findByIdAndUpdate(
      req.user.id,
      { 
        currentLocation: [longitude, latitude],
        lastActive: new Date()
      },
      { new: true }
    );

    if (!updatedCollector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }

    res.json({
      message: 'Location updated successfully',
      currentLocation: updatedCollector.currentLocation,
      timestamp: updatedCollector.updatedAt
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

/**
 * Create a new collector (admin only)
 */
export const addCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, firstName, lastName, phone, areaId, status } = req.body;
  try {
    // Check if area exists if provided and not "unassigned"
    let area = undefined;
    if (areaId && areaId !== "unassigned") {
      const areaExists = await Area.findById(areaId);
      if (!areaExists) {
        res.status(404).json({ message: 'Area not found' });
        return;
      }
      area = areaId;
    }
    
    // Create collector with provided fields - omit currentLocation to avoid geo validation errors
    const collectorData: any = { 
      username, 
      password, 
      email, 
      firstName, 
      lastName,
      phone,
      area, // Will be undefined if areaId is "unassigned" or not provided
      status: status || 'active'
    };
    
    // Explicitly avoid setting currentLocation until coordinates are available
    
    const newCollector = new Collector(collectorData);
    
    await newCollector.save();
    res.status(201).json({
      message: 'Collector account created successfully',
      collector: newCollector
    });
  } catch (error: any) {
    console.error('Error adding collector:', error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Collector already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Assign collector to area (admin only)
 */
export const assignCollectorToArea = async (req: Request, res: Response): Promise<void> => {
  const { collectorId, areaId } = req.body;
  try {
    const collector = await Collector.findById(collectorId);
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }

    // Special case for "unassigned"
    if (areaId === "unassigned") {
      // Remove the area from the collector by setting it to null
      collector.area = null as any; // Cast to any to bypass TypeScript error
      await collector.save();
      res.status(200).json({
        message: 'Collector unassigned from area successfully',
        collector
      });
      return;
    }
    
    // Normal case - assign to an area
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    collector.area = areaId;
    await collector.save();
    res.status(200).json({
      message: 'Collector assigned to area successfully',
      collector
    });
  } catch (error) {
    console.error('Error assigning collector to area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all collectors (admin only)
 */
export const getAllCollectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const collectors = await Collector.find().populate('area', 'name');
    res.json(collectors);
  } catch (error) {
    console.error('Error fetching collectors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a collector by ID (admin only)
 */
export const getCollectorById = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  try {
    const collector = await Collector.findById(collectorId).populate('area', 'name');
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    res.json(collector);
  } catch (error) {
    console.error('Error fetching collector:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a collector (admin only)
 */
export const updateCollector = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  const { username, email, firstName, lastName, phone, area, status, efficiency } = req.body;

  try {
    // Build update object with provided fields
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    
    // Special handling for area
    if (area === "unassigned") {
      // Set to null if "unassigned"
      updateData.area = null;
    } else if (area) {
      // Otherwise check if area exists
      const areaExists = await Area.findById(area);
      if (!areaExists) {
        res.status(404).json({ message: 'Area not found' });
        return;
      }
      updateData.area = area;
    }
    
    if (status) updateData.status = status;
    if (efficiency !== undefined) {
      // Validate efficiency value is within acceptable range
      if (efficiency < 0 || efficiency > 100) {
        res.status(400).json({ message: 'Efficiency must be between 0 and 100' });
        return;
      }
      updateData.efficiency = efficiency;
    }
    
    const updatedCollector = await Collector.findByIdAndUpdate(
      collectorId,
      updateData,
      { new: true }
    );
    
    if (!updatedCollector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    
    res.json({
      message: 'Collector updated successfully',
      collector: updatedCollector
    });
  } catch (error) {
    console.error('Error updating collector:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a collector (admin only)
 */
export const deleteCollector = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  try {
    const deletedCollector = await Collector.findByIdAndDelete(collectorId);
    if (!deletedCollector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    res.json({ message: 'Collector deleted successfully' });
  } catch (error) {
    console.error('Error deleting collector:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update collector status (admin only)
 */
export const updateCollectorStatus = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  const { status } = req.body;
  
  // Validate status
  if (!['active', 'on-leave', 'inactive'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be active, on-leave, or inactive' });
    return;
  }
  
  try {
    const collector = await Collector.findByIdAndUpdate(
      collectorId,
      { status, lastActive: status === 'active' ? new Date() : undefined },
      { new: true }
    );
    
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    
    res.json({
      message: `Collector status updated to ${status}`,
      collector
    });
  } catch (error) {
    console.error('Error updating collector status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get active collectors (admin only)
 */
export const getActiveCollectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const collectors = await Collector.find({ status: 'active' })
      .select('-password')
      .populate('area', 'name');
      
    res.json({
      count: collectors.length,
      collectors
    });
  } catch (error) {
    console.error('Error getting active collectors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update collector efficiency (admin only)
 */
export const updateCollectorEfficiency = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  const { efficiency } = req.body;
  
  // Validate efficiency
  if (efficiency === undefined || typeof efficiency !== 'number') {
    res.status(400).json({ message: 'Efficiency value is required and must be a number' });
    return;
  }
  
  if (efficiency < 0 || efficiency > 100) {
    res.status(400).json({ message: 'Efficiency must be between 0 and 100' });
    return;
  }
  
  try {
    const collector = await Collector.findByIdAndUpdate(
      collectorId,
      { efficiency },
      { new: true }
    );
    
    if (!collector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    
    res.json({
      message: 'Collector efficiency updated successfully',
      collector
    });
  } catch (error) {
    console.error('Error updating collector efficiency:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get collectors efficiency statistics (admin only)
 */
export const getCollectorEfficiencyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const collectors = await Collector.find().select('efficiency status firstName lastName username');
    
    // Calculate overall average efficiency
    const activeCollectors = collectors.filter(c => c.status === 'active');
    const avgEfficiency = activeCollectors.reduce((sum, collector) => {
      return sum + (collector.efficiency || 0);
    }, 0) / (activeCollectors.length || 1);
    
    // Group collectors by efficiency ranges
    const excellentCount = collectors.filter(c => c.efficiency && c.efficiency >= 90).length;
    const goodCount = collectors.filter(c => c.efficiency && c.efficiency >= 75 && c.efficiency < 90).length;
    const averageCount = collectors.filter(c => c.efficiency && c.efficiency >= 60 && c.efficiency < 75).length;
    const poorCount = collectors.filter(c => c.efficiency && c.efficiency < 60).length;
    
    // Find top performers (top 5 by efficiency)
    const topPerformers = [...collectors]
      .filter(c => c.status === 'active')
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, 5);
    
    res.json({
      avgEfficiency,
      distribution: {
        excellent: excellentCount,
        good: goodCount,
        average: averageCount, 
        poor: poorCount
      },
      topPerformers,
      totalCollectors: collectors.length,
      activeCollectors: activeCollectors.length
    });
  } catch (error) {
    console.error('Error getting collector efficiency stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};