import { Request, Response, NextFunction } from 'express';
import Bin from '../models/Bin';
import Issue from '../models/Issue';
import Area from '../models/Area'; // Import the Area model
import { getFormattedAddress } from '../services/geocodingService'; // Import geocoding service
import { findAreaForBin } from '../services/geoSpatialService'; // Import the new geoSpatial service

// Function to update bin data
export const updateBin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { binId } = req.params;
    const { fillLevel, location, wasteType, status } = req.body;

    try {
        // Create update object
        const updateData: any = {};
        
        if (fillLevel !== undefined) {
            updateData.fillLevel = fillLevel;
        }
        
        if (wasteType) {
            updateData.wasteType = wasteType;
        }
        
        if (status) {
            updateData.status = status;
        }
        
        // Generate and store address if location is provided
        if (location && location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
            updateData.location = {
                type: 'Point',
                coordinates: location.coordinates
            };
            updateData.address = await getFormattedAddress(location.coordinates);
            
            // Auto-assign area based on coordinates
            const areaId = await findAreaForBin(location.coordinates);
            updateData.area = areaId; // Will be null if no area contains this point
            console.log(`[Backend] Auto-assigned bin to area: ${areaId}`);
        }
        
        const updatedBin = await Bin.findByIdAndUpdate(
            binId,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedBin) {
            res.status(404).json({ message: 'Bin not found' });
            return;
        }
        
        res.status(200).json(updatedBin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update bin data.' });
    }
};

/**
 * Direct method to update a bin's fill level and optionally lastCollected date
 */
export const updateBinFillLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { binId } = req.params;
    const { fillLevel, lastCollected, wasteType } = req.body;
    
    console.log(`[Backend] Updating fill level for bin ${binId} to ${fillLevel}%`);
    
    // Prepare update object
    const updateData: any = { fillLevel };
    if (lastCollected) {
      updateData.lastCollected = new Date(lastCollected);
    }
    if (wasteType) {
      updateData.wasteType = wasteType;
    }
    
    // Find the bin by ID and update its fill level
    const updatedBin = await Bin.findByIdAndUpdate(
      binId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedBin) {
      console.log(`[Backend] Bin ${binId} not found for fill level update`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    console.log(`[Backend] Successfully updated bin ${binId} fill level to ${fillLevel}%`);
    res.status(200).json({
      success: true,
      bin: updatedBin
    });
  } catch (error) {
    console.error('[Backend] Error updating bin fill level:', error);
    res.status(500).json({ message: 'Failed to update bin fill level.' });
  }
};

/**
 * Direct update method for bin data used by the simulator
 */
export const directUpdateBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId, updates } = req.body;
    
    console.log(`[Backend] Direct update for bin ${binId}:`, updates);
    
    // Check if location is being updated
    if (updates.location && updates.location.coordinates && 
        Array.isArray(updates.location.coordinates) && 
        updates.location.coordinates.length === 2) {
      
      // Auto-assign area based on new coordinates
      const areaId = await findAreaForBin(updates.location.coordinates);
      updates.area = areaId; // Will be null if not within any area
      console.log(`[Backend] Auto-assigned bin to area: ${areaId || 'None (outside all areas)'}`);
      
      // Update address if needed
      if (!updates.address) {
        updates.address = await getFormattedAddress(updates.location.coordinates);
      }
    }
    
    // Find and update the bin
    const updatedBin = await Bin.findByIdAndUpdate(
      binId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedBin) {
      console.log(`[Backend] Bin ${binId} not found for direct update`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }
    
    console.log(`[Backend] Successfully updated bin ${binId}`);
    res.status(200).json({
      success: true,
      bin: updatedBin
    });
  } catch (error) {
    console.error('[Backend] Error in direct bin update:', error);
    res.status(500).json({ message: 'Failed to update bin.' });
  }
};

