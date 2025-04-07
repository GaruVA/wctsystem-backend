import { Request, Response } from 'express';
import Bin from '../models/Bin';

// Get nearby bins - No authentication required
export const getNearbyBins = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, radius = 500 } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    // Convert to numbers
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusInMeters = parseInt(radius as string);

    // Find bins within the radius
    const bins = await Bin.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat], // GeoJSON format is [longitude, latitude]
          },
          $maxDistance: radiusInMeters, // Distance in meters
        },
      },
    });

    res.status(200).json({
      message: 'Bins retrieved successfully',
      bins,
    });
  } catch (error) {
    console.error('Error getting nearby bins:', error);
    res.status(500).json({ message: 'Server error while fetching nearby bins' });
  }
};

// Get bin details by ID
export const getBinDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId } = req.params;

    const bin = await Bin.findById(binId);
    
    if (!bin) {
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    res.status(200).json({
      message: 'Bin details retrieved successfully',
      bin,
    });
  } catch (error) {
    console.error('Error getting bin details:', error);
    res.status(500).json({ message: 'Server error while fetching bin details' });
  }
};