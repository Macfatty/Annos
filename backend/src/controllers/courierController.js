/**
 * Courier Controller
 *
 * Handles HTTP requests for courier management
 * Follows PHASE 1/2 patterns for consistency
 */

const CourierService = require('../services/courierService');
const AuditService = require('../services/auditService');

/**
 * Get all couriers
 * Admin can see all couriers including unavailable
 */
async function getAllCouriers(req, res) {
  try {
    const includeUnavailable = req.user?.role === 'admin' && req.query.includeUnavailable === 'true';

    const couriers = await CourierService.getAllCouriers(includeUnavailable);

    res.json({
      success: true,
      data: couriers,
      count: couriers.length
    });
  } catch (error) {
    console.error('Error fetching couriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch couriers',
      message: error.message
    });
  }
}

/**
 * Get courier by ID
 * Admin only
 */
async function getCourierById(req, res) {
  try {
    const { id } = req.params;

    const courier = await CourierService.getCourierById(parseInt(id));

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    console.error(`Error fetching courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier',
      message: error.message
    });
  }
}

/**
 * Get courier by user ID
 * Courier can view their own profile
 */
async function getCourierByUserId(req, res) {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Security: Courier can only view their own profile, unless admin
    if (req.user?.role !== 'admin' && parseInt(userId) !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own courier profile'
      });
    }

    const courier = await CourierService.getCourierByUserId(parseInt(userId));

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    console.error(`Error fetching courier for user ${req.params.userId}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier profile not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier profile',
      message: error.message
    });
  }
}

/**
 * Create new courier profile
 * Admin only
 */
async function createCourierProfile(req, res) {
  try {
    const courierData = req.body;
    const createdBy = req.user?.id;

    // Validate required fields
    if (!courierData.userId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'userId is required'
      });
    }

    const courier = await CourierService.createCourierProfile(courierData, createdBy);

    res.status(201).json({
      success: true,
      data: courier,
      message: 'Courier profile created successfully'
    });
  } catch (error) {
    console.error('Error creating courier profile:', error);

    if (error.message.includes('already exists') || error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Courier profile already exists for this user'
      });
    }

    if (error.message.includes('not found') || error.code === '23503') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create courier profile',
      message: error.message
    });
  }
}

/**
 * Update courier profile
 * Admin only
 */
async function updateCourierProfile(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user?.id;

    const courier = await CourierService.updateCourierProfile(parseInt(id), updateData, updatedBy);

    res.json({
      success: true,
      data: courier,
      message: 'Courier profile updated successfully'
    });
  } catch (error) {
    console.error(`Error updating courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    if (error.message.includes('No valid fields')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update courier profile',
      message: error.message
    });
  }
}

/**
 * Toggle courier availability
 * Admin only
 */
async function toggleAvailability(req, res) {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    const updatedBy = req.user?.id;

    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'isAvailable field is required'
      });
    }

    const courier = await CourierService.toggleAvailability(parseInt(id), isAvailable, updatedBy);

    res.json({
      success: true,
      data: courier,
      message: `Courier availability set to ${isAvailable ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error(`Error toggling courier availability ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to toggle availability',
      message: error.message
    });
  }
}

/**
 * Get courier contracts
 * Courier can view their own contracts
 */
async function getCourierContracts(req, res) {
  try {
    const { id } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only view their own contracts, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own contracts'
      });
    }

    const contracts = await CourierService.getCourierContracts(parseInt(id), includeInactive);

    res.json({
      success: true,
      data: contracts,
      count: contracts.length
    });
  } catch (error) {
    console.error(`Error fetching courier contracts ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier contracts',
      message: error.message
    });
  }
}

/**
 * Create courier contract
 * Admin only
 */
async function createCourierContract(req, res) {
  try {
    const { id } = req.params;
    const contractData = {
      ...req.body,
      courierId: parseInt(id)
    };
    const createdBy = req.user?.id;

    // Validate required fields
    if (!contractData.startDate) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'startDate is required'
      });
    }

    const contract = await CourierService.createCourierContract(contractData, createdBy);

    res.status(201).json({
      success: true,
      data: contract,
      message: 'Contract created successfully'
    });
  } catch (error) {
    console.error(`Error creating contract for courier ${req.params.id}:`, error);

    if (error.message.includes('not found') || error.code === '23503') {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: 'Courier not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create contract',
      message: error.message
    });
  }
}

/**
 * Deactivate contract
 * Admin only
 */
