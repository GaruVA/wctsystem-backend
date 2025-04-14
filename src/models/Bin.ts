import { Schema, model, Document } from 'mongoose';

export interface IBin extends Document {
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  fillLevel: number;
  lastCollected: Date;
  area: Schema.Types.ObjectId;
  wasteType: string;
  address?: string; // Adding address field
}

const binSchema = new Schema<IBin>({
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  fillLevel: { type: Number, required: true, min: 0, max: 100 },
  lastCollected: { type: Date, default: Date.now },
  area: { type: Schema.Types.ObjectId, ref: 'Area' },
  wasteType: { type: String, required: true },
  address: { type: String } // Adding address field to schema
});

binSchema.index({ location: '2dsphere' }); // Important for geo queries

export default model<IBin>('Bin', binSchema);