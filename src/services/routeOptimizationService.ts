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
  steps?: any[]; // Turn-by-turn navigation instructions
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
    console.log('Route optimization requested');
    
    // Step 1: Optimize the bin collection order
    const optimizedOrder = await optimizeBinOrder(start, stops, end);
    
    // Step 2: Generate the actual route polyline with optimized waypoints
    const waypoints = [start, ...optimizedOrder.optimizedStops, end];
    
    // Use OpenRouteService to get the detailed route if API key is available
    if (useOpenRouteService) {
      console.log('Using OpenRouteService API for route polyline generation');
      return await generateRoutePolyline(waypoints, optimizedOrder.stops_sequence);
    } else {
      console.log('Using simplified polyline (no ORS_API_KEY provided)');
      
      // Create simplified steps for each segment
      const steps = [];
      let currentPoint = start;
      let totalDistance = 0;
      
      // Add initial departure step
      steps.push({
        instruction: "Start your journey",
        distance: "0 km",
        duration: 0,
        name: "",
        maneuver: {
          type: "depart",
          modifier: "straight"
        }
      });
      
      // Add intermediate steps for each waypoint
      for (let i = 0; i < optimizedOrder.optimizedStops.length; i++) {
        const nextPoint = optimizedOrder.optimizedStops[i];
        const legDistance = calculateDistance(currentPoint, nextPoint);
        totalDistance += legDistance;
        
        steps.push({
          instruction: `Continue to bin ${optimizedOrder.stops_sequence[i] + 1}`,
          distance: formatDistance(legDistance),
          duration: Math.ceil(legDistance / 8.33),
          name: "",
          maneuver: {
            type: "continue",
            modifier: "straight"
          }
        });
        
        currentPoint = nextPoint;
      }
      
      // Add final step to the end point
      const finalLegDistance = calculateDistance(currentPoint, end);
      totalDistance += finalLegDistance;
      
      steps.push({
        instruction: "Arrive at destination",
        distance: formatDistance(finalLegDistance),
        duration: Math.ceil(finalLegDistance / 8.33),
        name: "",
        maneuver: {
          type: "arrive",
          modifier: undefined
        }
      });
      
      // Return the simplified route information
      return {
        route: waypoints,
        distance: formatDistance(totalDistance),
        duration: formatDuration(totalDistance / 8.33), // Estimate based on 30km/h
        stops_sequence: optimizedOrder.stops_sequence,
        steps: steps
      };
    }
  } catch (error: any) {
    console.error('Route optimization error:', error);
    throw new Error('Failed to optimize route: ' + error.message);
  }
}

/**
 * Optimize the order of bin collections to minimize travel distance
 * This function determines the optimal sequence of bins using ORS Optimization API if available
 * Otherwise, falls back to local nearest-neighbor algorithm
 */
