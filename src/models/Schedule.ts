import { Schema, model, Document } from 'mongoose';

export interface ISchedule extends Document {
  name: string;
  areaId: Schema.Types.ObjectId;
  collectorId?: Schema.Types.ObjectId;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  route: {
    coordinates: Array<[number, number]>;
    distance: string;
    duration: string;
    includedBins: Schema.Types.ObjectId[];
    excludedBins: Schema.Types.ObjectId[];
    fillLevelThreshold: number;
  };
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
  },
  route: {
    coordinates: {
      type: [[Number]],  // Array of [longitude, latitude] coordinates
      required: true
    },
    distance: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    includedBins: [{
      type: Schema.Types.ObjectId,
      ref: 'Bin'
    }],
    excludedBins: [{
      type: Schema.Types.ObjectId,
      ref: 'Bin'
    }],
    fillLevelThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for efficient querying
scheduleSchema.index({ areaId: 1, date: 1 });
scheduleSchema.index({ collectorId: 1, status: 1 });
scheduleSchema.index({ date: 1, status: 1 });

export default model<ISchedule>('Schedule', scheduleSchema);