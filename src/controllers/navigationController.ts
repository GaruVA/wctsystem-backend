import { Request, Response } from 'express';
import { getDirectionsFromORS, calculateDistance } from '../services/navigationService';

/**
 * Get directions between two points
 */
export const getDirections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end } = req.body;

    // Validate the request
    if (!start || !start.length || !end || !end.length) {
      res.status(400).json({
        message: 'Start and end coordinates are required'
      });
      return;
    }

    // Get directions from Open Route Service
    const directions = await getDirectionsFromORS(start, end);
    res.json(directions);
  } catch (error) {
    console.error('Error getting directions:', error);
    res.status(500).json({ message: 'Failed to get directions' });
  }
};

/**
 * Get the next direction step based on current position and destination
 */
export const getNextDirectionStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const { current, destination } = req.body;

    // Validate the request
    if (!current || !current.length || !destination || !destination.length) {
      res.status(400).json({
        message: 'Current position and destination coordinates are required'
      });
      return;
    }

    // Get directions from Open Route Service
    const directions = await getDirectionsFromORS(current, destination);

    // Extract the next relevant step
    const nextStep = extractNextStep(directions, current);

    res.json(nextStep);
  } catch (error) {
    console.error('Error getting next direction step:', error);
    res.status(500).json({ message: 'Failed to get next direction step' });
  }
};

/**
 * Extract the next relevant navigation step based on current position
 */
function extractNextStep(directions: any, currentPosition: [number, number]) {
  if (!directions || !directions.features || !directions.features.length) {
    return {
      instruction: 'Navigate to destination',
      distance: 0,
      maneuver: {
        type: 'navigate'
      }
    };
  }

  const route = directions.features[0];
  
  if (!route.properties.segments || !route.properties.segments.length) {
    return {
      instruction: 'Navigate to destination',
      distance: 0,
      maneuver: {
        type: 'navigate'
      }
    };
  }
  
  const steps = route.properties.segments[0].steps;
  
  if (!steps || !steps.length) {
    return {
      instruction: 'Navigate to destination',
      distance: 0,
      maneuver: {
        type: 'navigate'
      }
    };
  }

  // Find the closest step
  let closestStepIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepPoint = route.geometry.coordinates[step.way_points[0]];
    
    // Calculate distance to this step's start point
    const distance = calculateDistance(
      currentPosition[1], currentPosition[0], 
      stepPoint[1], stepPoint[0]
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestStepIndex = i;
    }
  }

  // Get the next step (or current if it's the last one)
  const nextStepIndex = Math.min(closestStepIndex + 1, steps.length - 1);
  const nextStep = steps[nextStepIndex];

  // Format the response
  return {
    instruction: nextStep.instruction,
    distance: nextStep.distance,
    duration: nextStep.duration,
    name: nextStep.name,
    maneuver: {
      type: mapManeuverType(nextStep.type),
      modifier: mapManeuverModifier(nextStep.type)
    }
  };
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
 * Map Open Route Service maneuver modifiers
 */
function mapManeuverModifier(orsType: number): string | undefined {
  // ORS maneuver modifiers mapping
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
  
  return modifiers[orsType];
}