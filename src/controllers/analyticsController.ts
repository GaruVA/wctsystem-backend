import { Request, Response } from 'express';
import Bin from '../models/Bin';

export const getFillLevelTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected').populate('area', 'name');
    const trends = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      if (!acc[areaName]) {
        acc[areaName] = [];
      }
      acc[areaName].push({
        fillLevel: bin.fillLevel,
        lastCollected: bin.lastCollected
      });
      return acc;
    }, {} as Record<string, { fillLevel: number; lastCollected: Date }[]>);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching fill level trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected').populate('area', 'name');
    const analytics = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      if (!acc[areaName]) {
        acc[areaName] = {
          utilization: 0,
          collectionEfficiency: 0,
          serviceDelay: 0,
          bins: 0,
          totalFillLevel: 0,
          totalCollections: 0,
          totalServiceDelay: 0
        };
      }
      acc[areaName].totalFillLevel += bin.fillLevel;
      acc[areaName].bins += 1;
      if (bin.lastCollected) {
        acc[areaName].totalCollections += 1;
        const timeSinceLastCollection = (new Date().getTime() - new Date(bin.lastCollected).getTime()) / (1000 * 60 * 60); // in hours
        acc[areaName].totalServiceDelay += timeSinceLastCollection;
      }
      return acc;
    }, {} as Record<string, { utilization: number; collectionEfficiency: number; serviceDelay: number; bins: number; totalFillLevel: number; totalCollections: number; totalServiceDelay: number }>);

    // Calculate averages
    for (const areaName in analytics) {
      const areaData = analytics[areaName];
      areaData.utilization = areaData.totalFillLevel / areaData.bins;
      areaData.collectionEfficiency = areaData.totalCollections / areaData.bins;
      areaData.serviceDelay = areaData.totalServiceDelay / areaData.bins;
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};