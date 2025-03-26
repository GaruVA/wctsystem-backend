import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Area from '../models/Area';
import Bin from '../models/Bin';
import Collector from '../models/Collector';

export const addArea = async (req: Request, res: Response): Promise<void> => {
  const { name, geometry, startLocation, endLocation } = req.body;

  // Validate geometry
  if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates) || 
      !geometry.coordinates[0] || !Array.isArray(geometry.coordinates[0])) {
    res.status(400).json({ message: 'Geometry must contain valid coordinates for a polygon' });
    return;
  }

  // Validate start location
  if (!startLocation || !Array.isArray(startLocation.coordinates) || startLocation.coordinates.length !== 2) {
    res.status(400).json({ message: 'startLocation must contain valid coordinates [longitude, latitude]' });
    return;
  }

  // Validate end location
  if (!endLocation || !Array.isArray(endLocation.coordinates) || endLocation.coordinates.length !== 2) {
    res.status(400).json({ message: 'endLocation must contain valid coordinates [longitude, latitude]' });
    return;
  }

  try {
    const newArea = new Area({ 
      name, 
      geometry, 
      startLocation, 
      endLocation 
    });
    await newArea.save();
    res.status(201).json(newArea);
  } catch (error) {
    console.error('Error adding area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeArea = async (req: Request, res: Response): Promise<void> => {
  const { areaId } = req.params;
  try {
    await Area.findByIdAndDelete(areaId);
    res.status(200).json({ message: 'Area removed successfully' });
  } catch (error) {
    console.error('Error removing area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all areas with their start and end locations
export const getAreas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const areas = await Area.find();
    res.status(200).json(areas);
  } catch (error) {
    console.error('[Area Controller] Error fetching areas:', error);
    res.status(500).json({ message: 'Failed to fetch areas.' });
  }
};

// Get a specific area with boundary, start and end locations
export const getAreaDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    const area = await Area.findById(areaId);
    
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    res.status(200).json(area);
  } catch (error) {
    console.error('[Area Controller] Error fetching area details:', error);
    res.status(500).json({ message: 'Failed to fetch area details.' });
  }
};

// Create a new area with boundary, start and end locations
export const createArea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, geometry, startLocation, endLocation } = req.body;
    
    const newArea = new Area({
      name,
      geometry,
      startLocation,
      endLocation
    });
    
    await newArea.save();
    res.status(201).json({ message: 'Area created successfully', area: newArea });
  } catch (error) {
    console.error('[Area Controller] Error creating area:', error);
    res.status(500).json({ message: 'Failed to create area.' });
  }
};

// Update an existing area
export const updateArea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    const { name, geometry, startLocation, endLocation } = req.body;
    
    const updatedArea = await Area.findByIdAndUpdate(
      areaId,
      {
        name,
        geometry,
        startLocation,
        endLocation
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedArea) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    res.status(200).json({ message: 'Area updated successfully', area: updatedArea });
  } catch (error) {
    console.error('[Area Controller] Error updating area:', error);
    res.status(500).json({ message: 'Failed to update area.' });
  }
};

// Delete an area and reassign bins and collectors
export const deleteArea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    const { reassignToAreaId } = req.body;
    
    // Check if the area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // If there's a reassignment area, update all bins and collectors
    if (reassignToAreaId) {
      // Check if reassignment area exists
      const reassignArea = await Area.findById(reassignToAreaId);
      if (!reassignArea) {
        res.status(400).json({ message: 'Reassignment area not found' });
        return;
      }
      
      // Update bins
      await Bin.updateMany(
        { area: areaId },
        { $set: { area: reassignToAreaId } }
      );
      
      // Update collectors
      await Collector.updateMany(
        { area: areaId },
        { $set: { area: reassignToAreaId } }
      );
    }
    
    // Delete the area
    await Area.findByIdAndDelete(areaId);
    res.status(200).json({ message: 'Area deleted successfully' });
  } catch (error) {
    console.error('[Area Controller] Error deleting area:', error);
    res.status(500).json({ message: 'Failed to delete area.' });
  }
};

// Get all bins in an area
export const getAreaBins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    
    // Check if the area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Find all bins in this area
    const bins = await Bin.find({ area: areaId });
    res.status(200).json(bins);
  } catch (error) {
    console.error('[Area Controller] Error fetching area bins:', error);
    res.status(500).json({ message: 'Failed to fetch area bins.' });
  }
};

// Get all collectors in an area
export const getAreaCollectors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { areaId } = req.params;
    
    // Check if the area exists
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Find all collectors in this area
    const collectors = await Collector.find({ area: areaId }).select('-password');
    res.status(200).json(collectors);
  } catch (error) {
    console.error('[Area Controller] Error fetching area collectors:', error);
    res.status(500).json({ message: 'Failed to fetch area collectors.' });
  }
};