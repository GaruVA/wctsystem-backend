import { Request, Response, NextFunction } from 'express';
import Bin from '../models/Bin';

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