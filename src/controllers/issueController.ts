import { Request, Response } from 'express';
import Issue from '../models/Issue';
import Bin from '../models/Bin';

export const getIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const issues = await Issue.find()
      .populate('bin', '_id location')
      .populate('reportedBy', 'name email');
    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId, issueType, description, images, coordinates } = req.body;

    // Find the bin to ensure it exists
    const bin = await Bin.findById(binId);
    if (!bin) {
      res.status(404).json({ message: 'Bin not found' });
      return;
    }

    const newIssue = new Issue({
      bin: binId,
      issueType,
      description,
      images: images || [],
      location: {
        type: 'Point',
        coordinates: coordinates || bin.location.coordinates
      },
      reportedBy: null 
    });

    const savedIssue = await newIssue.save();
    
    // Populate the bin and reporter info before sending response
    const populatedIssue = await Issue.findById(savedIssue._id)
      .populate('bin', '_id location')
      .populate('reportedBy', 'name email');

    res.status(201).json(populatedIssue);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateIssueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'resolved'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { status },
      { new: true }
    ).populate('bin', '_id location');

    if (!updatedIssue) {
      res.status(404).json({ message: 'Issue not found' });
      return;
    }

    res.status(200).json(updatedIssue);
  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIssuesNearby = async (req: Request, res: Response): Promise<void> => {
  try {
    const { longitude, latitude, maxDistance = 1000 } = req.query;

    if (!longitude || !latitude) {
      res.status(400).json({ message: 'Longitude and latitude are required' });
      return;
    }

    const issues = await Issue.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude as string), parseFloat(latitude as string)]
          },
          $maxDistance: parseInt(maxDistance as string)
        }
      }
    }).populate('bin', '_id location fillLevel');

    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching nearby issues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Additional functions for the MapScreen ReportSection
export const getIssuesByFilter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, issueType, startDate, endDate, areaId } = req.query;
    
    // Build filter object
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (issueType) {
      filter.issueType = issueType;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }
    
    // Area filter - requires joining with bins
    let issues;
    if (areaId) {
      // First find bins in the area
      const bins = await Bin.find({ area: areaId }).select('_id');
      const binIds = bins.map(bin => bin._id);
      
      // Then find issues for those bins
      filter.bin = { $in: binIds };
    }
    
    issues = await Issue.find(filter)
      .populate('bin', '_id location fillLevel')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching filtered issues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIssueSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get summary counts of issues by type and status
    const typeSummary = await Issue.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } }
    ]);
    
    const statusSummary = await Issue.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get daily issue count for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyTrends = await Issue.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      typeSummary,
      statusSummary,
      dailyTrends
    });
  } catch (error) {
    console.error('Error generating issue summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIssueById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issueId } = req.params;
    
    const issue = await Issue.findById(issueId)
      .populate('bin', '_id location fillLevel binType')
      .populate('reportedBy', 'name email');
    
    if (!issue) {
      res.status(404).json({ message: 'Issue not found' });
      return;
    }
    
    res.status(200).json(issue);
  } catch (error) {
    console.error('Error fetching issue details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIssuesByBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { binId } = req.params;
    
    const issues = await Issue.find({ bin: binId })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching issues for bin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIssueReportData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get issue counts by area
    const areaIssues = await Bin.aggregate([
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'bin',
          as: 'binIssues'
        }
      },
      {
        $lookup: {
          from: 'areas',
          localField: 'area',
          foreignField: '_id',
          as: 'areaInfo'
        }
      },
      { $unwind: '$areaInfo' },
      {
        $group: {
          _id: '$areaInfo.name',
          count: { $sum: { $size: '$binIssues' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get most common issue types
    const issueTypes = await Issue.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly trends
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrends = await Issue.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sixMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { 
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year',
          count: 1
        }
      },
      { $sort: { year: 1, month: 1 } }
    ]);

    // Get resolution time averages
    const resolutionTimeData = await Issue.aggregate([
      {
        $match: {
          status: 'resolved',
          updatedAt: { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: { 
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          },
          issueType: 1
        }
      },
      {
        $group: {
          _id: '$issueType',
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    res.status(200).json({
      areaIssues,
      issueTypes,
      monthlyTrends,
      resolutionTimeData
    });
  } catch (error) {
    console.error('Error generating issue report data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};