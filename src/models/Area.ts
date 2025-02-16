import { Schema, model, Document } from 'mongoose';

export interface IArea extends Document {
  name: string;
  coordinates: Array<[number, number]>; // Polygon coordinates
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
  }
});

export default model<IArea>('Area', areaSchema);