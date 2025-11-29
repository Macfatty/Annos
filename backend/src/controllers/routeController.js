/**
 * Route Controller
 *
 * Handles HTTP requests for route optimization and management
 * Follows PHASE 3 patterns for consistency
 */

const RouteService = require('../services/routeService');
const CourierService = require('../services/courierService');
const AuditService = require('../services/auditService');

/**
 * Optimize a route given multiple addresses/stops
 * POST /api/routes/optimize
 * Admin only
 */
async function optimizeRoute(req, res) {
  try {
    const { stops, start, vehicleType } = req.body;

    // Validate required fields
    if (!stops || !Array.isArray(stops)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'stops array is required'
      });
    }

    if (stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'stops array cannot be empty'
      });
    }

    // Validate stop structure
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: `Stop ${i + 1} must have latitude and longitude as numbers`
        });
      }
    }

    // Calculate optimal route
    const optimizedRoute = RouteService.calculateOptimalRoute(stops, start);

    // Calculate estimated delivery time if vehicle type provided
    let estimatedTime = null;
    if (vehicleType) {
      estimatedTime = RouteService.estimateDeliveryTime(
        optimizedRoute.totalDistance,
        vehicleType
      );
    }

    // Generate route instructions
    const instructions = RouteService.getRouteInstructions(optimizedRoute.route);

    res.json({
      success: true,
      data: {
        ...optimizedRoute,
        estimatedTime,
        vehicleType: vehicleType || null,
        instructions
      },
      message: 'Route optimized successfully'
    });
  } catch (error) {
    console.error('Error optimizing route:', error);

    if (error.message.includes('Latitude') || error.message.includes('Longitude')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to optimize route',
      message: error.message
    });
  }
}

/**
 * Get courier's optimized route
 * GET /api/couriers/:id/route
 * Courier can view their own route
 */
async function getCourierRoute(req, res) {
  try {
    const { id } = req.params;

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only view their own route, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own route'
      });
    }

    // Get active route
    const route = await CourierService.getCourierActiveRoute(parseInt(id));

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'No active route',
        message: 'No active route found for this courier'
      });
    }

    // Generate instructions for current route
    const instructions = RouteService.getRouteInstructions(route.route);

    // Calculate estimated time for remaining stops
    let remainingDistance = 0;
    if (route.currentStopIndex < route.route.length - 1) {
      const remainingStops = route.route.slice(route.currentStopIndex);
      remainingDistance = RouteService.calculateRouteDistance(remainingStops);
    }

    const estimatedTimeRemaining = RouteService.estimateDeliveryTime(
      remainingDistance,
      route.vehicleType || 'bike'
    );

    res.json({
      success: true,
      data: {
        ...route,
        instructions,
        remainingDistance,
        estimatedTimeRemaining
      }
    });
  } catch (error) {
    console.error(`Error fetching courier route ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier route',
      message: error.message
    });
  }
}

/**
 * Assign optimized route to courier
 * POST /api/couriers/:id/route
 * Admin only
 */
async function assignRouteTocourier(req, res) {
  try {
    const { id } = req.params;
    const { stops, start, optimize } = req.body;
    const assignedBy = req.user?.id;

    // Validate required fields
    if (!stops || !Array.isArray(stops)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'stops array is required'
      });
    }

    if (stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'stops array cannot be empty'
      });
    }

    // Get courier info
    const courier = await CourierService.getCourierById(parseInt(id));

    if (!courier.is_available) {
      return res.status(400).json({
        success: false,
        error: 'Courier unavailable',
        message: 'Courier is not available for route assignment'
      });
    }

    // Determine start point
    let startPoint = start;

    // If no start point provided, try to use courier's current GPS location
    if (!startPoint && courier.gps_enabled && courier.current_latitude && courier.current_longitude) {
      startPoint = {
        latitude: courier.current_latitude,
        longitude: courier.current_longitude,
        address: 'Current location'
      };
    }

    // Calculate optimal route (default to optimizing unless explicitly false)
    const shouldOptimize = optimize !== false;
    let routeData;

    if (shouldOptimize) {
      routeData = RouteService.calculateOptimalRoute(stops, startPoint);
    } else {
      // Use stops in given order
      routeData = {
        route: stops,
        totalDistance: RouteService.calculateRouteDistance(stops),
        totalStops: stops.length
      };
    }

    // Add vehicle type to route data
    routeData.vehicleType = courier.vehicle_type;

    // Calculate estimated time
    const estimatedTime = RouteService.estimateDeliveryTime(
      routeData.totalDistance,
      courier.vehicle_type
    );

    // Store route in memory
    const storedRoute = RouteService.setCourierActiveRoute(parseInt(id), routeData);

    // Generate instructions
    const instructions = RouteService.getRouteInstructions(routeData.route);

    // Audit log
    try {
      if (assignedBy) {
        await AuditService.log({
          userId: assignedBy,
          action: 'courier:assign_route',
          resourceType: 'courier',
          resourceId: parseInt(id),
          details: {
            total_stops: routeData.totalStops,
            total_distance: routeData.totalDistance,
            optimized: shouldOptimize,
            vehicle_type: courier.vehicle_type
          }
        });
      }
    } catch (auditError) {
      console.error('Audit logging failed (non-critical):', auditError);
    }

    res.status(201).json({
      success: true,
      data: {
        ...storedRoute,
        estimatedTime,
        instructions
      },
      message: 'Route assigned successfully'
    });
  } catch (error) {
    console.error(`Error assigning route to courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    if (error.message.includes('Latitude') || error.message.includes('Longitude')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to assign route',
      message: error.message
    });
  }
}

