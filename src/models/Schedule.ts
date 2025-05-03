import { Schema, model, Document } from 'mongoose';

export interface ISchedule extends Document {
  name: string;
  areaId: Schema.Types.ObjectId;
  collectorId?: Schema.Types.ObjectId;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  route: Array<[number, number]>;
  distance: number;
  duration: number;
  binSequence: Schema.Types.ObjectId[];
  actualStartTime?: Date;
  actualEndTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  wasteType?: 'GENERAL' | 'ORGANIC' | 'RECYCLE' | 'HAZARDOUS'; // Added wasteType field
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
  wasteType: {
    type: String,
    enum: ['GENERAL', 'ORGANIC', 'RECYCLE', 'HAZARDOUS'],
    description: 'Primary waste type this schedule is focused on collecting'
  },
  // Route data fields
  route: {
    type: [[Number]],  // Array of [longitude, latitude] coordinates
    required: true,
    description: 'The path coordinates for the collection route'
  },
  distance: {
    type: Number,
    required: true,
    description: 'Total distance in kilometers'
  },
  duration: {
    type: Number,
    required: true,
    description: 'Total duration in minutes'
  },
  binSequence: {
    type: [Schema.Types.ObjectId],
    ref: 'Bin',
    required: true,
    description: 'Ordered sequence of bins to be collected'
  },
  // Additional tracking fields
  actualStartTime: { 
    type: Date 
  },
  actualEndTime: { 
    type: Date 
  },
  notes: {
    type: String,
    description: 'Any special instructions or notes for this collection'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for efficient querying
scheduleSchema.index({ areaId: 1, date: 1 });
scheduleSchema.index({ collectorId: 1, status: 1 });
scheduleSchema.index({ date: 1, status: 1 });

export default model<ISchedule>('Schedule', scheduleSchema);