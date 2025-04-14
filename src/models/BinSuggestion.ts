import mongoose, { Schema, Document } from 'mongoose';

export interface BinSuggestion extends Document {
  reason: string;
  location: {
    longitude: number;
    latitude: number;
  };
  address?: string; // Optional address field for reverse geocoded location
  createdAt: Date;
}

const binSuggestionSchema = new Schema<BinSuggestion>({
  reason: { type: String, required: true },
  location: {
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
  },
  address: { type: String },  // Reverse geocoded address
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<BinSuggestion>('BinSuggestion', binSuggestionSchema);
