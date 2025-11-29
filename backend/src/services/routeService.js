/**
 * Route Service
 *
 * Handles route optimization for multi-stop delivery routes
 * Implements nearest neighbor algorithm for route optimization
 * Follows PHASE 3 patterns: Service layer, Haversine formula, error handling
 */

const pool = require('../config/database');
const AuditService = require('./auditService');

class RouteService {
  /**
   * Calculate distance between two points using Haversine formula
   * Same implementation as used in CourierService for consistency
   *
   * @param {Object} point1 - First point with latitude and longitude
   * @param {Object} point2 - Second point with latitude and longitude
   * @returns {number} Distance in kilometers
   */
  static haversine(point1, point2) {
    const R = 6371; // Earth's radius in kilometers

    const lat1 = point1.latitude;
    const lon1 = point1.longitude;
    const lat2 = point2.latitude;
    const lon2 = point2.longitude;

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Optimize delivery route using nearest neighbor (greedy) algorithm
   * This is a simple, fast heuristic that works well for most delivery routes
   *
   * @param {Array} stops - Array of stop objects with latitude, longitude, and other data
   * @param {Object} start - Optional starting point (courier's current location)
   * @returns {Object} Optimized route with stops array and total distance
   */
  static calculateOptimalRoute(stops, start = null) {
    try {
      // Validate input
      if (!Array.isArray(stops)) {
        throw new Error('Stops must be an array');
      }

      if (stops.length === 0) {
        return {
          route: [],
          totalDistance: 0,
          estimatedTime: 0
        };
      }

      // Validate that all stops have required fields
      for (const stop of stops) {
        if (
          typeof stop.latitude !== 'number' ||
          typeof stop.longitude !== 'number'
        ) {
          throw new Error('All stops must have latitude and longitude as numbers');
        }

        if (stop.latitude < -90 || stop.latitude > 90) {
          throw new Error('Latitude must be between -90 and 90 degrees');
        }

        if (stop.longitude < -180 || stop.longitude > 180) {
          throw new Error('Longitude must be between -180 and 180 degrees');
        }
      }

      // If only one stop, return it as-is
      if (stops.length === 1) {
        return {
          route: stops,
          totalDistance: 0,
          estimatedTime: 0
        };
      }

      // Determine starting point
      let currentPosition = start || stops[0];
      const route = [];
      const remaining = [...stops];

      // If we have a separate start point, don't include it in remaining stops
      if (start) {
        // Starting from courier's current location
      } else {
        // Starting from first stop, remove it from remaining
        remaining.shift();
        route.push(stops[0]);
        currentPosition = stops[0];
      }

      let totalDistance = 0;

      // Nearest neighbor algorithm
      while (remaining.length > 0) {
        let nearestStop = null;
        let minDistance = Infinity;
        let nearestIndex = -1;

        // Find the nearest unvisited stop
        for (let i = 0; i < remaining.length; i++) {
          const stop = remaining[i];
          const distance = this.haversine(currentPosition, stop);

          if (distance < minDistance) {
            minDistance = distance;
            nearestStop = stop;
            nearestIndex = i;
          }
        }

        // Add nearest stop to route
        if (nearestStop) {
          route.push(nearestStop);
          totalDistance += minDistance;
          currentPosition = nearestStop;
          remaining.splice(nearestIndex, 1);
        }
      }

      // Round total distance to 2 decimal places
      totalDistance = Math.round(totalDistance * 100) / 100;

      return {
        route,
        totalDistance,
        totalStops: route.length
      };
    } catch (error) {
      console.error('Calculate optimal route error:', error);
      throw error;
    }
  }

  /**
   * Calculate total route distance
   * Sums up distances between consecutive stops in the given order
   *
   * @param {Array} stops - Array of stops in order
   * @returns {number} Total distance in kilometers
   */
  static calculateRouteDistance(stops) {
    try {
      if (!Array.isArray(stops)) {
        throw new Error('Stops must be an array');
      }

      if (stops.length <= 1) {
        return 0;
      }

      let totalDistance = 0;

      for (let i = 0; i < stops.length - 1; i++) {
        const distance = this.haversine(stops[i], stops[i + 1]);
        totalDistance += distance;
      }

      // Round to 2 decimal places
      return Math.round(totalDistance * 100) / 100;
    } catch (error) {
      console.error('Calculate route distance error:', error);
      throw error;
    }
  }

  /**
   * Estimate delivery time based on distance and vehicle type
   * Uses average speeds for different vehicle types in urban environments
   *
   * @param {number} distance - Distance in kilometers
   * @param {string} vehicleType - Vehicle type (walking, bike, scooter, car)
   * @returns {number} Estimated time in minutes
   */
  static estimateDeliveryTime(distance, vehicleType) {
    try {
      // Validate distance
      if (typeof distance !== 'number' || distance < 0) {
        throw new Error('Distance must be a non-negative number');
      }

      // Speed estimates in km/h for urban delivery
      const speedMap = {
        walking: 5,
        bike: 15,
        scooter: 25,
        car: 30
      };

      // Default to bike speed if unknown vehicle type
      const speed = speedMap[vehicleType] || speedMap.bike;

      // Calculate time in hours, then convert to minutes
      const timeInHours = distance / speed;
      const timeInMinutes = timeInHours * 60;

      // Add buffer time per stop (assuming some base time per delivery)
      // This is a simple model; real-world would consider traffic, stop time, etc.

      // Round to nearest minute
      return Math.round(timeInMinutes);
    } catch (error) {
      console.error('Estimate delivery time error:', error);
      throw error;
    }
  }

  /**
   * Generate route instructions
   * Provides a simple turn-by-turn instruction list for the route
   *
   * @param {Array} stops - Array of stops in route order
   * @returns {Array} Array of instruction objects
   */
  static getRouteInstructions(stops) {
    try {
      if (!Array.isArray(stops)) {
        throw new Error('Stops must be an array');
      }

      if (stops.length === 0) {
        return [];
      }

      const instructions = [];

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const instruction = {
          step: i + 1,
          type: stop.type || 'delivery',
          address: stop.address || 'Unknown address',
          latitude: stop.latitude,
          longitude: stop.longitude,
          action: i === 0 ? 'Start at' : 'Proceed to'
        };

        // Add distance to next stop if not last
        if (i < stops.length - 1) {
          const distanceToNext = this.haversine(stop, stops[i + 1]);
          instruction.distanceToNext = Math.round(distanceToNext * 100) / 100;
        }

        instructions.push(instruction);
      }

      return instructions;
    } catch (error) {
      console.error('Get route instructions error:', error);
      throw error;
    }
  }

  /**
   * Get courier's active route from memory storage
   * Note: Routes are stored in memory for now, not in database
   *
   * @param {number} courierId - Courier ID
   * @returns {Object|null} Active route or null if none
   */
  static getCourierActiveRoute(courierId) {
    // For now, routes are stored in memory
    // In a production system, you might use Redis or database
    if (!this.activeRoutes) {
      this.activeRoutes = new Map();
    }

    return this.activeRoutes.get(courierId) || null;
  }

  /**
   * Set courier's active route
   *
   * @param {number} courierId - Courier ID
   * @param {Object} route - Route object
   * @returns {Object} Stored route
   */
  static setCourierActiveRoute(courierId, route) {
    if (!this.activeRoutes) {
      this.activeRoutes = new Map();
    }

    const routeData = {
      courierId,
      route: route.route,
      totalDistance: route.totalDistance,
      totalStops: route.totalStops,
      currentStopIndex: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      vehicleType: route.vehicleType
    };

    this.activeRoutes.set(courierId, routeData);

    return routeData;
  }

  /**
   * Clear courier's active route
   *
   * @param {number} courierId - Courier ID
   * @returns {boolean} True if route was cleared
   */
  static clearCourierActiveRoute(courierId) {
    if (!this.activeRoutes) {
      this.activeRoutes = new Map();
    }

    return this.activeRoutes.delete(courierId);
  }

  /**
   * Update courier's current stop index in active route
   *
   * @param {number} courierId - Courier ID
   * @param {number} stopIndex - New current stop index
   * @returns {Object} Updated route
   */
  static updateCourierRouteProgress(courierId, stopIndex) {
    const route = this.getCourierActiveRoute(courierId);

    if (!route) {
      throw new Error(`No active route found for courier ${courierId}`);
    }

    if (stopIndex < 0 || stopIndex >= route.route.length) {
      throw new Error('Invalid stop index');
    }

    route.currentStopIndex = stopIndex;

    // If reached last stop, mark as completed
    if (stopIndex === route.route.length - 1) {
      route.status = 'completed';
    }

    return route;
  }
}

module.exports = RouteService;
