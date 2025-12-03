/**
 * Axios API Client with Automatic Token Refresh
 *
 * This client handles:
 * - Cookie-based authentication
 * - Automatic token refresh on 401 errors
 * - Request/response interceptors
 * - Centralized error handling
 */

import axios from "axios";
import { useAuthStore } from "../../stores/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true, // CRITICAL: Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Queue failed requests to retry after token refresh
 */
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

/**
 * Execute all queued requests after token refresh
 */
function onTokenRefreshed() {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken() {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data.success === true;
  } catch (error) {
    console.error("[apiClient] Token refresh failed:", error);
    return false;
  }
}

/**
 * REQUEST INTERCEPTOR
 * Runs before every request is sent
 */
apiClient.interceptors.request.use(
  (config) => {
    // Request logging in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles automatic token refresh on 401 errors
 */
apiClient.interceptors.response.use(
  (response) => {
    // Successful response - return data directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors (except auth endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      // Try to refresh token
      isRefreshing = true;
      const refreshSuccess = await refreshAccessToken();
      isRefreshing = false;

      if (refreshSuccess) {
        // Notify all queued requests
        onTokenRefreshed();

        // Retry original request
        return apiClient(originalRequest);
      } else {
        // Refresh failed - logout user
        console.warn("[apiClient] Token refresh failed, logging out");
        const { logout } = useAuthStore.getState();
        logout();

        // Redirect to login if in browser
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    }

    // Handle other errors
    if (import.meta.env.DEV) {
      console.error("[API Error]", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
