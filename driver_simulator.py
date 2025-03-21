#!/usr/bin/env python3
"""
Driver Simulator for WCTSystem

This script simulates a waste collector following a route with stops at bin coordinates.
It calls the collector's updateLocation API endpoint to update the position in real time.
"""

import requests
import json
import time
from typing import List, Tuple, Dict
import os
import argparse
from datetime import datetime
import math

def evenly_space_coordinates(coordinates: List[List[float]], spacing_factor: float = 0.0001) -> List[List[float]]:
    """
    Create evenly spaced points along line segments in a route.
    
    Args:
        coordinates: List of [longitude, latitude] coordinates
        spacing_factor: Approximate spacing between points in degrees
        
    Returns:
        New list with evenly spaced coordinates
    """
    if len(coordinates) < 2:
        return coordinates
    
    result = [coordinates[0]]  # Start with the first point
    
    for i in range(len(coordinates) - 1):
        start_point = coordinates[i]
        end_point = coordinates[i + 1]
        
        # Calculate distance between points
        distance = math.sqrt(
            (end_point[0] - start_point[0])**2 + 
            (end_point[1] - start_point[1])**2
        )
        
        # Calculate number of intermediate points needed
        num_points = max(1, int(distance / spacing_factor))
        
        # Generate intermediate points
        for j in range(1, num_points):
            ratio = j / num_points
            intermediate_lon = start_point[0] + ratio * (end_point[0] - start_point[0])
            intermediate_lat = start_point[1] + ratio * (end_point[1] - start_point[1])
            result.append([round(intermediate_lon, 6), round(intermediate_lat, 6)])
        
        # Add the end point (except for the last iteration, as we'll add the final point at the end)
        if i < len(coordinates) - 2:
            result.append(end_point)
    
    # Add the final point
    result.append(coordinates[-1])
    
    return result

# Original route coordinates
ORIGINAL_ROUTE_COORDINATES = [
    [-73.957618, 40.776143],
    [-73.957939, 40.776281],
    [-73.959469, 40.77693],
    [-73.959649, 40.777006],
    [-73.961166, 40.777636],
    [-73.960701, 40.778272],
    [-73.959824, 40.777904],
    [-73.959189, 40.777637],
    [-73.959649, 40.777006],
    [-73.960115, 40.776368],
    [-73.960606, 40.775689],
    [-73.961107, 40.774999],
    [-73.96093, 40.774925],
    [-73.960267, 40.774645],
    [-73.959397, 40.77428],
    [-73.959854, 40.773656],
    [-73.960321, 40.773016],
    [-73.959191, 40.77254]
]

# Create evenly spaced route coordinates
ROUTE_COORDINATES = evenly_space_coordinates(ORIGINAL_ROUTE_COORDINATES, 0.0002)

# Define bin/stop coordinates (these are the waypoints we want to stop at)
BIN_COORDINATES = [
    [-73.9599, 40.7778],  # First bin
    [-73.9603, 40.7746],  # Second bin
    [-73.959, 40.7728]    # Third bin (dump location)
]

# Tolerance for determining if we've reached a waypoint (in degrees)
COORDINATE_TOLERANCE = 0.0005

# Bins to reset fill levels for - using MongoDB ObjectIDs
BINS_TO_RESET = {
    "67cbf9384d042a183ab3e09c": 75,  # First bin ID with fill level 75%
    "67cbf9384d042a183ab3e096": 95   # Second bin ID with fill level 95%
}

