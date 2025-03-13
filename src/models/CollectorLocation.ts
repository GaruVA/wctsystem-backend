import { Schema, model, Document } from 'mongoose';

export interface ICollectorLocation extends Document {
  collectorId: Schema.Types.ObjectId;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

const collectorLocationSchema = new Schema<ICollectorLocation>({
  collectorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Collector', 
    required: true 
  },
  latitude: { 
    type: Number, 
    required: true 
  },
  longitude: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for efficient queries
collectorLocationSchema.index({ collectorId: 1, timestamp: -1 });

export default model<ICollectorLocation>('CollectorLocation', collectorLocationSchema);