// Add new function to create bins
export const createBin = async (req: Request, res: Response): Promise<void> => {
    const { wasteType, location, status } = req.body;

    try {
        // Validate location
        if (!location || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
            res.status(400).json({ message: 'Valid location coordinates are required' });
            return;
        }
        
        // Generate address from coordinates
        let address = undefined;
        if (location && location.coordinates) {
            address = await getFormattedAddress(location.coordinates);
        }

        // Auto-assign area based on coordinates
        const areaId = await findAreaForBin(location.coordinates);
        console.log(`[Backend] Auto-assigned new bin to area: ${areaId || 'None (outside all areas)'}`);

        const newBin = new Bin({
            location: {
                type: 'Point',
                coordinates: location.coordinates
            },
            fillLevel: 0, // Initialize empty
            wasteType: wasteType || 'GENERAL', // Default to GENERAL if not specified
            address, // Add the address
            area: areaId, // Auto-assigned area (null if not within any area)
            status: status || 'ACTIVE' // Default to ACTIVE if not specified
        });

        await newBin.save();
        res.status(201).json(newBin);
    } catch (error: any) {
        if (error.code === 11000) { // MongoDB duplicate key error
            res.status(409).json({ message: 'Bin already exists' });
            return;
        }
        res.status(500).json({ message: 'Failed to create bin.' });
    }
};

// Function to fetch all bin statuses
export const getBins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const bins = await Bin.find({});
        res.status(200).json(bins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch bin data.' });
    }
};

export const getBinDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { binId } = req.params;
    const bin = await Bin.findById(binId).select('location fillLevel lastCollected wasteType status');
    if (!bin) {
      res.status(404).json({ message: 'Bin not found' });
      return;
    }
    
    res.status(200).json({
      _id: bin._id,
      location: bin.location,
      fillLevel: bin.fillLevel,
      lastCollected: bin.lastCollected,
      status: bin.status || 'ACTIVE', // Use the stored status or default to ACTIVE
      wasteType: bin.wasteType
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bin details.' });
  }
};

/**
 * Mark a bin as collected by setting its fill level to 0 and updating the lastCollected timestamp
 */
export const collectBin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { binId } = req.params;
    console.log(`[Backend] Marking bin ${binId} as collected`);
    
    // Find the bin by ID and update its fill level and lastCollected timestamp
    const updatedBin = await Bin.findByIdAndUpdate(
      binId,
      { 
        fillLevel: 0, 
        lastCollected: new Date() 
      },
      { new: true, runValidators: true }
    ).select('location fillLevel lastCollected wasteType');

    if (!updatedBin) {
      console.log(`[Backend] Bin ${binId} not found`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    console.log(`[Backend] Bin ${binId} marked as collected successfully`);
    res.status(200).json({
      success: true,
      bin: {
        _id: updatedBin._id,
        location: updatedBin.location,
        fillLevel: updatedBin.fillLevel,
        lastCollected: updatedBin.lastCollected,
        wasteType: updatedBin.wasteType
      }
    });
  } catch (error) {
    console.error('[Backend] Error collecting bin:', error);
    res.status(500).json({ message: 'Failed to mark bin as collected.' });
  }
};

export const reportIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let { binId } = req.params;
    // Remove leading '$' if present
    if (binId.startsWith('$')) {
      binId = binId.slice(1);
    }
    const { issueType, description } = req.body;
    console.log(`[Backend] Received report for binId=${binId}, issueType=${issueType}`);
    
    const issueData: { bin: string; issueType: string; description?: string } = {
      bin: binId,
      issueType
    };
    
    // Only add description if it's provided
    if (description) {
      issueData.description = description;
    }
    
    const newIssue = new Issue(issueData);
    await newIssue.save();
    console.log('[Backend] New issue saved successfully');
    res.status(201).json({ message: 'Issue reported successfully' });
  } catch (error) {
    console.error('[Backend] Error reporting issue:', error);
    res.status(500).json({ message: 'Failed to report issue.' });
  }
};

