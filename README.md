## WCTSystem Backend

### Repository Overview
This repository hosts the backend server for the **WCTSystem** application, a waste collection tracking system for urban areas. It supports three interfaces: Resident, Collector, and Admin.

### Installation
Follow these steps to set up the project locally:
1. **Clone the repository:**
    ```bash
    git clone https://github.com/GaruVA/wctsystem-backend.git
    cd wctsystem-backend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Environment configuration:**
   - Create a `.env` file in the root directory:
      ```bash
      echo "" > .env
      ```
   - Include the following content in the `.env` file:
      ```env
      MONGODB_URI=<mongodb-uri>
      PORT=5000
      JWT_SECRET=<jwt-secret>
      ORS_API_KEY=<open-route-service-key>
      ```
   - Replace `<mongodb-uri>`, `<jwt-secret>`, and `<open-route-service-key>` with your actual values.

4. **Start the development server:**
    ```bash
    npm run dev
    ```
   The backend server should now be running at `http://localhost:5000`.

### Available Scripts
- **`npm run dev`**: Starts the development server with hot-reloading using `ts-node-dev`.
- **`npm run build`**: Compiles the TypeScript code into JavaScript, generating the `dist` folder.
- **`npm start`**: Runs the production server using the compiled JavaScript files.

### Developer Guidelines
#### File Structure
- `src/`: Contains all the source code.
  - `config/`: Configuration files, e.g., `database.ts` for MongoDB connection.
  - `controllers/`: Controllers for handling requests.
  - `routes/`: Route definitions.
  - `models/`: Mongoose models.
  - `services/`: Services for business logic and external API integrations.
  - `index.ts`: Main entry point for the application.

#### Models
Models define the structure of the data stored in the MongoDB database. Each model corresponds to a collection in the database and includes schema definitions and validation rules. Below is an example of a typical model definition:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IBin extends Document {
  name: string;
  location: { type: [number, number], index: '2dsphere' }; // GeoJSON Point
  fillLevel: number;
  threshold: number;
  lastUpdated: Date;
}

const binSchema = new Schema<IBin>({
  name: { type: String, required: true },
  location: { type: [Number], index: '2dsphere', required: true }, // GeoJSON Point
  fillLevel: { type: Number, min: 0, max: 100, required: true },
  threshold: { type: Number, min: 0, max: 100, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

export const Bin = mongoose.model<IBin>('Bin', binSchema);
```

#### Creating API Endpoints
1. **Define a route in the `routes` directory (e.g., `binRoutes.ts`):**
   ```typescript
   import express from 'express';
   import { createBin, updateBin, getBins } from '../controllers/binController';
   const router = express.Router();
   router.post('/create', createBin);
   router.post('/update', updateBin);
   router.get('/', getBins);
   export default router;
   ```

2. **Implement the controller functions in the `controllers` directory (e.g., `binController.ts`):**
   ```typescript
   import { Request, Response } from 'express';
   import Bin from '../models/binModel';
   export const createBin = async (req: Request, res: Response) => {
     const newBin = new Bin(req.body);
     await newBin.save();
     res.status(201).json(newBin);
   };

   export const updateBin = async (req: Request, res: Response) => {
     const { id } = req.params;
     const updatedBin = await Bin.findByIdAndUpdate(id, req.body, { new: true });
     res.json(updatedBin);
   };

   export const getBins = async (req: Request, res: Response) => {
     const bins = await Bin.find().populate('relatedFields');
     res.json(bins);
   };
   ```

3. **Register the route in `src/index.ts`:**
   ```typescript
   import binRoutes from './routes/binRoutes';
   app.use('/api/bins', binRoutes);
   ```

When a request is received from the frontend, it is routed to the corresponding controller function, which processes the request and interacts with the database if necessary, then sends a response back to the frontend.

### API Endpoints

#### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/collector/login` - Collector login

#### Collector
- `GET /api/collector/location` - Get collector's current location
- `POST /api/collector/location` - Update collector's current location
- `GET /api/collector/area` - Get information about collector's assigned area

#### Navigation
- `POST /api/navigation/directions` - Get directions between two points
- `POST /api/navigation/next-step` - Get the next turn-by-turn navigation instruction

#### Bins
- `GET /api/bins` - Get all bins
- `POST /api/bins/create` - Create a new bin
- `POST /api/bins/update` - Update bin data
- `GET /api/bins/:binId` - Get details for a specific bin
- `POST /api/bins/:binId/report-issue` - Report an issue with a bin

### Services

#### Navigation Service
The navigation service integrates with the Open Route Service API to provide turn-by-turn directions:

- `getDirectionsFromORS`: Get directions between two points
- `getRouteWithWaypoints`: Get a route that includes multiple waypoints
- `calculateDistance`: Calculate distance between two points using the Haversine formula

### Progress
- Logins for Admin and Collector have been implemented. (No login is provided for the Resident interface)
- Route optimization service implemented for efficient waste collection.
- Navigation service implemented for turn-by-turn directions for collectors.
