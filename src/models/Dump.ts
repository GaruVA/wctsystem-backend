import { Schema, model, Document } from 'mongoose';

export interface IDump extends Document {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
}

const dumpSchema = new Schema<IDump>({
  name: { type: String, required: true },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

export default model<IDump>('Dump', dumpSchema);