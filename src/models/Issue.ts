import { Schema, model, Document } from 'mongoose';

export interface IIssue extends Document {
  bin: Schema.Types.ObjectId;
  issueType: string;
  description: string;
  images: string[];
  location: {
    type: string;
    coordinates: [number, number];
  };
  status: 'pending' | 'in-progress' | 'resolved';
  reportedBy?: Schema.Types.ObjectId; // Optional reference to user who reported
}

const issueSchema = new Schema<IIssue>({
  bin: { type: Schema.Types.ObjectId, ref: 'Bin', required: true },
  issueType: { 
    type: String, 
    required: true,
    enum: ['overflowing', 'damaged', 'missing', 'vandalism', 'other']
  },
  description: { type: String, required: true },
  images: [{ type: String }],
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'Resident' }
}, { 
  timestamps: true 
});

// Create geospatial index for location
issueSchema.index({ location: '2dsphere' });

export default model<IIssue>('Issue', issueSchema);