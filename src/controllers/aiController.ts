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
      Provide a summary of your findings and actionable suggestions. Show only the most relevant insights. Use proper headings and subheadings for clarity.
      Avoid unnecessary details and focus on the key takeaways.
    `;

    // Define the API key and model
    const apiKey = '85c6ed2a27505f5284e57d8978128405'; // Replace with your email
    const model = 'gpt-3.5-turbo'; // Default model

    // Build the API URL
    const apiUrl = `http://195.179.229.119/gpt/api.php?${qs.stringify({
      prompt: prompt,
      api_key: apiKey,
      model: model,
    })}`;

    // Call the ChatGPT API
    const response = await axios.get(apiUrl);

    // Extract and clean the generated insights
    let insights = response.data || 'No insights generated.';
    if (typeof insights === 'object') {
      insights = JSON.stringify(insights, null, 2); // Convert to string if it's an object
    }

    // Format the response to ensure proper structure
    insights = insights
      .replace(/- \*\*/g, '\n\n- **') // Add spacing before each main heading
      .replace(/\\n/g, '\n') // Replace escaped newlines with actual newlines
      .replace(/[\[\]{}"]/g, ''); // Remove brackets and quotes

    res.status(200).json({ insights });
  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      message: 'Failed to generate AI insights',
      error: error.message,
    });
  }
};