export const assignBinToArea = async (req: Request, res: Response): Promise<void> => {
  const { binId, areaId } = req.body;
  try {
    const bin = await Bin.findById(binId);
    const area = await Area.findById(areaId);
    if (!bin || !area) {
      res.status(404).json({ message: 'Bin or Area not found' });
      return;
    }
    bin.area = areaId;
    await bin.save();
    res.status(200).json(bin);
  } catch (error) {
    console.error('Error assigning bin to area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new function to update a bin's waste type
export const updateBinWasteType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId } = req.params;
    const { wasteType } = req.body;
    
    console.log(`[Backend] Updating waste type for bin ${binId} to ${wasteType}`);
    
    if (!['GENERAL', 'ORGANIC', 'HAZARDOUS', 'RECYCLE'].includes(wasteType)) {
      res.status(400).json({ message: 'Invalid waste type. Must be one of: GENERAL, ORGANIC, HAZARDOUS, RECYCLE' });
      return;
    }
    
    const updatedBin = await Bin.findByIdAndUpdate(
      binId,
      { wasteType },
      { new: true, runValidators: true }
    );

    if (!updatedBin) {
      console.log(`[Backend] Bin ${binId} not found for waste type update`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    console.log(`[Backend] Successfully updated bin ${binId} waste type to ${wasteType}`);
    res.status(200).json({
      success: true,
      bin: updatedBin
    });
  } catch (error) {
    console.error('[Backend] Error updating bin waste type:', error);
    res.status(500).json({ message: 'Failed to update bin waste type.' });
  }
};

// Add a function to filter bins by waste type
export const getBinsByWasteType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { wasteType } = req.params;
    
    if (!['GENERAL', 'ORGANIC', 'HAZARDOUS', 'RECYCLE'].includes(wasteType)) {
      res.status(400).json({ message: 'Invalid waste type. Must be one of: GENERAL, ORGANIC, HAZARDOUS, RECYCLE' });
      return;
    }
    
    const bins = await Bin.find({ wasteType: wasteType });
    res.status(200).json(bins);
  } catch (error) {
    console.error('[Backend] Error fetching bins by waste type:', error);
    res.status(500).json({ message: 'Failed to fetch bins by waste type.' });
  }
};

// Add a function to filter bins by status
export const getBinsByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;
    
    if (!['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'PENDING_INSTALLATION'].includes(status)) {
      res.status(400).json({ 
        message: 'Invalid status. Must be one of: ACTIVE, MAINTENANCE, INACTIVE, PENDING_INSTALLATION' 
      });
      return;
    }
    
    const bins = await Bin.find({ status: status });
    res.status(200).json(bins);
  } catch (error) {
    console.error('[Backend] Error fetching bins by status:', error);
    res.status(500).json({ message: 'Failed to fetch bins by status.' });
  }
};

// Add a function to update a bin's status
export const updateBinStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId } = req.params;
    const { status } = req.body;
    
    console.log(`[Backend] Updating status for bin ${binId} to ${status}`);
    
    if (!['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'PENDING_INSTALLATION'].includes(status)) {
      res.status(400).json({ 
        message: 'Invalid status. Must be one of: ACTIVE, MAINTENANCE, INACTIVE, PENDING_INSTALLATION' 
      });
      return;
    }
    
    const updatedBin = await Bin.findByIdAndUpdate(
      binId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedBin) {
      console.log(`[Backend] Bin ${binId} not found for status update`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    console.log(`[Backend] Successfully updated bin ${binId} status to ${status}`);
    res.status(200).json({
      success: true,
      bin: updatedBin
    });
  } catch (error) {
    console.error('[Backend] Error updating bin status:', error);
    res.status(500).json({ message: 'Failed to update bin status.' });
  }
};

// Add a function to delete a bin permanently
export const deleteBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId } = req.params;
    
    console.log(`[Backend] Deleting bin ${binId} permanently`);
    
    // Delete the bin from the database
    const deletedBin = await Bin.findByIdAndDelete(binId);

    if (!deletedBin) {
      console.log(`[Backend] Bin ${binId} not found for deletion`);
      res.status(404).json({ message: 'Bin not found' });
      return;
    }
    
    console.log(`[Backend] Successfully deleted bin ${binId}`);
    res.status(200).json({
      success: true,
      message: 'Bin deleted successfully'
    });
  } catch (error) {
    console.error('[Backend] Error deleting bin:', error);
    res.status(500).json({ message: 'Failed to delete bin.' });
  }
};