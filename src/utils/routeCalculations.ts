import { IBin } from '../models/Bin';

/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth radius in kilometers
  const earthRadius = 6371;
  return earthRadius * c;
}

/**
 * Calculate realistic route distance and duration for garbage collection
 * @param coordinates Array of route coordinates [lon, lat]
 * @param bins Optional array of full bin objects (used for more accurate collection time estimation)
 * @returns Object with distance (km) and duration (minutes)
 */
export function calculateRouteMetrics(
  coordinates: [number, number][],
  bins?: IBin[]
): { distance: number; duration: number } {
  if (coordinates.length < 2) {
    return { distance: 0, duration: 0 };
  }
  
  // Parameters that can be adjusted based on real-world data
  const TRUCK_SPEED_KMH = 10; // Average garbage truck speed in km/h in urban areas
  const BASE_COLLECTION_TIME_MINS = 5; // Base time to collect from a bin in minutes
  const FILL_LEVEL_TIME_MULTIPLIER = 0.02; // Additional time per fill level percentage
  
  let totalDistanceKm = 0;
  let totalDurationMins = 0;
  
  // Calculate distances between consecutive coordinates
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    
    // Fixed: Ensure correct order of parameters (latitude, longitude)
    const segmentDistance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    
    // Add distance to total
    totalDistanceKm += segmentDistance;
    
    // Add travel time for this segment (distance ÷ speed = time in hours, convert to minutes)
    const segmentDurationMins = (segmentDistance / TRUCK_SPEED_KMH) * 60;
    totalDurationMins += segmentDurationMins;
    
    // Add debugging log to see what's happening
    console.log(`Segment ${i}: [${lat1}, ${lon1}] to [${lat2}, ${lon2}] = ${segmentDistance.toFixed(4)} km`);
  }
  
  // Add collection time for each bin if bins are provided
  if (bins && bins.length > 0) {
    // Sum up collection times based on fill levels
    const collectionTimeMins = bins.reduce((sum, bin) => {
      // Base collection time plus additional time based on fill level
      const binCollectionTime = BASE_COLLECTION_TIME_MINS + 
        (bin.fillLevel * FILL_LEVEL_TIME_MULTIPLIER);
      
      return sum + binCollectionTime;
    }, 0);
    
    totalDurationMins += collectionTimeMins;
    console.log(`Collection time for ${bins.length} bins: ${Math.round(collectionTimeMins)} mins`);
  } else {
    // If no bins provided, estimate based on number of stops (coordinates minus start/end)
    const estimatedBinCount = Math.max(0, coordinates.length - 2);
    const estimatedCollectionTime = estimatedBinCount * BASE_COLLECTION_TIME_MINS;
    totalDurationMins += estimatedCollectionTime;
    console.log(`Estimated collection time for ${estimatedBinCount} bins: ${Math.round(estimatedCollectionTime)} mins`);
  }
  
  // Apply minimum values to prevent 0 km or 0 minutes
  totalDistanceKm = Math.max(0.01, totalDistanceKm); // Minimum 10m
  totalDurationMins = Math.max(1, totalDurationMins); // Minimum 1 minute
  
  // Round to reasonable precision
  totalDistanceKm = Math.round(totalDistanceKm * 100) / 100; // 2 decimal places
  totalDurationMins = Math.round(totalDurationMins);
  
  console.log(`Final route metrics: ${totalDistanceKm.toFixed(2)} km, ${totalDurationMins} mins`);
  
  return {
    distance: totalDistanceKm,
    duration: totalDurationMins
  };
}