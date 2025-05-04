import { Request, Response } from 'express';
import Issue from '../models/Issue';

export const getIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const issues = await Issue.find();
    res.status(200).json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { description, images } = req.body;

    const newIssue = new Issue({
      description,
      images: images || []
    });

    const savedIssue = await newIssue.save();
    res.status(201).json(savedIssue);
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
    );

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