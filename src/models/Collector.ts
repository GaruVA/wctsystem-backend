import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICollector extends Document {
  username: string;
  password: string;
  email: string;
  postalCode: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const collectorSchema = new Schema<ICollector>({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	postalCode: { type: String, required: true }
}, { timestamps: true });

// Hash password before saving
collectorSchema.pre<ICollector>('save', async function (next) {
	if (this.isModified('password')) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

// Compare password method
collectorSchema.methods.comparePassword = async function (password: string) {
	return bcrypt.compare(password, this.password);
};

// Add toJSON method to remove sensitive information
collectorSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password;
	return obj;
};

export default model<ICollector>('Driver', collectorSchema);
