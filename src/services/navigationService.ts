import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const ORS_API_KEY = process.env.ORS_API_KEY;

interface DirectionsOptions {
  profile?: string;
  preference?: string;
  instructions?: boolean;
  language?: string;
  units?: string;
}

/**
 * Get directions from Open Route Service API
 * @param start Starting coordinates [longitude, latitude]
 * @param end Destination coordinates [longitude, latitude]
 * @param options Optional configurations for the directions request
 * @returns Directions response from ORS
 */
export async function getDirectionsFromORS(
  start: [number, number], 
  end: [number, number],
  options: DirectionsOptions = {}
): Promise<any> {
  try {
    const { 
      profile = 'driving-car', 
      preference = 'recommended', 
      instructions = true,
      language = 'en',
      units = 'meters'
    } = options;

    // Check if API key exists
    if (!ORS_API_KEY) {
      throw new Error('ORS_API_KEY is not configured in environment variables');
    }

    const response = await axios({
      method: 'POST',
      url: `https://api.openrouteservice.org/v2/directions/${profile}`,
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        coordinates: [start, end],
        preference,
        instructions,
        language,
        units,
        maneuvers: true
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting directions from ORS:', error);
    throw new Error('Failed to get directions from routing service');
  }
}

/**
 * Get directions with multiple waypoints (for full route with multiple bins)
 * @param coordinates Array of coordinates [longitude, latitude][]
 * @param options Optional configurations for the directions request
 * @returns Directions response from ORS
 */
export async function getRouteWithWaypoints(
  coordinates: [number, number][],
  options: DirectionsOptions = {}
): Promise<any> {
  try {
    const { 
      profile = 'driving-car', 
      preference = 'recommended', 
      instructions = true,
      language = 'en',
      units = 'meters'
    } = options;

    // Check if API key exists
    if (!ORS_API_KEY) {
      throw new Error('ORS_API_KEY is not configured in environment variables');
    }

    const response = await axios({
      method: 'POST',
      url: `https://api.openrouteservice.org/v2/directions/${profile}`,
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        coordinates,
        preference,
        instructions,
        language,
        units,
        maneuvers: true
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting route with waypoints from ORS:', error);
    throw new Error('Failed to get route from routing service');
  }
}

/**
 * Calculate distance between two points using Haversine formula
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