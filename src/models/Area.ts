import { Schema, model, Document } from 'mongoose';

export interface IArea extends Document {
  name: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  startLocation: {
    type: string;
    coordinates: number[];
  };
  endLocation: {
    type: string;
    coordinates: number[];
  };
}

const areaSchema = new Schema<IArea>({
  name: { 
    type: String, 
    required: true,
    unique: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],  // Polygon coordinates are arrays of LinearRings
      required: true,
      validate: {
        validator: (v: any) => v[0].length >= 3, // Minimum 3 points for polygon
        message: 'Area must have at least 3 coordinates'
      }
    }
  },
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
});

// Create 2dsphere index for geo queries
areaSchema.index({ geometry: '2dsphere' });
areaSchema.index({ startLocation: '2dsphere' });
areaSchema.index({ endLocation: '2dsphere' });

export default model<IArea>('Area', areaSchema);