import express from "express";
import {generateAIInsights } from "../controllers/aiController";
import { auth, requireRole } from "../middleware/auth";

const router = express.Router();

// Route to fetch AI insights
router.post("/insights", auth, requireRole("admin"), generateAIInsights);

export default router;