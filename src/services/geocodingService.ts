import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const ORS_API_KEY = process.env.ORS_API_KEY;

/**
 * Get address from coordinates using Open Routing Service
 * @param coordinates Array of [longitude, latitude]
 * @returns Address as a string
 */
export const getAddressFromCoordinates = async (coordinates: [number, number]): Promise<string> => {
  const [longitude, latitude] = coordinates;
  
  // Use environment variable instead of hardcoded key
  const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_API_KEY}&point.lon=${longitude}&point.lat=${latitude}`;

  try {
    const response = await axios.get(url);
    const address = response.data.features[0]?.properties?.label || 'Unknown address';
    return address;
  } catch (error) {
    console.error('API: Failed to get address from coordinates:', error);
    return 'Unknown address';
  }
};

/**
 * Get formatted address from coordinates
 * With error handling and fallback
 */
export const getFormattedAddress = async (coordinates: [number, number]): Promise<string> => {
  if (!coordinates || coordinates.length !== 2) {
    return 'Invalid coordinates';
  }
  
  try {
    // Only attempt API call if we have a key
    if (ORS_API_KEY) {
      return await getAddressFromCoordinates(coordinates);
    } else {
      console.warn('No ORS_API_KEY provided, returning coordinates as string');
      return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
    }
  } catch (error) {
    console.error('Failed to get formatted address:', error);
    return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
  }
};
