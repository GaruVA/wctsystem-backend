import { Schema, model, Document } from 'mongoose';

export interface IArea extends Document {
  name: string;
  coordinates: Array<[number, number]>; // Polygon coordinates
  collector?: Schema.Types.ObjectId;
  bins: Schema.Types.ObjectId[];
}

const areaSchema = new Schema<IArea>({
  name: { type: String, required: true },
  coordinates: { 
    type: [[Number]], 
    required: true,
    validate: {
      validator: (v: any) => v.length >= 3, // Minimum 3 points for polygon
      message: 'Area must have at least 3 coordinates'
    }
  },
  collector: { type: Schema.Types.ObjectId, ref: 'Collector' },
  bins: [{ type: Schema.Types.ObjectId, ref: 'Bin' }]
});

export default model<IArea>('Area', areaSchema);