import { Schema, model, Document } from 'mongoose';

export interface IRoute extends Document {
  coordinates: Array<[number, number]>;
  distance: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>({
  coordinates: {
    type: [[Number]],  // Array of [longitude, latitude] coordinates
    required: true
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
  }
}, {
  timestamps: true
});

export default model<IRoute>('Route', routeSchema);
