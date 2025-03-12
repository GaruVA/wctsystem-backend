import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Area from '../models/Area';

export const addArea = async (req: Request, res: Response): Promise<void> => {
  const { name, coordinates, dumpId } = req.body;

  // Validate dumpId
  if (!mongoose.Types.ObjectId.isValid(dumpId)) {
    res.status(400).json({ message: 'Invalid dumpId' });
    return;
  }

  // Validate coordinates
  if (!Array.isArray(coordinates) || !coordinates.every(coord => Array.isArray(coord) && coord.every(num => typeof num === 'number'))) {
    res.status(400).json({ message: 'Coordinates must be a JSON array of arrays of numbers' });
    return;
  }

  try {
    const newArea = new Area({ name, coordinates, dump: dumpId });
    await newArea.save();
    res.status(201).json(newArea);
  } catch (error) {
    console.error('Error adding area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeArea = async (req: Request, res: Response): Promise<void> => {
  const { areaId } = req.params;
  try {
    await Area.findByIdAndDelete(areaId);
    res.status(200).json({ message: 'Area removed successfully' });
  } catch (error) {
    console.error('Error removing area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateArea = async (req: Request, res: Response): Promise<void> => {
  const { areaId, name, coordinates, dumpId } = req.body;
  try {
    const area = await Area.findById(areaId);
    if (!area) {
      res.status(404).json({ message: 'Area not found' });
      return;
    }
    area.name = name || area.name;
    area.coordinates = coordinates || area.coordinates;
    area.dump = dumpId || area.dump;
    await area.save();
    res.status(200).json(area);
  } catch (error) {
    console.error('Error updating area:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAreas = async (req: Request, res: Response): Promise<void> => {
  try {
    const areas = await Area.find();
    res.status(200).json(areas);
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ message: 'Server error' });
  }
};