class DriverSimulator:
    def __init__(self, 
                 base_url: str = 'http://localhost:5000', 
                 token: str = None,
                 speed: float = 0.1,  # Reduced from 1.0 to 0.1 (1/10th speed)
                 pause_time: int = 10):
        """
        Initialize the driver simulator.
        
        Args:
            base_url: API base URL
            token: Authentication token for the collector
            speed: Speed multiplier (higher values = faster simulation)
            pause_time: Time to pause at each bin (in seconds)
        """
        self.base_url = base_url
        self.token = token
        self.speed = speed
        self.pause_time = pause_time
        
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}' if self.token else None
        }
        
        if not self.token:
            print("Warning: No authentication token provided. Authentication will fail.")
    
    def reset_bin_fill_levels(self) -> None:
        """Reset fill levels for specified bins at the beginning of simulation."""
        print(f"Resetting fill levels for {len(BINS_TO_RESET)} bins...")
        
        for bin_id, fill_level in BINS_TO_RESET.items():
            # Use direct PUT request to update the bin through the existing API endpoint
            url = f"{self.base_url}/api/bins/{bin_id}/update-fill-level"
            
            payload = {
                "fillLevel": fill_level,
                "lastCollected": datetime.now().isoformat()
            }
            
            try:
                print(f"Setting bin {bin_id} fill level to {fill_level}%")
                response = requests.put(url, json=payload, headers=self.headers)
                response.raise_for_status()
                print(f"Successfully reset bin {bin_id} fill level to {fill_level}%")
            except requests.exceptions.RequestException as e:
                print(f"Error resetting bin {bin_id} fill level: {e}")
                if hasattr(e, 'response') and e.response:
                    print(f"Response: {e.response.text}")
                
                # Fallback: Try using the /collect endpoint with modified logic to set fill level
                try:
                    print(f"Attempting alternative method to update fill level for bin {bin_id}")
                    # Create a direct request to update the bin in database using the Bin.findByIdAndUpdate method
                    fallback_url = f"{self.base_url}/api/bins/direct-update"
                    fallback_payload = {
                        "binId": bin_id,
                        "updates": {
                            "fillLevel": fill_level
                        }
                    }
                    fallback_response = requests.post(fallback_url, json=fallback_payload, headers=self.headers)
                    fallback_response.raise_for_status()
                    print(f"Successfully reset bin {bin_id} fill level using alternative method")
                except requests.exceptions.RequestException as fallback_error:
                    print(f"All attempts to update bin {bin_id} failed. Proceeding with simulation anyway.")
    
    def _is_near_waypoint(self, current_position: List[float], waypoint: List[float]) -> bool:
        """Check if current position is near a waypoint within the tolerance."""
        # For simplicity, using basic coordinate distance check
        return (abs(current_position[0] - waypoint[0]) < COORDINATE_TOLERANCE and
                abs(current_position[1] - waypoint[1]) < COORDINATE_TOLERANCE)
    
    def update_location(self, longitude: float, latitude: float) -> Dict:
        """
        Update the collector's location via API.
        
        Args:
            longitude: Current longitude
            latitude: Current latitude
            
        Returns:
            API response as dictionary
        """
        url = f"{self.base_url}/api/collector/location"
        payload = {
            "longitude": longitude,
            "latitude": latitude
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error updating location: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return {"error": str(e)}
    
    def drive_route(self) -> None:
        """Drive the predefined route, updating location and pausing at bin waypoints."""
        # First reset the bin fill levels
        self.reset_bin_fill_levels()
        
        print(f"Starting route simulation with {len(ROUTE_COORDINATES)} points and {len(BIN_COORDINATES)} bins")
        print(f"Speed multiplier: {self.speed}x, Pause time at bins: {self.pause_time} seconds")
        
        # For each point in the route
        for i, coords in enumerate(ROUTE_COORDINATES):
            current_time = datetime.now().strftime("%H:%M:%S")
            longitude, latitude = coords
            
            # Check if we're near any bin waypoint
            is_at_bin = False
            bin_index = None
            
            for idx, bin_coords in enumerate(BIN_COORDINATES):
                if self._is_near_waypoint(coords, bin_coords):
                    is_at_bin = True
                    bin_index = idx
                    break
            
            # Update location
            print(f"[{current_time}] Position {i+1}/{len(ROUTE_COORDINATES)}: [{longitude}, {latitude}]", end="")
            response = self.update_location(longitude, latitude)
            
            if "message" in response:
                print(f" - Server: {response.get('message', 'No message')}")
            else:
                print(" - Updated")
            
            # If at bin, pause for collection
            if is_at_bin:
                print(f"\n[{current_time}] REACHED BIN #{bin_index+1} AT COORDINATES {BIN_COORDINATES[bin_index]}")
                print(f"Pausing for {self.pause_time} seconds to simulate bin collection...")
                time.sleep(self.pause_time)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Resuming route...")
            
            # Sleep between points (simulate movement speed)
            # We'll sleep less if we're at higher speed multiplier
            if i < len(ROUTE_COORDINATES) - 1:
                sleep_time = 1.0 / self.speed
                time.sleep(sleep_time)
        
        print("Route simulation completed!")

def login(base_url: str, username: str, password: str) -> str:
    """Login the collector and get authentication token."""
    url = f"{base_url}/api/collector/login"
    payload = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("token", "")
    except requests.exceptions.RequestException as e:
        print(f"Login error: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return ""

def main():
    parser = argparse.ArgumentParser(description="Driver Simulator for WCTSystem")
    parser.add_argument("--url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--username", default="collector1", help="Collector username")
    parser.add_argument("--password", default="password", help="Collector password")
    parser.add_argument("--speed", type=float, default=0.4, help="Simulation speed multiplier")  # Reduced from 1.0 to 0.1 (1/10th speed)
    parser.add_argument("--pause", type=int, default=5, help="Time to pause at each bin (seconds)")
    parser.add_argument("--token", help="Provide token directly instead of login")
    parser.add_argument("--skip-reset", action="store_true", help="Skip resetting bin fill levels")
    
    args = parser.parse_args()
    
    # Get token either from args or by logging in
    token = args.token
    if not token:
        print(f"Logging in as {args.username}...")
        token = login(args.url, args.username, args.password)
        if not token:
            print("Login failed. Exiting.")
            return
        print("Login successful!")
    
    # Create and run the simulator
    simulator = DriverSimulator(
        base_url=args.url,
        token=token,
        speed=args.speed,
        pause_time=args.pause
    )
    
    simulator.drive_route()

if __name__ == "__main__":
    main()