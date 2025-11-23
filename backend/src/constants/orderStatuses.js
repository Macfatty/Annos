/**
 * Order Status Constants
 *
 * SINGLE SOURCE OF TRUTH for all order statuses in the system.
 *
 * ⚠️ CRITICAL: DO NOT MODIFY without understanding the impact!
 *
 * This file defines the canonical status values and valid transitions
 * used throughout the entire application:
 * - Frontend: RestaurangVy.jsx, KurirVy.jsx, MinaBeställningar.jsx
 * - Backend: OrderService, OrderController, Routes
 * - Middleware: authMiddleware.js status validation
 * - Database: orders.status column
 *
 * BEFORE MODIFYING:
 * 1. Check all usages across frontend and backend
 * 2. Plan database migration for existing orders
 * 3. Update all consuming code simultaneously
 * 4. Test thoroughly in staging environment
 *
 * @see .claude/ORDER_FLOW_TODO_LIST.md for implementation details
 * @see .claude/ORDER_FLOW_INVESTIGATION_REPORT.md for background
 */

/**
 * Order Status Enum
 *
 * These are the ONLY valid status values for orders.
 * Any other status value should be rejected by validation.
 */
const ORDER_STATUS = {
  /**
   * RECEIVED - Order has been placed by customer
   * Initial status when order is created
   * Next: ACCEPTED or CANCELLED
   */
  RECEIVED: 'received',

  /**
   * ACCEPTED - Restaurant has accepted the order
   * Restaurant commits to preparing this order
   * Next: IN_PROGRESS
   */
  ACCEPTED: 'accepted',

  /**
   * IN_PROGRESS - Restaurant is preparing the order
   * Food is being cooked/assembled
   * Next: READY_FOR_PICKUP
   */
  IN_PROGRESS: 'in_progress',

  /**
   * READY_FOR_PICKUP - Order is ready for courier pickup
   * Restaurant has finished preparing, waiting for courier
   * Next: ASSIGNED
   */
  READY_FOR_PICKUP: 'ready_for_pickup',

  /**
   * ASSIGNED - Courier has accepted the order
   * Courier is on their way to pick up
   * Next: OUT_FOR_DELIVERY
   */
  ASSIGNED: 'assigned',

  /**
   * OUT_FOR_DELIVERY - Courier has picked up and is delivering
   * Order is in transit to customer
   * Next: DELIVERED
   */
  OUT_FOR_DELIVERY: 'out_for_delivery',

  /**
   * DELIVERED - Order has been delivered to customer
   * Final successful status
   * Next: None (terminal state)
   */
  DELIVERED: 'delivered',

  /**
   * CANCELLED - Order has been cancelled
   * Can be cancelled at any stage before delivery
   * Next: None (terminal state)
   */
  CANCELLED: 'cancelled'
};

/**
 * Valid Status Transitions
 *
 * Defines which status changes are allowed.
 * This enforces a valid order workflow and prevents
 * invalid state transitions (e.g. RECEIVED -> DELIVERED).
 *
 * Format: { currentStatus: [allowedNextStatuses] }
 */
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.RECEIVED]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.CANCELLED
  ],

  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.CANCELLED
  ],

  [ORDER_STATUS.IN_PROGRESS]: [
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.CANCELLED
  ],

  [ORDER_STATUS.READY_FOR_PICKUP]: [
    ORDER_STATUS.ASSIGNED,
    ORDER_STATUS.CANCELLED
  ],

  [ORDER_STATUS.ASSIGNED]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.CANCELLED
  ],

  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED
  ],

  // Terminal states
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

/**
 * Status Display Names (Swedish)
 *
 * Human-readable names for displaying in UI
 */
const STATUS_DISPLAY_NAMES = {
  [ORDER_STATUS.RECEIVED]: 'Mottagen',
  [ORDER_STATUS.ACCEPTED]: 'Accepterad',
  [ORDER_STATUS.IN_PROGRESS]: 'Tillagas',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Klar för hämtning',
  [ORDER_STATUS.ASSIGNED]: 'Tilldelad kurir',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Ute för leverans',
  [ORDER_STATUS.DELIVERED]: 'Levererad',
  [ORDER_STATUS.CANCELLED]: 'Avbruten'
};

/**
 * Status Colors (for UI)
 *
 * Consistent color coding across the application
 */
const STATUS_COLORS = {
  [ORDER_STATUS.RECEIVED]: '#FF6B6B',        // Red - New/Urgent
  [ORDER_STATUS.ACCEPTED]: '#4ECDC4',        // Cyan - Acknowledged
  [ORDER_STATUS.IN_PROGRESS]: '#45B7D1',     // Blue - Active work
  [ORDER_STATUS.READY_FOR_PICKUP]: '#F9CA24', // Yellow - Ready/Waiting
  [ORDER_STATUS.ASSIGNED]: '#A29BFE',        // Purple - Assigned
  [ORDER_STATUS.OUT_FOR_DELIVERY]: '#FD79A8', // Pink - In transit
  [ORDER_STATUS.DELIVERED]: '#00B894',       // Green - Success
  [ORDER_STATUS.CANCELLED]: '#636E72'        // Gray - Cancelled
};

/**
 * Helper function to check if a status transition is valid
 *
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} - True if transition is allowed
 */
function isValidTransition(currentStatus, newStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return false;
  }
  return allowedTransitions.includes(newStatus);
}

/**
 * Helper function to get allowed next statuses
 *
 * @param {string} currentStatus - Current order status
 * @returns {string[]} - Array of allowed next statuses
 */
function getAllowedNextStatuses(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Helper function to check if a status value is valid
 *
 * @param {string} status - Status value to check
 * @returns {boolean} - True if status is in ORDER_STATUS enum
 */
function isValidStatus(status) {
  return Object.values(ORDER_STATUS).includes(status);
}

/**
 * Helper function to get all valid statuses
 *
 * @returns {string[]} - Array of all valid status values
 */
function getAllStatuses() {
  return Object.values(ORDER_STATUS);
}

module.exports = {
  ORDER_STATUS,
  STATUS_TRANSITIONS,
  STATUS_DISPLAY_NAMES,
  STATUS_COLORS,
  isValidTransition,
  getAllowedNextStatuses,
  isValidStatus,
  getAllStatuses
};
