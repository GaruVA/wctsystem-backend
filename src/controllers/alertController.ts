import { Request, Response } from 'express';
import Alert, { AlertStatus } from '../models/Alert';

/**
 * Get all unread alerts
 * @route GET /api/alerts/unread
 * @access Admin only
 */
export const getUnreadAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Simply get all unread alerts sorted by creation date (newest first)
    const alerts = await Alert.find({ status: AlertStatus.UNREAD })
      .sort({ createdAt: -1 });
    
    res.status(200).json({ alerts });
  } catch (error: any) {
    console.error('Error retrieving unread alerts:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve alerts', 
      error: error.message 
    });
  }
};

/**
 * Mark an alert as read
 * @route PATCH /api/alerts/:id/read
 * @access Admin only
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findByIdAndUpdate(
      id,
      { status: AlertStatus.READ },
      { new: true }
    );
    
    if (!alert) {
      res.status(404).json({ message: 'Alert not found' });
      return;
    }
    
    res.status(200).json(alert);
  } catch (error: any) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ 
      message: 'Failed to update alert status', 
      error: error.message 
    });
  }
};

/**
 * Mark all alerts as read
 * @route PATCH /api/alerts/mark-all-read
 * @access Admin only
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await Alert.updateMany(
      { status: AlertStatus.UNREAD },
      { status: AlertStatus.READ }
    );
    
    res.status(200).json({ message: 'All alerts marked as read' });
  } catch (error: any) {
    console.error('Error marking all alerts as read:', error);
    res.status(500).json({ 
      message: 'Failed to update alerts', 
      error: error.message 
    });
  }
};
