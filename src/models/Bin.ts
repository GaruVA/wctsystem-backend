import { Schema, model, Document } from 'mongoose';

export interface IBin extends Document {
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  fillLevel: number;
  lastCollected: Date;
  area?: Schema.Types.ObjectId; // Made optional to support bins not assigned to areas
  wasteType: 'GENERAL' | 'ORGANIC' | 'HAZARDOUS' | 'RECYCLE';
  address?: string;
  status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'PENDING_INSTALLATION';
}

const binSchema = new Schema<IBin>({
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  fillLevel: { type: Number, required: true, min: 0, max: 100 },
  lastCollected: { type: Date, default: Date.now },
  area: { type: Schema.Types.ObjectId, ref: 'Area', required: false },
  wasteType: { 
    type: String, 
    required: true,
    enum: ['GENERAL', 'ORGANIC', 'HAZARDOUS', 'RECYCLE'] 
  },
  address: { type: String },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'PENDING_INSTALLATION'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true // Add timestamps for createdAt and updatedAt
});

binSchema.index({ location: '2dsphere' }); // Important for geo queries

export default model<IBin>('Bin', binSchema);