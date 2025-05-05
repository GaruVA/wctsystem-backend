import { Request, Response } from 'express';
import Issue from '../models/Issue';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    cb(null, `${uniqueSuffix}.${extension}`);
  }
});

// Configure file filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure upload middleware
export const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Define the base URL for accessing uploaded images
const getImageUrl = (req: Request, filename: string): string => {
  // Use your actual backend URL or environment variable
  const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/images/${filename}`;
};

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    // Return the URL for the uploaded image
    const imageUrl = getImageUrl(req, req.file.filename);
    res.status(200).json({ 
      success: true, 
      imageUrl,
      message: 'Image uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

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

    // Validate description
    if (!description || !description.trim()) {
      res.status(400).json({ message: 'Description is required' });
      return;
    }

    const newIssue = new Issue({
      description,
      images: images || [],
      status: 'pending'
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

    if (!['pending', 'resolved'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value. Must be either "pending" or "resolved"' });
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