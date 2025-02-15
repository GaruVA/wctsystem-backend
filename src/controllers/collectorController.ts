import { Request, Response } from 'express';
import Collector from '../models/Collector';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
    const collector = await Collector.findById(req.user?.id)
      .populate({
        path: 'area',
        populate: { path: 'bins' }
      });

    if (!collector?.area) {
      res.status(404).json({ message: 'No area assigned' });
      return;
    }
    
    // Cast area to any (or to a specific interface if available)
    const area = collector.area as any;

    res.json({
      area: {
        _id: area._id,
        name: area.name,
        coordinates: area.coordinates,
      },
      bins: area.bins
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};