/**
 * Update courier's route progress
 * PATCH /api/couriers/:id/route/progress
 * Courier can update their own progress
 */
async function updateRouteProgress(req, res) {
  try {
    const { id } = req.params;
    const { currentStopIndex } = req.body;

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only update their own progress, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own route progress'
      });
    }

    // Validate required fields
    if (typeof currentStopIndex !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'currentStopIndex must be a number'
      });
    }

    // Update progress
    const updatedRoute = RouteService.updateCourierRouteProgress(
      parseInt(id),
      currentStopIndex
    );

    res.json({
      success: true,
      data: updatedRoute,
      message: 'Route progress updated successfully'
    });
  } catch (error) {
    console.error(`Error updating route progress for courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Route not found',
        message: error.message
      });
    }

    if (error.message.includes('Invalid stop index')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update route progress',
      message: error.message
    });
  }
}

/**
 * Clear courier's active route
 * DELETE /api/couriers/:id/route
 * Admin only
 */
async function clearCourierRoute(req, res) {
  try {
    const { id } = req.params;

    // Verify courier exists
    const courier = await CourierService.getCourierById(parseInt(id));

    // Clear route
    const cleared = RouteService.clearCourierActiveRoute(parseInt(id));

    if (!cleared) {
      return res.status(404).json({
        success: false,
        error: 'No active route',
        message: 'No active route found for this courier'
      });
    }

    // Audit log
    try {
      if (req.user?.id) {
        await AuditService.log({
          userId: req.user.id,
          action: 'courier:clear_route',
          resourceType: 'courier',
          resourceId: parseInt(id),
          details: {
            cleared_at: new Date().toISOString()
          }
        });
      }
    } catch (auditError) {
      console.error('Audit logging failed (non-critical):', auditError);
    }

    res.json({
      success: true,
      message: 'Route cleared successfully'
    });
  } catch (error) {
    console.error(`Error clearing route for courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to clear route',
      message: error.message
    });
  }
}

module.exports = {
  optimizeRoute,
  getCourierRoute,
  assignRouteTocourier,
  updateRouteProgress,
  clearCourierRoute
};
