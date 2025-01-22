import mongoose, { Document, Schema } from 'mongoose';

export interface IBin extends Document {
    bin_id: string;
    fill_level: number;
    latitude: number;
    longitude: number;
    timestamp: string;
}

const binSchema = new Schema<IBin>({
    bin_id: { type: String, required: true, unique: true },
    fill_level: { type: Number, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IBin>('Bin', binSchema);