export async function optimizeBinOrder(
  start: [number, number],
  stops: Array<[number, number]>,
  end: [number, number]
): Promise<OptimizedBinOrder> {
  // If ORS API key is available, use the ORS Optimization API
  if (useOpenRouteService) {
    try {
      console.log('Using ORS Optimization API for bin order optimization');
      return await optimizeWithORSApi(start, stops, end);
    } catch (error) {
      console.error('ORS Optimization API failed, falling back to local optimization:', error);
      // If ORS fails, fall back to local optimization
      return optimizeWithNearestNeighbor(start, stops, end);
    }
  } else {
    // Use local optimization if no API key is available
    console.log('Using local nearest-neighbor for bin order optimization (no ORS_API_KEY)');
    return optimizeWithNearestNeighbor(start, stops, end);
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
 * Optimize bin order using Nearest Neighbor algorithm
 * Local implementation for when ORS API is not available or fails
 */
function optimizeWithNearestNeighbor(
  start: [number, number],
  stops: Array<[number, number]>,
  end: [number, number]
): OptimizedBinOrder {
  // Simple nearest neighbor algorithm for bin order optimization
  let optimizedStops: Array<[number, number]> = [];
  let remaining = [...stops];
  let currentPoint = start;
  let totalDistance = 0;
  let stops_sequence: number[] = [];
  
  console.log(`Optimizing order for ${stops.length} bins using nearest neighbor algorithm`);
  
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
    
    // Add closest stop to optimized route
    currentPoint = remaining[closestIndex];
    optimizedStops.push(currentPoint);
    
    // Find original index in the stops array
    const originalIndex = stops.findIndex(
      stop => stop[0] === currentPoint[0] && stop[1] === currentPoint[1]
    );
    stops_sequence.push(originalIndex);
    
    totalDistance += closestDistance;
    
    // Remove stop from remaining
    remaining.splice(closestIndex, 1);
  }
  
  // Add the distance to the end point from the last stop
  if (optimizedStops.length > 0) {
    totalDistance += calculateDistance(optimizedStops[optimizedStops.length - 1], end);
  }
  
  // Return the optimized data
  return {
    optimizedStops,
    stops_sequence,
    estimatedDistance: totalDistance
  };
}

/**
 * Generate detailed route polyline using OpenRouteService API
 * This function takes waypoints and generates turn-by-turn route geometry
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
      maneuvers: true,
      preference: 'recommended'
    };
    
    // Log the ORS API request details
    console.log('ORS API Request URL:', 'https://api.openrouteservice.org/v2/directions/driving-car/geojson');
    console.log('ORS API Request Headers:', {
      'Authorization': '[REDACTED API KEY]',
      'Content-Type': 'application/json',
      'Accept': 'application/json, application/geo+json'
    });
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

    // Log response status and basic structure
    console.log("ORS API Response Status:", response.status);
    console.log("ORS API Response Structure:", JSON.stringify({
      type: response.data.type,
      metadata: response.data.metadata,
      bbox: response.data.bbox,
      features: Array.isArray(response.data.features) ? 
        `Array with ${response.data.features.length} features` : 'No features found',
      properties: response.data.features?.[0]?.properties ? {
        segments: `${response.data.features[0].properties.segments?.length || 0} segments`,
        summary: response.data.features[0].properties.summary,
        way_points: response.data.features[0].properties.way_points
      } : 'No properties found'
    }, null, 2));
    
    // Log complete polyline coordinates
    const geometryCoordinates = response.data.features?.[0]?.geometry?.coordinates || [];
    console.log("ORS API Geometry Summary:", `${geometryCoordinates.length} coordinate points in polyline`);
    console.log("ORS API Complete Polyline Coordinates:", JSON.stringify(geometryCoordinates));
    
    const route = response.data;
    const geometry = route.features[0].geometry.coordinates;
    const properties = route.features[0].properties;
    
    // Get segments information
    const segments = properties.segments[0];
    const distance = segments.distance;
    const duration = segments.duration;
    
    // Process steps to include turn-by-turn navigation instructions
    const steps = segments.steps.map((step: any) => {
      // Map the ORS step to our standardized format
      return {
        instruction: step.instruction,
        distance: formatDistance(step.distance),
        duration: step.duration,
        name: step.name || '',
        maneuver: {
          type: mapManeuverType(step.type),
          modifier: mapManeuverModifier(step.type, step.instruction)
        }
      };
    });

    return {
      route: geometry,
      distance: formatDistance(distance),
      duration: formatDuration(duration),
      stops_sequence,
      steps
    };
  } catch (error: any) {
    console.error('OpenRouteService API error:');
    
    if (axios.isAxiosError(error)) {
      console.error('ORS API Request failed with status:', error.response?.status);
      console.error('ORS API Error data:', JSON.stringify(error.response?.data || {}, null, 2));
      console.error('ORS API Error config:', JSON.stringify({
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers ? 'Headers present' : 'No headers',
        data: error.config?.data ? JSON.parse(error.config.data as string) : 'No data'
      }, null, 2));
    } else {
      console.error('Non-Axios error:', error.message);
    }
    
    // If API fails, return a simplified route using the waypoints directly
    console.log('Falling back to simplified polyline after API failure');
    
    // Calculate a rough estimate of the total distance
    let estimatedDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      estimatedDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
    }
    
    // Create simplified steps for each segment
    const steps = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const legDistance = calculateDistance(waypoints[i], waypoints[i + 1]);
      steps.push({
        instruction: i === 0 ? "Start" : i === waypoints.length - 2 ? "Arrive at destination" : `Continue to next waypoint`,
        distance: formatDistance(legDistance),
        duration: Math.ceil(legDistance / 8.33), // Estimate based on 30km/h
        name: "",
        maneuver: {
          type: i === 0 ? "depart" : i === waypoints.length - 2 ? "arrive" : "continue",
          modifier: "straight"
        }
      });
    }
    
    return {
      route: waypoints,
      distance: formatDistance(estimatedDistance),
      duration: formatDuration(estimatedDistance / 8.33), // Estimate based on 30km/h
      stops_sequence,
      steps
    };
  }
}

/**
 * Map Open Route Service maneuver types to our frontend types
 */
function mapManeuverType(orsType: number): string {
  // ORS maneuver types mapping
  // https://github.com/GIScience/openrouteservice/blob/master/openrouteservice/src/main/java/org/heigit/ors/api/responses/routing/json/JSONIndication.java
  const types: {[key: number]: string} = {
    0: 'continue', // "Unknown" - default to continue
    1: 'continue',
    2: 'depart',
    3: 'turn',
    4: 'turn',
    5: 'turn',
    6: 'turn',
    7: 'turn',
    8: 'turn',
    9: 'roundabout',
    10: 'roundabout',
    11: 'merge',
    12: 'merge',
    13: 'arrive',
    14: 'arrive',
    15: 'arrive'
  };
  
  return types[orsType] || 'continue';
}

/**
 * Map Open Route Service maneuver modifiers based on type and instruction text
 */
function mapManeuverModifier(orsType: number, instruction: string = ''): string | undefined {
  // Basic ORS maneuver modifiers mapping
  const modifiers: {[key: number]: string | undefined} = {
    0: undefined,
    1: 'straight',
    2: undefined,
    3: 'slight right',
    4: 'right',
    5: 'sharp right',
    6: 'sharp left',
    7: 'left',
    8: 'slight left',
    9: undefined,
    10: undefined,
    11: 'slight right',
    12: 'slight left',
    13: undefined,
    14: undefined,
    15: undefined
  };
  
  // Use the basic mapping
  let modifier = modifiers[orsType];
  
  // If we still don't have a modifier, try to infer from instruction text
  if (!modifier && instruction) {
    const instructionLower = instruction.toLowerCase();
    if (instructionLower.includes('right')) {
      if (instructionLower.includes('slight')) {
        modifier = 'slight right';
      } else if (instructionLower.includes('sharp')) {
        modifier = 'sharp right';
      } else {
        modifier = 'right';
      }
    } else if (instructionLower.includes('left')) {
      if (instructionLower.includes('slight')) {
        modifier = 'slight left';
      } else if (instructionLower.includes('sharp')) {
        modifier = 'sharp left';
      } else {
        modifier = 'left';
      }
    } else if (instructionLower.includes('straight') || 
               instructionLower.includes('continue') || 
               instructionLower.includes('head')) {
      modifier = 'straight';
    }
  }
  
  return modifier;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(point1: [number, number], point2: [number, number]): number {
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
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1) + ' km';
}

/**
 * Format duration in minutes, rounded up
 */
export function formatDuration(seconds: number): string {
  return Math.ceil(seconds / 60) + ' min';
}