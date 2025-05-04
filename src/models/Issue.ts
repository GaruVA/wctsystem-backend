import { Schema, model, Document } from 'mongoose';

export interface IIssue extends Document {
  description: string;
  images: string[];
  status: 'pending' | 'in-progress' | 'resolved';
}

const issueSchema = new Schema<IIssue>({
  description: { type: String, required: true },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  }
}, { 
  timestamps: true 
});

export default model<IIssue>('Issue', issueSchema);