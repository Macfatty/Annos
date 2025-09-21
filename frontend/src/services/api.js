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
  fetchAdminOrders, 
  fetchRestaurantOrders, 
  fetchCourierOrders, 
  markOrderAsDone, 
  acceptOrder, 
  markOrderAsDelivered, 
  updateOrderStatus, 
  fetchOrderDetails 
} from "./orders/orderService";

export { 
  fetchMenu, 
  fetchAccessories, 
  fetchRestaurants, 
  fetchRestaurantInfo, 
  searchMenu, 
  fetchCategories, 
  fetchMenuByCategory 
} from "./menu/menuService";

export { 
  createPayment, 
  confirmPayment, 
  cancelPayment, 
  getPaymentStatus, 
  fetchUserPayments, 
  fetchPaymentMethods, 
  validatePayment, 
  fetchInvoice, 
  downloadInvoicePDF 
} from "./payments/paymentService";