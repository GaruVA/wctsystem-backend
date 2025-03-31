import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import binRoutes from './routes/binRoutes';
import adminRoutes from './routes/adminRoutes';
import collectorRoutes from './routes/collectorRoutes';
import routeOptimizationRoutes from './routes/routeOptimizationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import areaRoutes from './routes/areaRoutes';
import residentRoutes from './routes/residentRoutes';

// Import models to ensure they're registered with Mongoose
import './models/Admin';
import './models/Collector';
import './models/Area';
import './models/Bin';
import './models/Issue';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/bins', binRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/routes', routeOptimizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/resident', residentRoutes);

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