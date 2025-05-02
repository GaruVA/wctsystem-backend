import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Settings, { ISettings } from '../models/Settings';

/**
 * Generate a new system token with no expiration
 */
const generateSystemToken = (): string => {
  const secretKey = process.env.JWT_SECRET || 'your_jwt_secret';
  
  // Create a system payload that identifies this as a system token
  const systemPayload = {
    id: '0',
    role: 'admin',
    // No exp (expiration) field, making this a non-expiring token
  };
  
  // Sign the token without an expiration
  return jwt.sign(systemPayload, secretKey);
};

/**
 * Get application settings
 * @route GET /api/settings
 * @access Admin only
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Use the singleton pattern to get or create settings
    const settings = await Settings.getInstance();
    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Error retrieving settings:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve settings', 
      error: error.message 
    });
  }
};

/**
 * Update application settings
 * @route PUT /api/settings
 * @access Admin only
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { systemName, adminEmail, notifications } = req.body;

    // Validate required fields
    if (!systemName || !adminEmail) {
      res.status(400).json({ message: 'System name and admin email are required' });
      return;
    }

    // Get current settings or create default if not exists
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({
        systemName,
        adminEmail,
        notifications: notifications || {},
        systemToken: generateSystemToken() // Generate token for new settings
      });
    } else {
      // Update fields
      settings.systemName = systemName;
      settings.adminEmail = adminEmail;
      
      // Update notification settings if provided
      if (notifications) {
        settings.notifications = {
          ...settings.notifications,
          ...notifications
        };
      }
      
      // Regenerate system token if requested or if it doesn't exist
      if (!settings.systemToken) {
        settings.systemToken = generateSystemToken();
        console.log('System token has been generated');
      }
    }

    await settings.save();

    // Return updated settings
    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      message: 'Failed to update settings', 
      error: error.message 
    });
  }
};