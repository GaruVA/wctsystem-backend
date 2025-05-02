import { Schema, model, Document } from 'mongoose';

export enum AlertType {
  BIN_FILL_LEVEL = 'BIN_FILL_LEVEL',
  AREA_FILL_LEVEL = 'AREA_FILL_LEVEL',
  MISSED_COLLECTION = 'MISSED_COLLECTION',
  AUTO_SCHEDULE = 'AUTO_SCHEDULE'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum AlertStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}

export interface IAlert extends Document {
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  type: AlertType;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: Object.values(AlertSeverity),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(AlertStatus),
    default: AlertStatus.UNREAD
  },
  type: {
    type: String,
    enum: Object.values(AlertType),
    required: true
  }
}, { 
  timestamps: true // This creates createdAt and updatedAt fields automatically
});

// Create index for better performance with alert listing
alertSchema.index({ status: 1 });
alertSchema.index({ createdAt: -1 });

const Alert = model<IAlert>('Alert', alertSchema);

export default Alert;