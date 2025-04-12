import express from 'express';
import { createBinSuggestion, getBinSuggestions } from '../controllers/binSuggestionController';

const router = express.Router();

router.post('/', createBinSuggestion);
router.get('/', getBinSuggestions);

export default router;
