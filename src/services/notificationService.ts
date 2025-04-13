import Alert, { AlertType, AlertSeverity, AlertStatus } from '../models/Alert';
import Area from '../models/Area';
import Bin from '../models/Bin';
import Schedule from '../models/Schedule';
import Settings from '../models/Settings';
import mongoose from 'mongoose';

/**
 * Notification Service to handle alert generation for the waste collection system
 */
class NotificationService {
  /**
   * Check for critical bins that exceed fill threshold
   */
  async checkBinFillLevels(): Promise<void> {
    try {
      // Get notification settings
      const settings = await Settings.getInstance();
      
      // Check if notifications are enabled
      if (!settings || !settings.notifications.enabled) {
        console.log('Notifications are disabled in settings');
        return;
      }
      
      const criticalThreshold = settings.notifications.criticalThreshold;
      
      console.log(`Checking bin fill levels (Critical: ${criticalThreshold}%)`);
      
      // Get all bins
      const bins = await Bin.find().populate('area', 'name').select('fillLevel area');
      
      // Process each bin
      for (const bin of bins) {
        // Check if bin fill level exceeds critical threshold
        if (bin.fillLevel >= criticalThreshold) {
          // Get area information
          const areaName = bin.area && typeof bin.area === 'object' && 'name' in bin.area 
            ? bin.area.name 
            : 'Unknown Area';
          
          // Using any as type assertion to resolve the property access error
          let areaId = 'unknown';
          if (bin.area) {
            if (typeof bin.area === 'object') {
              const areaObj = bin.area as any;
              areaId = areaObj._id ? String(areaObj._id) : String(bin.area);
            } else {
              areaId = String(bin.area);
            }
          }
          
          // Check if this bin already has an unread alert by finding exact bin ID
          const existingAlert = await Alert.findOne({
            type: AlertType.BIN_FILL_LEVEL,
            status: AlertStatus.UNREAD,
            description: new RegExp(`Bin with ID ${bin._id}\\b`)
          });
          
          if (!existingAlert) {
            // Create new critical bin alert with IDs in description
            await Alert.create({
              title: 'Critical Bin Fill Level',
              description: `Bin with ID ${bin._id} in ${areaName} has reached critical fill level of ${bin.fillLevel}%.`,
              severity: AlertSeverity.HIGH,
              status: AlertStatus.UNREAD,
              type: AlertType.BIN_FILL_LEVEL
            });
            console.log(`Created new critical alert for bin ${bin._id}`);
          } else {
            console.log(`Skipping alert creation - existing unread alert found for bin ${bin._id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking bin fill levels:', error);
    }
  }

  /**
   * Generate alerts based on area average fill levels
   */
  async checkAreaFillLevels(): Promise<void> {
    try {
      // Get notification settings
      const settings = await Settings.getInstance();
      
      // Check if notifications are enabled
      if (!settings || !settings.notifications.enabled) {
        console.log('Notifications are disabled in settings');
        return;
      }
      
      const criticalThreshold = settings.notifications.criticalThreshold;
      const warningThreshold = settings.notifications.warningThreshold;
      
      console.log(`Checking area fill levels (Critical: ${criticalThreshold}%, Warning: ${warningThreshold}%)`);
      
      // Get all areas
      const areas = await Area.find().lean();
      
      // Process each area
      for (const area of areas) {
        // Get bins in this area
        const bins = await Bin.find({ area: area._id }).select('fillLevel');
        
        // Skip areas with no bins
        if (bins.length === 0) {
          console.log(`Area ${area.name || area._id} has no bins, skipping`);
          continue;
        }
        
        // Calculate average fill level
        const totalFillLevel = bins.reduce((sum, bin) => sum + bin.fillLevel, 0);
        const averageFillLevel = Math.round(totalFillLevel / bins.length);
        
        console.log(`Area ${area.name || area._id}: Average fill level ${averageFillLevel}%`);
        
        // Check if this area already has an unread alert by exact area name
        const existingAlert = await Alert.findOne({
          type: AlertType.AREA_FILL_LEVEL,
          status: AlertStatus.UNREAD,
          description: new RegExp(`Area ${area.name || `ID: ${area._id}`}\\b`)
        });
        
        // Generate alerts based on thresholds
        if (averageFillLevel >= criticalThreshold) {
          // Critical area alert
          await this.createOrUpdateAreaAlert(
            String(area._id), 
            area.name || `ID: ${area._id}`, 
            averageFillLevel, 
            AlertSeverity.HIGH,
            existingAlert
          );
        } else if (averageFillLevel >= warningThreshold) {
          // Warning area alert
          await this.createOrUpdateAreaAlert(
            String(area._id), 
            area.name || `ID: ${area._id}`, 
            averageFillLevel, 
            AlertSeverity.MEDIUM,
            existingAlert
          );
        } else if (existingAlert) {
          // If area is back to normal and there was an existing alert, mark it as read
          existingAlert.status = AlertStatus.READ;
          await existingAlert.save();
          console.log(`Area ${area.name || area._id} back to normal levels, marked alert as read`);
        }
      }
    } catch (error) {
      console.error('Error checking area fill levels:', error);
    }
  }

  /**
   * Helper function to create a new alert or update an existing one for area fill levels
   */
  async createOrUpdateAreaAlert(
    areaId: string,
    areaName: string,
    fillLevel: number,
    severity: AlertSeverity,
    existingAlert: any
  ): Promise<void> {
    try {
      const severityText = severity === AlertSeverity.HIGH ? 'critical' : 'warning';
      const title = `${severity === AlertSeverity.HIGH ? 'Critical' : 'Warning'} Area Fill Level`;
      const description = `Area ${areaName} has reached ${severityText} average fill level of ${fillLevel}%.`;
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.title = title;
        existingAlert.description = description;
        existingAlert.severity = severity;
        // Don't reset creation time to avoid duplication appearance in UI
        await existingAlert.save();
        console.log(`Updated ${severityText} alert for area ${areaName}`);
      } else {
        // Create new alert
        await Alert.create({
          type: AlertType.AREA_FILL_LEVEL,
          title: title,
          description: description,
          severity: severity,
          status: AlertStatus.UNREAD
        });
        console.log(`Created new ${severityText} alert for area ${areaName}`);
      }
    } catch (error) {
      console.error(`Error creating/updating alert for area ${areaName}:`, error);
    }
  }

  /**
   * Check for missed collections and generate alerts
   */
  async checkMissedCollections(): Promise<void> {
    try {
      // Get system settings
      const settings = await Settings.getInstance();
      if (!settings || !settings.notifications.enabled) {
        return; // Notifications are disabled
      }

      // Get current date
      const now = new Date();
      
      // Find schedules that should have been completed but weren't
      const missedSchedules = await Schedule.find({
        date: { $lt: now }, // Date is in the past
        status: { $in: ['scheduled', 'in-progress'] } // Not marked as completed
      }).populate('areaId');

      // Generate alerts for missed collections
      for (const schedule of missedSchedules) {
        // Get area name if available
        let areaName = "Unknown Area";
        let areaId = "unknown";
        
        if (schedule.areaId) {
          if (typeof schedule.areaId === 'object') {
            const areaObj = schedule.areaId as any;
            if (areaObj.name) {
              areaName = areaObj.name;
            }
            areaId = areaObj._id ? String(areaObj._id) : String(schedule.areaId);
          } else {
            areaId = String(schedule.areaId);
          }
        }
        
        const scheduledDate = schedule.date.toLocaleDateString();

        // Check if this schedule already has an unread alert by exact schedule ID
        const existingAlert = await Alert.findOne({
          type: AlertType.MISSED_COLLECTION,
          status: AlertStatus.UNREAD,
          description: new RegExp(`Collection scheduled for ${areaName} on ${scheduledDate}\\b`)
        });

        if (!existingAlert) {
          await Alert.create({
            type: AlertType.MISSED_COLLECTION,
            title: 'Missed Collection',
            description: `Collection scheduled for ${areaName} on ${scheduledDate} was not completed on time.`,
            severity: AlertSeverity.MEDIUM,
            status: AlertStatus.UNREAD
          });
          
          console.log(`Created missed collection alert for ${areaName} on ${scheduledDate}`);
        } else {
          console.log(`Skipping alert creation - existing unread alert found for schedule in ${areaName} on ${scheduledDate}`);
        }
      }

    } catch (error) {
      console.error('Error checking missed collections:', error);
    }
  }

  /**
   * Run all alert checks
   */
  async runAllChecks(): Promise<void> {
    await this.checkBinFillLevels(); // Check critical bins
    await this.checkAreaFillLevels(); // Check area levels (both critical and warning)
    await this.checkMissedCollections(); // Check missed collections
  }
}

export default new NotificationService();