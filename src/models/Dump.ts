import { Schema, model } from 'mongoose';

interface Dump {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
}

const DumpSchema = new Schema<Dump>({
  name: String,
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

export default model('Dump', DumpSchema);