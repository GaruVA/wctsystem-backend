import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const ORS_API_KEY = process.env.ORS_API_KEY;

// If no API key is available, use a fallback algorithm
const useOpenRouteService = ORS_API_KEY && ORS_API_KEY !== '';

/**
 * Interface for the optimized route response
 */
export interface OptimizedRoute {
  route: Array<[number, number]>; // The optimized route coordinates (polyline)
  distance: string | number; // Total distance in meters or formatted string
  duration: string | number; // Total duration in seconds or formatted string
  stops_sequence?: number[]; // The sequence of stops in the optimized order
}

/**
 * Interface for bin order optimization result
 */
export interface OptimizedBinOrder {
  optimizedStops: Array<[number, number]>; // The optimized order of stops
  stops_sequence: number[]; // The sequence indices in the optimized order
  estimatedDistance: number; // Estimated straight-line distance in meters
}

// Define interfaces for ORS API responses
interface ORSStep {
  type: string;
  job?: number;
  [key: string]: any;
}

/**
 * Main function to optimize a collection route
 * This function handles both bin order optimization and route polyline creation
 */
export async function optimizeRoute(
  start: [number, number], 
  stops: Array<[number, number]>, 
  end: [number, number]
): Promise<OptimizedRoute> {
  try {
    // Step 1: Optimize the bin collection order
    const optimizedOrder = await optimizeBinOrder(start, stops, end);
    
    // Step 2: Generate the actual route polyline with optimized waypoints
    const waypoints = [start, ...optimizedOrder.optimizedStops, end];
    
    // Use OpenRouteService to get the detailed route if API key is available
    if (useOpenRouteService) {
      return await generateRoutePolyline(waypoints, optimizedOrder.stops_sequence);
    } else {
      // Basic fallback if no API key available - just return the waypoints
      // Note: Actual distance and duration are calculated by the controller
      // using the utility functions in routeCalculations.ts
      return {
        route: waypoints,
        distance: 0, // Will be replaced by controller
        duration: 0, // Will be replaced by controller
        stops_sequence: optimizedOrder.stops_sequence
      };
    }
  } catch (error: any) {
    console.error('Route optimization error:', error);
    throw new Error('Failed to optimize route: ' + error.message);
  }
}

/**
 * Optimize the order of bin collections to minimize travel distance
 * This function determines the optimal sequence of bins using ORS Optimization API
 */
export async function optimizeBinOrder(
  start: [number, number],
  stops: Array<[number, number]>,
  end: [number, number]
): Promise<OptimizedBinOrder> {
  if (useOpenRouteService) {
    try {
      console.log('Using ORS Optimization API for bin order optimization');
      return await optimizeWithORSApi(start, stops, end);
    } catch (error) {
      console.error('ORS Optimization API failed:', error);
      throw new Error('Optimization service unavailable');
    }
  } else {
    throw new Error('No ORS API key configured. Optimization service unavailable.');
  }
}

/**
 * Optimize bin order using ORS Optimization API
 * Uses the Vehicle Routing Problem (VRP) solver from ORS
 */
async function optimizeWithORSApi(
  start: [number, number],
  stops: Array<[number, number]>,
  end: [number, number]
): Promise<OptimizedBinOrder> {
  try {
    console.log(`Optimizing order for ${stops.length} bins using ORS API`);
    
    // Build the vehicles array - only one vehicle in our case
    const vehicles = [{
      id: 1,
      profile: "driving-car",
      start: start,
      end: end
    }];
    
    // Build the jobs array - one job per bin
    const jobs = stops.map((stop, index) => ({
      id: index + 1, // Job IDs should start from 1
      location: stop
    }));
    
    // Call ORS Optimization API
    // The correct endpoint is /optimization, not /v2/optimization
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouteservice.org/optimization',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        jobs,
        vehicles
      }
    });
    
    console.log('ORS Optimization API response received');
    
    // Extract the optimized sequence from the response
    const optimizationResult = response.data;
    
    // If no routes were found, throw an error
    if (!optimizationResult.routes || optimizationResult.routes.length === 0) {
      throw new Error('No valid routes found by the optimization service');
    }
    
    // Extract the sequence of stops from the first route
    const route = optimizationResult.routes[0];
    
    // Map the optimized sequence back to the original stops
    const stops_sequence = route.steps
      .filter((step: ORSStep) => step.type === 'job') // Only include job steps with explicit type
      .map((step: ORSStep) => (step.job ?? 0) - 1); // Convert job ID back to 0-based index with fallback
    
    // Create the array of optimized stops in the correct order
    const optimizedStops = stops_sequence.map((index: number) => stops[index]);
    
    // Extract the total distance from the response
    const estimatedDistance = route.cost;
    
    return {
      optimizedStops,
      stops_sequence,
      estimatedDistance
    };
  } catch (error) {
    console.error('Error using ORS Optimization API:', error);
    throw error;
  }
}

/**
 * Generate route polyline using OpenRouteService API
 */
export async function generateRoutePolyline(
  waypoints: Array<[number, number]>,
  stops_sequence: number[] = []
): Promise<OptimizedRoute> {
  try {
    console.log("Generating route polyline with", waypoints.length, "waypoints");
    
    // Build request data
    const requestData = {
      coordinates: waypoints,
      instructions: true,
      preference: 'recommended'
    };
    
    // Log the ORS API request details
    console.log('ORS API Request URL:', 'https://api.openrouteservice.org/v2/directions/driving-car/geojson');
    console.log('ORS API Request Data:', JSON.stringify(requestData, null, 2));
    
    // Call ORS Directions API to get the route
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      data: requestData
    });

    // Log response status
    console.log("ORS API Response Status:", response.status);
    
    const route = response.data;
    const geometry = route.features[0].geometry.coordinates;
    
    // Return just the route geometry - distance and duration will be 
    // calculated by the controller using the utility functions
    return {
      route: geometry,
      distance: 0, // Will be replaced by controller
      duration: 0, // Will be replaced by controller
      stops_sequence
    };
  } catch (error: any) {
    console.error('OpenRouteService API error:');
    
    if (axios.isAxiosError(error)) {
      console.error('ORS API Request failed with status:', error.response?.status);
      console.error('ORS API Error data:', JSON.stringify(error.response?.data || {}, null, 2));
    } else {
      console.error('Non-Axios error:', error.message);
    }
    
    // If API fails, return a simplified route using the waypoints directly
    console.log('Falling back to simplified polyline after API failure');
    
    return {
      route: waypoints,
      distance: 0, // Will be replaced by controller
      duration: 0, // Will be replaced by controller
      stops_sequence
    };
  }
}