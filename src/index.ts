import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './config/database';
import binRoutes from './routes/binRoutes';
import adminRoutes from './routes/adminRoutes';
import collectorRoutes from './routes/collectorRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import areaRoutes from './routes/areaRoutes';
import residentRoutes from './routes/residentRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import routeOptimizationRoutes from './routes/routeOptimizationRoutes';
import issueRoutes from './routes/issueRoutes';
import settingsRoutes from './routes/settingsRoutes';
import alertRoutes from './routes/alertRoutes';
import binSuggestionRoutes from './routes/binSuggestionRoutes';
import scheduler from './services/scheduler';
import aiRoutes from "./routes/aiRoutes";

// Import models to ensure they're registered with Mongoose
import './models/Admin';
import './models/Collector';
import './models/Area';
import './models/Bin';
import './models/Issue';
import './models/Schedule';
import './models/Resident';
import './models/BinSuggestion';
import './models/Settings';
import './models/Alert';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/bins', binRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/route-optimization', routeOptimizationRoutes);
app.use('/api/issues', issueRoutes); 
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/bin-suggestions', binSuggestionRoutes);
app.use("/api/ai", aiRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong, please try again later!' });
});

connectDB().then(() => {
  console.log('Connected to MongoDB');
  
  // Start the scheduler after successful DB connection
  scheduler.start();
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

app.get('/', (req: Request, res: Response) => {
  res.send('WCTSystem API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});