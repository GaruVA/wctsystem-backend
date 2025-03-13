import { Request, Response } from 'express';
import { getDirectionsFromORS, getRemainingDistance } from '../services/navigationService';
import CollectorLocation from '../models/CollectorLocation';

export class NavigationController {
  /**
   * Get turn-by-turn directions
   */
  static async getDirections(req: Request, res: Response): Promise<void> {
    try {
      const { current, destination } = req.body;

      if (!current?.length || !destination?.length) {
        res.status(400).json({
          success: false,
          message: 'Current location and destination coordinates are required'
        });
        return;
      }

      const directions = await getDirectionsFromORS(current, destination);
      
      res.status(200).json({
        success: true,
        data: directions
      });
    } catch (error) {
      console.error('Error getting directions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve directions'
      });
    }
  }

  /**
   * Get remaining distance to destination
   */
  static async getRemainingDistance(req: Request, res: Response): Promise<void> {
    try {
      const { current, destination } = req.body;

      if (!current?.length || !destination?.length) {
        res.status(400).json({
          success: false,
          message: 'Current location and destination coordinates are required'
        });
        return;
      }

      const distance = await getRemainingDistance(current, destination);
      
      res.status(200).json({
        success: true,
        distance
      });
    } catch (error) {
      console.error('Error getting remaining distance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate remaining distance'
      });
    }
  }

  /**
   * Update collector's current location
   */
  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude } = req.body;
      const collectorId = req.user?.id;

      if (!collectorId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Valid latitude and longitude are required'
        });
        return;
      }

      const location = new CollectorLocation({
        collectorId,
        latitude,
        longitude,
        timestamp: new Date()
      });

      await location.save();

      res.status(201).json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location'
      });
    }
  }

  /**
   * Get collector's location history
   */
  static async getLocationHistory(req: Request, res: Response): Promise<void> {
    try {
      const collectorId = req.user?.id;
      const { startTime, endTime } = req.query;

      const query: any = { collectorId };
      
      if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = new Date(startTime as string);
        if (endTime) query.timestamp.$lte = new Date(endTime as string);
      }

      const locations = await CollectorLocation.find(query)
        .sort({ timestamp: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        locations
      });
    } catch (error) {
      console.error('Error fetching location history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve location history'
      });
    }
  }
}