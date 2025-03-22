import { Schema, model, Document } from 'mongoose';

export interface IIssue extends Document {
  bin: Schema.Types.ObjectId;
  issueType: string;
  description?: string;  // Made optional with ?
}

const issueSchema = new Schema<IIssue>({
  bin: { type: Schema.Types.ObjectId, ref: 'Bin', required: true },
  issueType: { type: String, required: true },
  description: { type: String, required: false }  // Changed required to false
}, { timestamps: true });

export default model<IIssue>('Issue', issueSchema);
