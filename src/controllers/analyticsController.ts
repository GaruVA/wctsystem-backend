import { Request, Response } from 'express';
import Bin from '../models/Bin';

export const getFillLevelTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected wasteTypes').populate('area', 'name');
    const trends = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      if (!acc[areaName]) {
        acc[areaName] = [];
      }
      acc[areaName].push({
        fillLevel: bin.fillLevel,
        lastCollected: bin.lastCollected,
        wasteTypes: bin.wasteTypes
      });
      return acc;
    }, {} as Record<string, { fillLevel: number; lastCollected: Date; wasteTypes: string }[]>);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching fill level trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected wasteTypes').populate('area', 'name');
    
    // Group analytics by both area and waste type
    const analytics = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      const wasteType = bin.wasteTypes;
      
      // Create area if it doesn't exist
      if (!acc[areaName]) {
        acc[areaName] = {
          utilization: 0,
          collectionEfficiency: 0,
          serviceDelay: 0,
          bins: 0,
          totalFillLevel: 0,
          totalCollections: 0,
          totalServiceDelay: 0,
          wasteTypeDistribution: {}
        };
      }
      
      // Update waste type distribution
      if (!acc[areaName].wasteTypeDistribution[wasteType]) {
        acc[areaName].wasteTypeDistribution[wasteType] = 0;
      }
      acc[areaName].wasteTypeDistribution[wasteType]++;
      
      // Update general analytics
      acc[areaName].totalFillLevel += bin.fillLevel;
      acc[areaName].bins += 1;
      if (bin.lastCollected) {
        acc[areaName].totalCollections += 1;
        const timeSinceLastCollection = (new Date().getTime() - new Date(bin.lastCollected).getTime()) / (1000 * 60 * 60); // in hours
        acc[areaName].totalServiceDelay += timeSinceLastCollection;
      }
      return acc;
    }, {} as Record<string, { 
      utilization: number; 
      collectionEfficiency: number; 
      serviceDelay: number; 
      bins: number; 
      totalFillLevel: number; 
      totalCollections: number; 
      totalServiceDelay: number;
      wasteTypeDistribution: Record<string, number>;
    }>);

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

export const getAnalyticsByWasteType = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel wasteTypes lastCollected');
    
    // Group bins by waste type
    const wasteTypeAnalytics = bins.reduce((acc, bin) => {
      const wasteType = bin.wasteTypes;
      
      if (!acc[wasteType]) {
        acc[wasteType] = {
          count: 0,
          averageFillLevel: 0,
          totalFillLevel: 0,
          needsCollection: 0 // Bins with fill level > 70%
        };
      }
      
      acc[wasteType].count++;
      acc[wasteType].totalFillLevel += bin.fillLevel;
      
      if (bin.fillLevel > 70) {
        acc[wasteType].needsCollection++;
      }
      
      return acc;
    }, {} as Record<string, {
      count: number;
      averageFillLevel: number;
      totalFillLevel: number;
      needsCollection: number;
    }>);
    
    // Calculate averages
    for (const wasteType in wasteTypeAnalytics) {
      const data = wasteTypeAnalytics[wasteType];
      data.averageFillLevel = data.totalFillLevel / data.count;
    }
    
    res.json(wasteTypeAnalytics);
  } catch (error) {
    console.error('Error fetching waste type analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};