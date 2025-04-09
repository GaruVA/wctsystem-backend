import { Request, Response } from 'express';
import Bin from '../models/Bin';

// Get nearby bins - No authentication required
export const getNearbyBins = async (req: Request, res: Response): Promise<void> => {
  console.log('==== GET NEARBY BINS REQUEST RECEIVED ====');
  console.log('Query parameters:', req.query);
  
  try {
    const { latitude, longitude, radius = 500 } = req.query;

    if (!latitude || !longitude) {
      console.log('ERROR: Missing required parameters - latitude or longitude not provided');
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    // Convert to numbers
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusInMeters = parseInt(radius as string);
    
    console.log(`Searching for bins near [${lat}, ${lng}] within ${radiusInMeters}m radius`);

    // Find bins within the radius
    console.log('Executing MongoDB geospatial query...');
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
    
    console.log(`Found ${bins.length} bins within the specified radius`);
    if (bins.length > 0) {
      console.log('Sample bin data:', JSON.stringify(bins[0], null, 2));
    }

    res.status(200).json({
      message: 'Bins retrieved successfully',
      bins,
    });
    console.log('==== GET NEARBY BINS REQUEST COMPLETED ====');
  } catch (error) {
    console.error('ERROR getting nearby bins:', error);
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