// filepath: c:\Users\User\Desktop\wct\backend\src\services\geoSpatialService.ts
import Area, { IArea } from '../models/Area';
import { Types } from 'mongoose';

/**
 * Finds which area a bin belongs to based on its coordinates
 * @param coordinates [longitude, latitude] coordinates of the bin
 * @returns area ID if found, null if not within any area
 */
export const findAreaForBin = async (coordinates: number[]): Promise<Types.ObjectId | null> => {
  try {
    if (!coordinates || coordinates.length !== 2) {
      console.log('[GeoSpatialService] Invalid coordinates provided', coordinates);
      return null;
    }

    // Create GeoJSON point for the bin location
    const point = {
      type: 'Point',
      coordinates: [coordinates[0], coordinates[1]] // [longitude, latitude]
    };

    // Find an area that contains this point
    const containingArea = await Area.findOne({
      'geometry': {
        $geoIntersects: {
          $geometry: point
        }
      }
    });

    if (!containingArea) {
      console.log(`[GeoSpatialService] No area found containing coordinates [${coordinates}]`);
      return null;
    }

    console.log(`[GeoSpatialService] Bin at [${coordinates}] belongs to area: ${containingArea.name}`);
    // Explicitly ensure we're returning the correct type
    return containingArea._id as Types.ObjectId;
  } catch (error) {
    console.error('[GeoSpatialService] Error finding area for bin:', error);
    return null;
  }
};

/**
 * Helper function to determine if a point is within a polygon
 * Note: This is a fallback in case MongoDB $geoIntersects doesn't work
 * Uses the ray-casting algorithm (even-odd rule)
 */
export const isPointInPolygon = (point: number[], polygon: number[][][]): boolean => {
  // Point coordinates [longitude, latitude]
  const [x, y] = point;
  let inside = false;
  
  // Check each ring of the polygon
  for (const ring of polygon) {
    // For each edge of the ring
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
      if (intersect) {
        inside = !inside;
      }
    }
  }
  
  return inside;
};

/**
 * Updates the area of a bin based on its current location
 * @param binId ID of the bin
 * @param coordinates [longitude, latitude] coordinates of the bin
 */
export const updateBinArea = async (binId: string, coordinates: number[]): Promise<Types.ObjectId | null> => {
  try {
    const areaId = await findAreaForBin(coordinates);
    console.log(`[GeoSpatialService] Area ID for bin ${binId}:`, areaId);
    return areaId;
  } catch (error) {
    console.error(`[GeoSpatialService] Error updating area for bin ${binId}:`, error);
    return null;
  }
};