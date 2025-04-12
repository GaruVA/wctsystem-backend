import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICollector extends Document {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: 'active' | 'on-leave' | 'inactive';
  efficiency?: number; // Collection efficiency percentage
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  area?: Schema.Types.ObjectId;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const collectorSchema = new Schema<ICollector>({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	firstName: { type: String },
	lastName: { type: String },
	phone: { type: String },
	status: { 
		type: String, 
		enum: ['active', 'on-leave', 'inactive'],
		default: 'active'
	},
	efficiency: {
		type: Number,
		min: 0,
		max: 100,
		default: 75 // Default efficiency value
	},
	currentLocation: {
    type: {
      type: String,
      enum: ['Point']
      // Removed default: 'Point' to prevent automatic creation
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
	area: { type: Schema.Types.ObjectId, ref: 'Area' },
	lastActive: { type: Date, default: Date.now }
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

// Create 2dsphere index for geo queries
collectorSchema.index({ 'currentLocation': '2dsphere' });

export default model<ICollector>('Collector', collectorSchema);
