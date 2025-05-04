import { Request, Response } from 'express';
import BinSuggestion from '../models/BinSuggestion';
import { getFormattedAddress } from '../services/geocodingService';

// binSuggestionController.ts - update the createBinSuggestion function
export const createBinSuggestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason, location, binType } = req.body; // location includes latitude and longitude, including binType
    
    // Generate address from coordinates
    let address = undefined;
    if (location && location.longitude !== undefined && location.latitude !== undefined) {
      address = await getFormattedAddress([location.longitude, location.latitude]);
    }
    
    const suggestion = await BinSuggestion.create({
      reason,
      binType, // Save the bin type
      location: {
        longitude: location.longitude,
        latitude: location.latitude
      },
      address
    });
    
    res.status(201).json({ message: 'Bin suggestion created successfully', suggestion });
  } catch (error) {
    console.error('Error creating bin suggestion:', error);
    res.status(500).json({ message: 'Failed to create bin suggestion', error });
  }
};

export const getBinSuggestions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const suggestions = await BinSuggestion.find();
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve bin suggestions', error });
  }
};

export const deleteBinSuggestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { suggestionId } = req.params;
    const deletedSuggestion = await BinSuggestion.findByIdAndDelete(suggestionId);
    if (!deletedSuggestion) {
      res.status(404).json({ message: 'Bin suggestion not found' });
      return;
    }
    res.status(200).json({ message: 'Bin suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete bin suggestion', error });
  }
};
