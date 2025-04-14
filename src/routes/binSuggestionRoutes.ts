import express, { Router } from 'express';
import { createBinSuggestion, getBinSuggestions, deleteBinSuggestion } from '../controllers/binSuggestionController';

const router: Router = express.Router();

router.post('/', createBinSuggestion);
router.get('/', getBinSuggestions);
router.delete('/:suggestionId', deleteBinSuggestion);

export default router;
