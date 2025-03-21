import { Request, Response } from 'express';
import Collector from '../models/Collector';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { IArea } from '../models/Area';
import { IBin } from '../models/Bin';
import Area from '../models/Area';  // New import for alternative method
import Bin from '../models/Bin';    // ...existing import...
import Dump from '../models/Dump';
import { IDump } from '../models/Dump';
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

export const createCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, postalCode } = req.body;
  try {
    const newCollector = new Collector({ username, password, email, postalCode });
    await newCollector.save();
    res.status(201).json({ message: 'Collector account created successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Collector already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCollectorArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const collector = await Collector.findById(req.user?.id);
    if (!collector?.area) {
      res.status(404).json({ message: 'No area assigned' });
      return;
    }
    
    // First get the area without population
    const area = await Area.findById(collector.area);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Separately get the dump to handle potential errors
    let dumpLocation = { type: "Point", coordinates: [0, 0] };
    try {
      const dump = await Dump.findById(area.dump) as IDump;
      if (dump) {
        dumpLocation.coordinates = dump.coordinates;
      }
    } catch (dumpError) {
      console.error('Error fetching dump:', dumpError);
      // Continue with default dump location
    }
    
    const bins = await Bin.find({ area: area._id }).select('fillLevel lastCollected location') as IBin[];
    
    // Map bins and add address to each bin
    const mappedBinsPromises = bins.map(async bin => {
      // Get address for this bin's coordinates
      const address = await getAddressFromCoordinates(bin.location.coordinates);
      
      return {
        _id: bin._id,
        location: bin.location,
        fillLevel: bin.fillLevel,
        lastCollected: bin.lastCollected,
        address // Add address to bin data
      };
    });
    
    // Wait for all address lookups to complete
    const mappedBins = await Promise.all(mappedBinsPromises);

    console.log('Collector area data prepared', {
      areaName: area.name,
      binCount: mappedBins.length,
      hasDumpLocation: !!dumpLocation
    });

    res.json({
      areaName: area.name,
      areaID: area._id,
      coordinates: area.coordinates,
      bins: mappedBins,
      dumpLocation
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
    
    // Return the current location, updated timestamp is available from the document
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
    // Check if user is authenticated and has a valid ID
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
      { currentLocation: [longitude, latitude] },
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

export const addCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, areaId } = req.body;
  try {
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    const newCollector = new Collector({ username, password, email, area: areaId });
    await newCollector.save();
    res.status(201).json(newCollector);
  } catch (error) {
    console.error('Error adding collector:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const assignCollectorToArea = async (req: Request, res: Response): Promise<void> => {
  const { collectorId, areaId } = req.body;
  try {
    const collector = await Collector.findById(collectorId);
    const area = await Area.findById(areaId);
    if (!collector || !area) {
      res.status(404).json({ message: 'Collector or Area not found' });
      return;
    }
    collector.area = areaId;
    await collector.save();
    res.status(200).json(collector);
  } catch (error) {
    console.error('Error assigning collector to area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all collectors
 */
export const getAllCollectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const collectors = await Collector.find();
    res.json(collectors);
  } catch (error) {
    console.error('Error fetching collectors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a collector by ID
 */
export const getCollectorById = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  try {
    const collector = await Collector.findById(collectorId);
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
 * Update a collector
 */
export const updateCollector = async (req: Request, res: Response): Promise<void> => {
  const { collectorId } = req.params;
  const { username, email, area } = req.body;
  try {
    const updatedCollector = await Collector.findByIdAndUpdate(
      collectorId,
      { username, email, area },
      { new: true }
    );
    if (!updatedCollector) {
      res.status(404).json({ message: 'Collector not found' });
      return;
    }
    res.json(updatedCollector);
  } catch (error) {
    console.error('Error updating collector:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a collector
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