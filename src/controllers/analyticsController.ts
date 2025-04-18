import { Request, Response } from 'express';
import Bin from '../models/Bin';
import Area from '../models/Area';
import Collector from '../models/Collector';
import Schedule from '../models/Schedule';

export const getFillLevelTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected wasteType').populate('area', 'name');
    const trends = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      if (!acc[areaName]) {
        acc[areaName] = [];
      }
      acc[areaName].push({
        fillLevel: bin.fillLevel,
        lastCollected: bin.lastCollected,
        wasteType: bin.wasteType
      });
      return acc;
    }, {} as Record<string, { fillLevel: number; lastCollected: Date; wasteType: string }[]>);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching fill level trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected wasteType').populate('area', 'name');
    
    // Group analytics by both area and waste type
    const analytics = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;
      const wasteType = bin.wasteType;
      
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
    const bins = await Bin.find().select('fillLevel wasteType lastCollected');
    console.log(`Fetched ${bins.length} bins for waste type analytics`); // Debug log

    if (bins.length === 0) {
      res.status(404).json({ message: 'No bins found' });
    }

    // Group bins by waste type
    const wasteTypeAnalytics = bins.reduce((acc, bin) => {
      const wasteType = bin.wasteType;

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

export const getAreaStatusOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all areas
    const areas = await Area.find().select('name');

    // Get status data for each area
    const areaStatusPromises = areas.map(async (area) => {
      // Get bins in this area
      const bins = await Bin.find({ area: area._id }).select('fillLevel wasteType');
      
      // Calculate average fill level
      const totalFillLevel = bins.reduce((sum, bin) => sum + bin.fillLevel, 0);
      const averageFillLevel = bins.length > 0 ? totalFillLevel / bins.length : 0;
      
      // Count critical bins (> 80% full)
      const criticalBins = bins.filter(bin => bin.fillLevel > 80).length;
      
      // Count bins by waste type
      const wasteTypeCounts: Record<string, number> = {};
      bins.forEach(bin => {
        const wasteType = bin.wasteType;
        wasteTypeCounts[wasteType] = (wasteTypeCounts[wasteType] || 0) + 1;
      });
      
      // Get collectors in this area
      const collectors = await Collector.find({ area: area._id }).select('status');
      const activeCollectors = collectors.filter(collector => collector.status === 'active').length;
      
      // Get scheduled collections for this area (for the next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const schedules = await Schedule.find({
        areaId: area._id,
        date: { $gte: now, $lt: tomorrow },
        status: { $in: ['scheduled', 'in-progress'] }
      });
      
      // Calculate status
      let status: 'critical' | 'warning' | 'normal' = 'normal';
      if (criticalBins > 5 || averageFillLevel > 75) {
        status = 'critical';
      } else if (criticalBins > 2 || averageFillLevel > 60) {
        status = 'warning';
      }
      
      return {
        _id: area._id,
        name: area.name,
        binCount: bins.length,
        averageFillLevel,
        criticalBins,
        wasteTypeCounts,
        activeCollectors,
        scheduledCollections: schedules.length,
        status
      };
    });
    
    // Wait for all area status data to be collected
    const areaStatusData = await Promise.all(areaStatusPromises);
    
    res.json(areaStatusData);
  } catch (error) {
    console.error('Error fetching area status overview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCollectionEfficiencyAndBinUtilization = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch bins with their areas
    const bins = await Bin.find({ lastCollected: { $gte: startOfMonth } })
      .populate('area', 'name')
      .select('fillLevel area lastCollected');

    // Group data by area
    const areaData = bins.reduce((acc, bin) => {
      const areaName = (bin.area as any)?.name || 'Unassigned';

      if (!acc[areaName]) {
        acc[areaName] = {
          totalBins: 0,
          totalFillLevel: 0,
          totalCollections: 0,
          binUtilization: 0,
        };
      }

      acc[areaName].totalBins++;
      acc[areaName].totalFillLevel += bin.fillLevel;

      if (bin.lastCollected) {
        acc[areaName].totalCollections++;
      }

      return acc;
    }, {} as Record<string, { totalBins: number; totalFillLevel: number; totalCollections: number; binUtilization: number }>);

    // Calculate metrics for each area
    const results = Object.entries(areaData).map(([areaName, data]) => {
      const collectionEfficiency = data.totalCollections / data.totalBins;
      const binUtilization = data.totalFillLevel / data.totalBins;

      return {
        areaName,
        collectionEfficiency: Math.round(collectionEfficiency * 100), // Percentage
        binUtilization: Math.round(binUtilization), // Average fill level
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching collection efficiency and bin utilization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};