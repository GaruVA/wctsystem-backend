import axios from 'axios';
import dotenv from 'dotenv';
import { IBin } from '../models/Bin';

dotenv.config();
const ORS_API_KEY = process.env.ORS_API_KEY;

// Check if OpenRouteService is available
const isOpenRouteServiceAvailable = Boolean(ORS_API_KEY);

// ================ INTERFACES ================ //

/**
 * Structure of a complete optimized route with path and metrics
 */
export interface OptimizedRoute {
  route: Array<[number, number]>;       // The complete path as coordinates [lon, lat]
  distance: number;                     // Total distance in kilometers
  duration: number;                     // Total duration in minutes
  stops_sequence?: number[];            // Order of stops in the optimized sequence
}

/**
 * Structure of the stop sequence optimization result
 */
interface StopSequenceResult {
  orderedStops: Array<[number, number]>; // Coordinates in optimized order
  stopIndexSequence: number[];           // Original indices in optimal order
}

/**
 * OpenRouteService API response step
 */
interface ORSStep {
  type: string;
  job?: number;
  [key: string]: any;
}

/**
 * Main function to create an optimized collection route
 * 
 * @param startPoint Starting point coordinates [longitude, latitude]
 * @param binLocations Array of bin coordinates [longitude, latitude]
 * @param endPoint Ending point coordinates [longitude, latitude]
 * @param bins Optional array of bin objects for better duration calculation
 * @returns Complete optimized route with path and metrics
 */
export async function createOptimalRoute(
  startPoint: [number, number],
  binLocations: Array<[number, number]>,
  endPoint: [number, number],
  bins?: IBin[]
): Promise<OptimizedRoute> {
  try {
    // Step 1: Find the optimal sequence to visit bins
    const optimizedSequence = await findOptimalStopSequence(startPoint, binLocations, endPoint);
    
    // Step 2: Generate the complete route path through all waypoints
    const allWaypoints = [
      startPoint, 
      ...optimizedSequence.orderedStops, 
      endPoint
    ];
    
    // Step 3: Generate detailed path between points
    const routePath = await generateRoutePath(allWaypoints, optimizedSequence.stopIndexSequence);
    
    // Step 4: Calculate realistic distance and duration metrics
    const metrics = calculateRouteMetrics(routePath, bins);
    
    // Return the complete route with all data
    return {
      route: routePath,
      distance: metrics.distance,
      duration: metrics.duration,
      stops_sequence: optimizedSequence.stopIndexSequence
    };
  } catch (error: any) {
    console.error('Route optimization error:', error);
    throw new Error('Failed to create optimal route: ' + error.message);
  }
}

/**
 * Find the optimal sequence to visit all stops using OpenRouteService VRP solver
 * 
 * @param startPoint Starting depot coordinates [longitude, latitude]
 * @param stops Array of collection point coordinates [longitude, latitude]
 * @param endPoint Ending depot coordinates [longitude, latitude]
 * @returns The optimal stop sequence and their coordinates in order
 */
async function findOptimalStopSequence(
  startPoint: [number, number],
  stops: Array<[number, number]>,
  endPoint: [number, number]
): Promise<StopSequenceResult> {
  // Verify API availability
  if (!isOpenRouteServiceAvailable) {
    throw new Error('Route optimization service unavailable: API key not configured');
  }

  try {
    console.log(`Optimizing route for ${stops.length} collection points`);
    
    // Setup vehicle data (garbage truck)
    const vehicles = [{
      id: 1,
      profile: "driving-car",
      start: startPoint,
      end: endPoint
    }];
    
    // Setup jobs (bin collection points)
    const jobs = stops.map((stop, index) => ({
      id: index + 1, // Job IDs start from 1
      location: stop
    }));
    
    // Call OpenRouteService Optimization API
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouteservice.org/optimization',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: { jobs, vehicles }
    });
    
    const result = response.data;
    
    // Verify that a valid route was found
    if (!result.routes || result.routes.length === 0) {
      throw new Error('No valid routes found by optimization service');
    }
    
    // Extract the first route solution
    const route = result.routes[0];
    
    // Extract sequence of bin stops (job steps)
    const stopIndexSequence = route.steps
      .filter((step: ORSStep) => step.type === 'job')
      .map((step: ORSStep) => (step.job ?? 0) - 1); // Convert back to 0-based index
    
    // Create ordered array of stops based on sequence
    const orderedStops = stopIndexSequence.map((index: number) => stops[index]);
    
    return {
      orderedStops,
      stopIndexSequence
    };
  } catch (error) {
    console.error('OpenRouteService optimization error:', error);
    throw new Error('Failed to optimize collection route sequence');
  }
}

/**
 * Generate detailed route path through all waypoints
 * Returns either a detailed polyline or simple waypoint path
 */
async function generateRoutePath(
  waypoints: Array<[number, number]>,
  stopIndexSequence: number[] = []
): Promise<Array<[number, number]>> {
  // If OpenRouteService is not available, just return waypoints
  if (!isOpenRouteServiceAvailable) {
    return waypoints;
  }

  try {
    // Get detailed path from OpenRouteService Directions API
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      data: {
        coordinates: waypoints,
        instructions: true,
        preference: 'recommended'
      }
    });
    
    // Extract the route geometry (array of coordinates)
    return response.data.features[0].geometry.coordinates;
  } catch (error) {
    // On API failure, fall back to simple waypoints
    console.error('Failed to generate detailed path:', error);
    return waypoints;
  }
}

/**
 * Calculate realistic route metrics for garbage collection
 * Accounts for travel time between points and bin collection time
 * 
 * @param coordinates Route path as array of [lon, lat] coordinates
 * @param bins Optional array of bin objects with fill levels
 * @returns Distance in km and duration in minutes
 */
function calculateRouteMetrics(
  coordinates: [number, number][],
  bins?: IBin[]
): { distance: number; duration: number } {
  if (coordinates.length < 2) {
    return { distance: 0, duration: 0 };
  }
  
  // Collection parameters based on real-world data
  const AVG_TRUCK_SPEED_KMH = 10;        // Average truck speed in urban areas
  const BASE_COLLECTION_MINS = 5;         // Base time per bin
  const FILL_LEVEL_TIME_FACTOR = 0.02;    // Additional time per fill %
  
  let totalDistanceKm = 0;
  let totalDurationMins = 0;
  
  // Calculate distances and travel times between consecutive points
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    
    // Calculate segment distance using Haversine formula
    const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
    totalDistanceKm += segmentDistance;
    
    // Calculate travel time for this segment
    const travelTimeMins = (segmentDistance / AVG_TRUCK_SPEED_KMH) * 60;
    totalDurationMins += travelTimeMins;
  }
  
  // Add bin collection times
  if (bins && bins.length > 0) {
    // Calculate collection time based on fill levels
    const collectionTimeMins = bins.reduce((total, bin) => {
      return total + BASE_COLLECTION_MINS + (bin.fillLevel * FILL_LEVEL_TIME_FACTOR);
    }, 0);
    
    totalDurationMins += collectionTimeMins;
  } else {
    // Estimate collection time based on number of stops
    const stopCount = Math.max(0, coordinates.length - 2);
    totalDurationMins += stopCount * BASE_COLLECTION_MINS;
  }
  
  // Apply minimum values and round appropriately
  return {
    distance: Math.max(0.01, Math.round(totalDistanceKm * 100) / 100),
    duration: Math.max(1, Math.round(totalDurationMins))
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Convert degrees to radians
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const R = 6371; // Earth radius in km
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}