import express, { Request, Response, NextFunction } from 'express'; // Add Request, Response, NextFunction types
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error for debugging
  res.status(500).json({ message: 'Something went wrong, please try again later!' }); // Send a generic error response
});

connectDB();

app.get('/', (req: Request, res: Response) => {  // Typing for req and res
  res.send('GarbageTrack API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
