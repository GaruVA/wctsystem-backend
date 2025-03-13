import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const ORS_API_KEY = process.env.ORS_API_KEY;

interface DirectionStep {
  instruction: string;
  distance: number;
  duration: number;
  name?: string;
  maneuver: {
    type: string;
    modifier?: string;
  };
}

/**
 * Get turn-by-turn directions from Open Route Service
 */
export async function getDirectionsFromORS(
  start: [number, number],
  end: [number, number]
): Promise<any> {
  if (!ORS_API_KEY) {
    throw new Error('ORS_API_KEY is not configured');
  }

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      data: {
        coordinates: [start, end],
        instructions: true,
        language: 'en',
        units: 'meters',
        maneuvers: true
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error getting directions from ORS:', error.response?.data || error.message);
    throw new Error('Failed to get directions from routing service');
  }
}

/**
 * Get the remaining distance to destination
 */
export async function getRemainingDistance(
  current: [number, number],
  destination: [number, number]
): Promise<number> {
  try {
    const directions = await getDirectionsFromORS(current, destination);
    if (!directions?.features?.[0]?.properties?.segments?.[0]) {
      throw new Error('Invalid response from routing service');
    }
    
    return directions.features[0].properties.segments[0].distance;
  } catch (error) {
    console.error('Error calculating remaining distance:', error);
    throw error;
  }
}

/**
 * Calculate Haversine distance between two points
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}