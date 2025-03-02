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
  route: Array<[number, number]>; // The optimized route coordinates
  distance: string | number; // Total distance in meters or formatted string
  duration: string | number; // Total duration in seconds or formatted string
  stops_sequence?: number[]; // The sequence of stops in the optimized order
}

/**
 * Optimize a collection route
 */
export async function optimizeRoute(
  start: [number, number], 
  stops: Array<[number, number]>, 
  end: [number, number]
): Promise<OptimizedRoute> {
  try {
    console.log('Route optimization requested');
    
    // Use OpenRouteService if API key is available, otherwise use local optimization
    if (useOpenRouteService) {
      console.log('Using OpenRouteService API');
      return await optimizeWithORS(start, stops, end);
    } else {
      console.log('Using local optimization algorithm (no ORS_API_KEY provided)');
      return optimizeLocally(start, stops, end);
    }
  } catch (error: any) {
    console.error('Route optimization error:', error);
    // Fallback to local algorithm if API fails
    if (useOpenRouteService) {
      console.log('Falling back to local optimization algorithm');
      return optimizeLocally(start, stops, end);
    }
    throw new Error('Failed to optimize route: ' + error.message);
  }
}

/**
 * Optimize using the OpenRouteService API
 */
async function optimizeWithORS(
  start: [number, number], 
  stops: Array<[number, number]>, 
  end: [number, number]
): Promise<OptimizedRoute> {
  try {
    // Create waypoints array including start, stops and end points
    const waypoints = [start, ...stops, end];
    
    // Format coordinates as expected by ORS API: [[long,lat], [long,lat], ...]
    // The coordinates must be a 2D array stringified correctly
    const coordinatesArray = waypoints.map(point => point);
    
    console.log("Sending coordinates to ORS:", coordinatesArray);
    
    // Call ORS Directions API to get the route
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      data: {
        coordinates: coordinatesArray
      }
    });

    console.log("ORS API response received");
    
    const route = response.data;
    const geometry = route.features[0].geometry.coordinates;
    const properties = route.features[0].properties;
    
    // Get segments information
    const segments = properties.segments[0];
    const distance = segments.distance;
    const duration = segments.duration;
    
    // Create a stops_sequence that follows the original order
    const stops_sequence = stops.map((_, index) => index);
    
    return {
      route: geometry,
      distance: formatDistance(distance),
      duration: formatDuration(duration),
      stops_sequence
    };
  } catch (error: any) {
    console.error('OpenRouteService API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Local optimization using nearest neighbor algorithm
 */
function optimizeLocally(
  start: [number, number],
  stops: Array<[number, number]>,
  end: [number, number]
): OptimizedRoute {
  // Simple nearest neighbor algorithm
  let route = [start];
  let remaining = [...stops];
  let currentPoint = start;
  let totalDistance = 0;
  let stops_sequence: number[] = [];
  
  while (remaining.length > 0) {
    // Find closest remaining stop
    let closestIndex = 0;
    let closestDistance = calculateDistance(currentPoint, remaining[0]);
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(currentPoint, remaining[i]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    // Add closest stop to route and sequence
    currentPoint = remaining[closestIndex];
    route.push(currentPoint);
    
    // Find original index in the stops array
    const originalIndex = stops.findIndex(
      stop => stop[0] === currentPoint[0] && stop[1] === currentPoint[1]
    );
    stops_sequence.push(originalIndex);
    
    totalDistance += closestDistance;
    
    // Remove stop from remaining
    remaining.splice(closestIndex, 1);
  }
  
  // Add end point
  const finalLegDistance = calculateDistance(currentPoint, end);
  route.push(end);
  totalDistance += finalLegDistance;
  
  // Estimated speed: 30 km/h = 8.33 m/s
  const averageSpeed = 8.33;
  const totalDuration = totalDistance / averageSpeed;
  
  return {
    route,
    distance: formatDistance(totalDistance),
    duration: formatDuration(totalDuration),
    stops_sequence
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  // Convert to radians
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(point1[1]); // latitude
  const φ2 = toRad(point2[1]); // latitude
  const Δφ = toRad(point2[1] - point1[1]);
  const Δλ = toRad(point2[0] - point1[0]);
  
  // Haversine formula
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
}

/**
 * Format distance in km with 1 decimal place
 */
function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1) + ' km';
}

/**
 * Format duration in minutes, rounded up
 */
function formatDuration(seconds: number): string {
  return Math.ceil(seconds / 60) + ' min';
}