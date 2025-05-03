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
   * Generate alerts based on area average fill levels for specific waste types
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
      
      console.log(`Checking area fill levels by waste type (Critical: ${criticalThreshold}%, Warning: ${warningThreshold}%)`);
      
      // Get all areas
      const areas = await Area.find().lean();
      
      // Define waste types to check
      const wasteTypes = ['GENERAL', 'ORGANIC', 'RECYCLE', 'HAZARDOUS'];
      
      // Process each area
      for (const area of areas) {
        // Check each waste type separately
        for (const wasteType of wasteTypes) {
          // Get bins in this area of this waste type
          const bins = await Bin.find({ 
            area: area._id,
            wasteType: wasteType
          }).select('fillLevel');
          
          // Skip waste types with no bins
          if (bins.length === 0) {
            console.log(`Area ${area.name || area._id} has no ${wasteType} bins, skipping`);
            continue;
          }
          
          // Calculate average fill level for this waste type
          const totalFillLevel = bins.reduce((sum, bin) => sum + bin.fillLevel, 0);
          const averageFillLevel = Math.round(totalFillLevel / bins.length);
          
          console.log(`Area ${area.name || area._id}: Average ${wasteType} fill level ${averageFillLevel}%`);
          
          // Check if this area already has an unread alert for this waste type
          const existingAlert = await Alert.findOne({
            type: AlertType.AREA_FILL_LEVEL,
            description: new RegExp(`Area ${area.name || `ID: ${area._id}`}.*${wasteType}\\b`)
          });
          
          // Generate alerts based on thresholds
          if (averageFillLevel >= criticalThreshold) {
            // Critical area alert for this waste type
            await this.createOrUpdateAreaWasteTypeAlert(
              String(area._id), 
              area.name || `ID: ${area._id}`, 
              wasteType,
              averageFillLevel, 
              AlertSeverity.HIGH,
              existingAlert
            );
          } else if (averageFillLevel >= warningThreshold) {
            // Warning area alert for this waste type
            await this.createOrUpdateAreaWasteTypeAlert(
              String(area._id), 
              area.name || `ID: ${area._id}`, 
              wasteType,
              averageFillLevel, 
              AlertSeverity.MEDIUM,
              existingAlert
            );
          } else if (existingAlert) {
            // If area waste type is back to normal and there was an existing alert, mark it as read
            existingAlert.status = AlertStatus.READ;
            await existingAlert.save();
            console.log(`Area ${area.name || area._id} ${wasteType} bins back to normal levels, marked alert as read`);
          }
        }
        
        // Also check overall average for the area (maintaining original functionality)
        const allBins = await Bin.find({ area: area._id }).select('fillLevel');
        
        // Skip areas with no bins
        if (allBins.length === 0) {
          console.log(`Area ${area.name || area._id} has no bins, skipping`);
          continue;
        }
        
        // Calculate overall average fill level
        const totalFillLevel = allBins.reduce((sum, bin) => sum + bin.fillLevel, 0);
        const averageFillLevel = Math.round(totalFillLevel / allBins.length);
        
        console.log(`Area ${area.name || area._id}: Overall average fill level ${averageFillLevel}%`);
        
        // Check if this area already has an unread alert for overall average
        const existingOverallAlert = await Alert.findOne({
          type: AlertType.AREA_FILL_LEVEL,
          description: new RegExp(`Area ${area.name || `ID: ${area._id}`} has reached .* average fill level\\b`)
        });
        
        // Generate alerts based on thresholds for overall average
        if (averageFillLevel >= criticalThreshold) {
          // Critical area alert
          await this.createOrUpdateAreaAlert(
            String(area._id), 
            area.name || `ID: ${area._id}`, 
            averageFillLevel, 
            AlertSeverity.HIGH,
            existingOverallAlert
          );
        } else if (averageFillLevel >= warningThreshold) {
          // Warning area alert
          await this.createOrUpdateAreaAlert(
            String(area._id), 
            area.name || `ID: ${area._id}`, 
            averageFillLevel, 
            AlertSeverity.MEDIUM,
            existingOverallAlert
          );
        } else if (existingOverallAlert) {
          // If area is back to normal and there was an existing alert, mark it as read
          existingOverallAlert.status = AlertStatus.READ;
          await existingOverallAlert.save();
          console.log(`Area ${area.name || area._id} back to normal overall levels, marked alert as read`);
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
   * Helper function to create a new alert or update an existing one for area waste type fill levels
   * For critical alerts, also triggers automatic schedule generation
   */
  async createOrUpdateAreaWasteTypeAlert(
    areaId: string,
    areaName: string,
    wasteType: string,
    fillLevel: number,
    severity: AlertSeverity,
    existingAlert: any
  ): Promise<void> {
    try {
      const severityText = severity === AlertSeverity.HIGH ? 'critical' : 'warning';
      const title = `${severity === AlertSeverity.HIGH ? 'Critical' : 'Warning'} ${wasteType} Bins Fill Level`;
      const description = `Area ${areaName} has reached ${severityText} average fill level of ${fillLevel}% for ${wasteType} bins.`;
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.title = title;
        existingAlert.description = description;
        existingAlert.severity = severity;
        // Don't reset creation time to avoid duplication appearance in UI
        await existingAlert.save();
        console.log(`Updated ${severityText} alert for ${wasteType} bins in area ${areaName}`);
      } else {
        // Create new alert
        await Alert.create({
          type: AlertType.AREA_FILL_LEVEL,
          title: title,
          description: description,
          severity: severity,
          status: AlertStatus.UNREAD
        });
        console.log(`Created new ${severityText} alert for ${wasteType} bins in area ${areaName}`);
      }

      // For HIGH severity alerts, trigger auto-generation of schedule
      if (severity === AlertSeverity.HIGH) {
        try {
          // Import axios for making the API request
          const axios = require('axios');
          
          // Trigger auto-schedule generation
          console.log(`Triggering auto-schedule generation for ${wasteType} bins in area ${areaId}`);
          
          // Get system token for authentication
          const settings = await Settings.getInstance();
          const systemToken = settings?.systemToken;
          
          if (!systemToken) {
            console.error('No system token available for auto-schedule generation');
            return;
          }
          
          // Make the API call to auto-generate a schedule
          const response = await axios.post(
            `http://localhost:5000/api/schedules/auto-generate`,
            {
              areaId: areaId,
              wasteType: wasteType
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${systemToken}`
              }
            }
          );
          
          // Handle the response
          if (response.data.success) {
            console.log(`Auto-schedule generation successful: ${response.data.message}`);
            
            // Create notification about the auto-generated schedule
            if (response.data.schedule) {
              await Alert.create({
                type: AlertType.AUTO_SCHEDULE,
                title: 'Schedule Auto-Generated',
                description: `A collection schedule has been automatically generated for ${wasteType} bins in ${areaName} due to critical fill levels.`,
                severity: AlertSeverity.MEDIUM,
                status: AlertStatus.UNREAD
              });
            }
          } else if (response.data.existingSchedule) {
            console.log(`Schedule already exists: ${response.data.message}`);
          } else {
            console.error(`Auto-schedule generation failed: ${response.data.message}`);
          }
        } catch (error) {
          console.error('Error triggering auto-schedule generation:', error);
        }
      }
    } catch (error) {
      console.error(`Error creating/updating alert for ${wasteType} bins in area ${areaName}:`, error);
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