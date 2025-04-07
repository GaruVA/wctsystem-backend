import { Schema, model, Document } from 'mongoose';

export interface IRoute extends Document {
  coordinates: Array<[number, number]>;
  distance: string;
  duration: string;
  fillLevelThreshold: number;
  areaId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>({
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
  fillLevelThreshold: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  areaId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Area', 
    required: true 
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
routeSchema.index({ areaId: 1 });

export default model<IRoute>('Route', routeSchema);
