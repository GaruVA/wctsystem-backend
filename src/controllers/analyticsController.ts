import { Request, Response } from 'express';
import Bin from '../models/Bin';
import Area from '../models/Area';
import Collector from '../models/Collector';
import Schedule from '../models/Schedule';

export const getFillLevelTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(now.getDate() - 10);

    console.log("Fetching bins collected between:", tenDaysAgo, "and", now);

    // Fetch bins with their fill levels, lastCollected dates, and areas within the last 10 days
    const bins = await Bin.find({
      lastCollected: { $gte: tenDaysAgo, $lte: now },
    })
      .select('fillLevel lastCollected area')
      .populate('area', 'name'); // Populate area name

    console.log("Fetched bins:", bins);

    if (!Array.isArray(bins)) {
      throw new Error("Expected bins to be an array");
    }

    // Filter out bins without an assigned area
    const binsWithArea = bins.filter(bin => bin.area);

    // Group bins by area and date, and calculate average fill level
    const transformedTrends = binsWithArea.reduce((acc, bin) => {
      const date = new Date(bin.lastCollected).toISOString().split('T')[0]; // Extract the date (YYYY-MM-DD)
      const areaName = (bin.area as any).name;

      if (!acc[areaName]) {
        acc[areaName] = {};
      }

      if (!acc[areaName][date]) {
        acc[areaName][date] = { totalFillLevel: 0, count: 0 };
      }

      acc[areaName][date].totalFillLevel += bin.fillLevel;
      acc[areaName][date].count += 1;

      return acc;
    }, {} as Record<string, Record<string, { totalFillLevel: number; count: number }>>);

    // Calculate averages and format the response
    const response = Object.entries(transformedTrends).map(([areaName, dates]) => {
      return {
        area: areaName,
        trends: Object.entries(dates).map(([date, { totalFillLevel, count }]) => ({
          date,
          averageFillLevel: totalFillLevel / count,
        })),
      };
    });

    console.log("Transformed trends with averages:", response);

    res.json(response);
  } catch (error) {
    console.error('Error fetching fill level trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().select('fillLevel area lastCollected wasteType').populate('area', 'name');
    
    if (!Array.isArray(bins)) {
      throw new Error("Expected bins to be an array");
    }

    // Filter out bins without an assigned area
    const binsWithArea = bins.filter(bin => bin.area);

    // Group analytics by both area and waste type
    const analytics = binsWithArea.reduce((acc, bin) => {
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

    if (!Array.isArray(bins)) {
      throw new Error("Expected bins to be an array");
    }

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
      
      if (!Array.isArray(bins)) {
        throw new Error("Expected bins to be an array");
      }

      // Calculate average fill level
      const totalFillLevel = bins.reduce((sum, bin) => sum + bin.fillLevel, 0);
      const averageFillLevel = bins.length > 0 ? totalFillLevel / bins.length : 0;
      
      // Count critical bins (> 80% full)
      const criticalBins = bins.filter(bin => bin.fillLevel > 70).length;
      
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

    if (!Array.isArray(bins)) {
      throw new Error("Expected bins to be an array");
    }

    // Filter out bins without an assigned area
    const binsWithArea = bins.filter(bin => bin.area);

    // Group data by area
    const areaData = binsWithArea.reduce((acc, bin) => {
      const areaName = (bin.area as any).name;

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

export const getDashboardMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total bins and areas
    const totalBins = await Bin.countDocuments();
    const totalAreas = await Area.countDocuments();

    // Today's date range using proper UTC dates
    const todayStr = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const tomorrowStart = new Date(`${todayStr}T23:59:59.999Z`);

    // Collections today: count bins collected today
    const binsCollectedToday = await Bin.countDocuments({
      lastCollected: { $gte: todayStart, $lte: tomorrowStart }
    });
    
    // Also count schedules for today with proper UTC date filtering
    const schedulesForToday = await Schedule.countDocuments({
      date: { $gte: todayStart, $lte: tomorrowStart },
      status: { $in: ['scheduled', 'in-progress', 'completed'] }
    });

    // Count total schedules (including all statuses)
    const allSchedulesToday = await Schedule.countDocuments({
      date: { $gte: todayStart, $lte: tomorrowStart }
    });
    
    // Combined count for today's collections (actual + scheduled)
    const collectionsToday = binsCollectedToday + schedulesForToday;

    // Calculate average fill level across all bins
    const bins = await Bin.find().select('fillLevel');
    const totalFill = bins.reduce((sum, bin) => sum + bin.fillLevel, 0);
    const fillLevelTrendToday = bins.length > 0 ? Math.round((totalFill / bins.length) * 100) / 100 : 0;

    res.json({ 
      totalBins, 
      totalAreas, 
      fillLevelTrendToday,
      collectionsToday: allSchedulesToday // Include total count of all schedules
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};