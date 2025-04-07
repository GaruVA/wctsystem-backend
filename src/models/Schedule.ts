import { Schema, model, Document } from 'mongoose';

export interface ISchedule extends Document {
  name: string;
  areaId: Schema.Types.ObjectId;
  collectorId?: Schema.Types.ObjectId;
  routeId: Schema.Types.ObjectId;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>({
  name: { 
    type: String, 
    required: true 
  },
  areaId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Area', 
    required: true 
  },
  collectorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Collector' 
  },
  routeId: {
    type: Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  date: { 
    type: Date, 
    required: true 
  },
  startTime: { 
    type: Date 
  },
  endTime: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'], 
    default: 'scheduled' 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for efficient querying
scheduleSchema.index({ areaId: 1, date: 1 });
scheduleSchema.index({ collectorId: 1, status: 1 });
scheduleSchema.index({ date: 1, status: 1 });
scheduleSchema.index({ routeId: 1 });

export default model<ISchedule>('Schedule', scheduleSchema);