async function deactivateContract(req, res) {
  try {
    const { contractId } = req.params;
    const deactivatedBy = req.user?.id;

    const contract = await CourierService.deactivateContract(parseInt(contractId), deactivatedBy);

    res.json({
      success: true,
      data: contract,
      message: 'Contract deactivated successfully'
    });
  } catch (error) {
    console.error(`Error deactivating contract ${req.params.contractId}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to deactivate contract',
      message: error.message
    });
  }
}

/**
 * Get available couriers
 * Public endpoint
 */
async function getAvailableCouriers(req, res) {
  try {
    const { vehicleType } = req.query;

    const couriers = await CourierService.getAvailableCouriers(vehicleType);

    res.json({
      success: true,
      data: couriers,
      count: couriers.length
    });
  } catch (error) {
    console.error('Error fetching available couriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available couriers',
      message: error.message
    });
  }
}

/**
 * Get courier statistics
 * Courier can view their own stats
 */
async function getCourierStats(req, res) {
  try {
    const { id } = req.params;

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only view their own stats, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own statistics'
      });
    }

    const stats = await CourierService.getCourierStats(parseInt(id));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(`Error fetching courier stats ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier statistics',
      message: error.message
    });
  }
}

/**
 * Get global statistics
 * Admin only
 */
async function getGlobalStats(req, res) {
  try {
    const stats = await CourierService.getGlobalStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching global courier stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global statistics',
      message: error.message
    });
  }
}

/**
 * Update courier GPS location
 * Courier can update their own location
 */
async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    const updatedBy = req.user?.id;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'latitude and longitude are required'
      });
    }

    // Validate data types
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'latitude and longitude must be numbers'
      });
    }

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only update their own location, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own location'
      });
    }

    const updatedCourier = await CourierService.updateCourierLocation(
      parseInt(id),
      latitude,
      longitude,
      updatedBy
    );

    res.json({
      success: true,
      data: updatedCourier,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error(`Error updating courier location ${req.params.id}:`, error);

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
      error: 'Failed to update location',
      message: error.message
    });
  }
}

/**
 * Get nearby couriers
 * Public endpoint
 */
async function getNearby(req, res) {
  try {
    const { latitude, longitude, radius, vehicleType } = req.query;

    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'latitude and longitude query parameters are required'
      });
    }

    // Parse and validate numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = radius ? parseFloat(radius) : 5;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'latitude and longitude must be valid numbers'
      });
    }

    if (isNaN(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'radius must be a positive number'
      });
    }

    const couriers = await CourierService.getCouriersNearby(
      lat,
      lng,
      radiusKm,
      vehicleType || null
    );

    res.json({
      success: true,
      data: couriers,
      count: couriers.length,
      search_params: {
        latitude: lat,
        longitude: lng,
        radius_km: radiusKm,
        vehicle_type: vehicleType || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching nearby couriers:', error);

    if (error.message.includes('Latitude') || error.message.includes('Longitude') || error.message.includes('Radius')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby couriers',
      message: error.message
    });
  }
}

/**
 * Get courier's current location
 * Courier can view their own location
 */
async function getCurrentLocation(req, res) {
  try {
    const { id } = req.params;

    // Get courier to check ownership
    const courier = await CourierService.getCourierById(parseInt(id));

    // Security: Courier can only view their own location, unless admin
    if (req.user?.role !== 'admin' && courier.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own location'
      });
    }

    const location = await CourierService.getCourierCurrentLocation(parseInt(id));

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error(`Error fetching courier location ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    if (error.message.includes('not enabled') || error.message.includes('not available')) {
      return res.status(400).json({
        success: false,
        error: 'Location unavailable',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch location',
      message: error.message
    });
  }
}

/**
 * Toggle GPS tracking
 * Admin only
 */
async function toggleGPS(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const updatedBy = req.user?.id;

    // Validate required fields
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'enabled field is required'
      });
    }

    // Validate boolean type
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'enabled must be a boolean value'
      });
    }

    const courier = await CourierService.toggleGPS(parseInt(id), enabled, updatedBy);

    res.json({
      success: true,
      data: courier,
      message: `GPS tracking ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error(`Error toggling GPS for courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to toggle GPS',
      message: error.message
    });
  }
}

module.exports = {
  getAllCouriers,
  getCourierById,
  getCourierByUserId,
  createCourierProfile,
  updateCourierProfile,
  toggleAvailability,
  getCourierContracts,
  createCourierContract,
  deactivateContract,
  getAvailableCouriers,
  getCourierStats,
  getGlobalStats,
  updateLocation,
  getNearby,
  getCurrentLocation,
  toggleGPS
};
