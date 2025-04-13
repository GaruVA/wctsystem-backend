import { Schema, model, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  systemName: string;
  adminEmail: string;
  notifications: {
    enabled: boolean;
    criticalThreshold: number;
    warningThreshold: number;
    emailAlerts: boolean;
    smsAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Add custom statics to the schema
interface SettingsModel extends Model<ISettings> {
  getInstance(): Promise<ISettings>;
}

const settingsSchema = new Schema<ISettings, SettingsModel>({
  systemName: {
    type: String,
    required: true,
    default: 'WCT Waste Collection System'
  },
  adminEmail: {
    type: String,
    required: true,
    default: 'admin@wctsystem.com'
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    criticalThreshold: {
      type: Number,
      default: 85,
      min: 0,
      max: 100
    },
    warningThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    emailAlerts: {
      type: Boolean,
      default: true
    },
    smsAlerts: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Ensure there's only one settings document by using a singleton pattern
settingsSchema.static('getInstance', async function(): Promise<ISettings> {
  const settings = await this.findOne();
  if (settings) {
    return settings;
  }
  return this.create({});
});

const Settings = model<ISettings, SettingsModel>('Settings', settingsSchema);

export default Settings;