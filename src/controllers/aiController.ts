import { Request, Response } from 'express';
import axios from 'axios';
import qs from 'querystring';

/**
 * Generate AI insights using a free ChatGPT API
 * @route POST /api/ai/insights
 * @access Admin only
 */
export const generateAIInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fillLevelTrends, analytics, wasteTypeAnalytics, areaStatusOverview, collectionEfficiencyData } = req.body;
    console.log("Received Data:", req.body); // Debugging

    // Validate input
    if (!fillLevelTrends || !analytics || !wasteTypeAnalytics || !areaStatusOverview || !collectionEfficiencyData) {
      res.status(400).json({ message: 'Missing required data for AI insights generation' });
      return;
    }

    // Prepare data for the ChatGPT API
    const prompt = `
      Analyze the following waste management data and generate actionable insights:

      Fill Level Trends:
      ${JSON.stringify(fillLevelTrends)}

      Analytics:
      ${JSON.stringify(analytics)}

      Waste Type Analytics:
      ${JSON.stringify(wasteTypeAnalytics)}

      Area Status Overview:
      ${JSON.stringify(areaStatusOverview)}

      Collection Efficiency Data:
      ${JSON.stringify(collectionEfficiencyData)}

      Based on the provided data, recommend strategies to optimize waste collection schedules, improve efficiency, and address critical issues.
      Provide a summary of your findings and actionable suggestions. Show only the most relevant insights.
    `;

    // Define the API key and model
    const apiKey = 'a1615035d261743d70e78e8d4b11ab27'; // Replace with your email
    const model = 'gpt-3.5-turbo'; // Default model

    // Build the API URL
    const apiUrl = `http://195.179.229.119/gpt/api.php?${qs.stringify({
      prompt: prompt,
      api_key: apiKey,
      model: model,
    })}`;

    // Call the ChatGPT API
    const response = await axios.get(apiUrl);

    // Extract the generated insights
    const insights = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data || 'No insights generated.';

    res.status(200).json({ insights });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      message: 'Failed to generate AI insights',
      error: error.message,
    });
  }
};