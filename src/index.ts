import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import binRoutes from './routes/binRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong, please try again later!' });
});

connectDB();

app.get('/', (req: Request, res: Response) => {
  res.send('WCTSystem API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});