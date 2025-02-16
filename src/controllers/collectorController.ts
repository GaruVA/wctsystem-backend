import { Request, Response } from 'express';
import Collector from '../models/Collector';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { IArea } from '../models/Area';
import { IBin } from '../models/Bin';
import Area from '../models/Area';  // New import for alternative method
import Bin from '../models/Bin';    // ...existing import...

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

export const loginCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  try {
    const collector = await Collector.findOne({ username });
    if (!collector) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const isMatch = await collector.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { id: collector._id, role: 'collector' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCollector = async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, postalCode } = req.body;
  try {
    const newCollector = new Collector({ username, password, email, postalCode });
    await newCollector.save();
    res.status(201).json({ message: 'Collector account created successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Collector already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCollectorArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const collector = await Collector.findById(req.user?.id);
    if (!collector?.area) {
      res.status(404).json({ message: 'No area assigned' });
      return;
    }
    
    // Retrieve area details using Area model
    const area = await Area.findById(collector.area) as IArea;
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    
    // Query bins for the area
    const bins = await Bin.find({ area: area._id }).select('fillLevel lastCollected location') as IBin[];

    // Calculate statistics
    const totalBins = bins.length;
    const priorityBins = bins.filter(b => b.fillLevel > 70).length;
    const avgFill = totalBins ? bins.reduce((sum, b) => sum + b.fillLevel, 0) / totalBins : 0;
    const urgentBins = bins.filter(b => b.fillLevel > 90).length;

    res.json({
      area: {
        _id: area._id,
        name: area.name,
        coordinates: area.coordinates,
      },
      bins,
      statistics: {
        totalBins,
        priorityBins,
        avgFill: Number(avgFill.toFixed(1)),
        urgentBins
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};