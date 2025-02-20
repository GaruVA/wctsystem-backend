import { Request, Response, NextFunction } from 'express';
import Bin from '../models/Bin';
import Issue from '../models/Issue';

// Function to update bin data
export const updateBin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { bin_id, fill_level, latitude, longitude, timestamp } = req.body;

    try {
        const updatedBin = await Bin.findOneAndUpdate(
            { bin_id },
            { fill_level, latitude, longitude, timestamp },
            { new: true, upsert: true }
        );
        res.status(200).json(updatedBin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update bin data.' });
    }
};

// Add new function to create bins
export const createBin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { bin_id, latitude, longitude } = req.body;

    try {
        const newBin = new Bin({
            bin_id,
            fill_level: 0, // Initialize empty
            latitude,
            longitude,
            timestamp: new Date().toISOString()
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
    const bin = await Bin.findById(binId).select('location fillLevel lastCollected');
    if (!bin) {
      res.status(404).json({ message: 'Bin not found' });
      return;
    }
    // Add default status since it's not stored in the model.
    res.status(200).json({
      _id: bin._id,
      location: bin.location,
      fillLevel: bin.fillLevel,
      lastCollected: bin.lastCollected,
      status: "normal"
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bin details.' });
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
    const newIssue = new Issue({
      bin: binId,
      issueType,
      description
    });
    await newIssue.save();
    console.log('[Backend] New issue saved successfully');
    res.status(201).json({ message: 'Issue reported successfully' });
  } catch (error) {
    console.error('[Backend] Error reporting issue:', error);
    res.status(500).json({ message: 'Failed to report issue.' });
  }
};