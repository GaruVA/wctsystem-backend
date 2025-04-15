import { Request, Response } from 'express';
import Issue from '../models/Issue';

export const getIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all issues and populate the 'bin' field with its id
    const issues = await Issue.find().populate('bin', '_id');

    // Respond with the fetched issues
    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);

    // Send a 500 status code if an error occurs
    res.status(500).json({ message: 'Server error' });
  }
};