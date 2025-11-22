// Re-export från nya service-struktur för bakåtkompatibilitet
export {
  apiRequest,
  checkBackendHealth,
  handleApiResponse,
  createQueryString
} from "./apiClient";

export {
  fetchProfile,
  updateProfile,
  logout,
  login,
  register,
  loginWithGoogle,
  loginWithApple
} from "./auth/authService";

export {
  createOrder,
  fetchUserOrders,
  fetchMyOrders,
  fetchAdminOrders,
  fetchTodaysOrders,
  fetchRestaurantOrders,
  fetchCourierOrders,
  markOrderAsDone,
  markOrderAsReady,
  acceptOrder,
  markOrderAsDelivered,
  updateOrderStatus,
  updateAdminOrderStatus,
  fetchOrderDetails
} from "./orders/orderService";

export {
  fetchMenu,
  fetchRestaurants,
  fetchRestaurantDetails
} from "./menu/menuService";

