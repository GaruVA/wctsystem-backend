import { Request, Response } from 'express';
import BinSuggestion from '../models/BinSuggestion';

export const createBinSuggestion = async (req: Request, res: Response) => {
  try {
    const { reason, location } = req.body; // location should include longitude and latitude
    const suggestion = await BinSuggestion.create({ reason, location });
    res.status(201).json({ message: 'Bin suggestion created successfully', suggestion });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create bin suggestion', error });
  }
};

export const getBinSuggestions = async (_req: Request, res: Response) => {
  try {
    const suggestions = await BinSuggestion.find();
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve bin suggestions', error });
  }
};

export const updateBinSuggestion = async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { reason, location } = req.body;
    const updatedSuggestion = await BinSuggestion.findByIdAndUpdate(
      suggestionId,
      { reason, location },
      { new: true }
    );
    if (!updatedSuggestion) {
      return res.status(404).json({ message: 'Bin suggestion not found' });
    }
    res.status(200).json({ message: 'Bin suggestion updated successfully', updatedSuggestion });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update bin suggestion', error });
  }
};

export const deleteBinSuggestion = async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const deletedSuggestion = await BinSuggestion.findByIdAndDelete(suggestionId);
    if (!deletedSuggestion) {
      return res.status(404).json({ message: 'Bin suggestion not found' });
    }
    res.status(200).json({ message: 'Bin suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete bin suggestion', error });
  }
};
