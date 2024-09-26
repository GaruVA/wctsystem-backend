import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('GarbageTrack API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});