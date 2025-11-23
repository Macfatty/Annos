const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Queue requests that failed due to 401 while refreshing token
 */
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all queued requests when token is refreshed
 */
function onTokenRefreshed() {
  refreshSubscribers.forEach(callback => callback());
  refreshSubscribers = [];
}

/**
 * Attempt to refresh the access token using refresh token
 * @returns {Promise<boolean>} True if refresh successful, false otherwise
 */
async function refreshAccessToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include", // Send cookies with refresh token
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("[apiClient] Token refresh failed:", response.status);
      return false;
    }

    const data = await response.json();
    console.log("[apiClient] Token refreshed successfully");
    return data.success === true;
  } catch (error) {
    console.error("[apiClient] Token refresh error:", error);
    return false;
  }
}

/**
 * Centraliserad API-klient med automatisk token refresh
 * Används av alla service-klasser för konsistent API-hantering
 *
 * AUTOMATIC TOKEN REFRESH FLOW:
 * 1. Request fails with 401
 * 2. Try to refresh token using refresh token
 * 3. Retry original request with new token
 * 4. If refresh fails, logout user
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    credentials: "include", // Alltid skicka med cookies för autentisering
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // Lägg till timeout för att undvika hängande anrop
  const timeoutMs = options.timeout || 10000; // 10 sekunder default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // AUTOMATIC TOKEN REFRESH on 401 (except for auth endpoints)
    if (response.status === 401 && !endpoint.includes("/auth/refresh") && !endpoint.includes("/auth/login")) {
      console.log("[apiClient] 401 detected, attempting token refresh...");

      // If already refreshing, wait for it to complete
      if (isRefreshing) {
        console.log("[apiClient] Token refresh already in progress, queueing request...");
        return new Promise((resolve) => {
          subscribeTokenRefresh(async () => {
            // Retry original request after token is refreshed
            const retryResponse = await fetch(url, {
              ...defaultOptions,
              ...options,
            });
            resolve(retryResponse);
          });
        });
      }

      // Try to refresh token
      isRefreshing = true;
      const refreshSuccess = await refreshAccessToken();
      isRefreshing = false;

      if (refreshSuccess) {
        // Notify queued requests
        onTokenRefreshed();

        // Retry original request with new token
        console.log("[apiClient] Retrying original request with new token...");
        const retryResponse = await fetch(url, {
          ...defaultOptions,
          ...options,
        });
        return retryResponse;
      } else {
        // Refresh failed - logout user
        console.warn("[apiClient] Token refresh failed, logging out user");
        localStorage.removeItem("kundinfo");
        window.dispatchEvent(new Event("storage"));
        const error = new Error(`Unauthorized: ${response.status}`);
        error.status = 401;
        throw error;
      }
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);

    // Hantera timeout
    if (err.name === "AbortError") {
      const timeoutError = new Error("Request timeout");
      timeoutError.status = 408;
      throw timeoutError;
    }

    // Hantera nätverksfel och andra fel
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      const networkError = new Error("NetworkError when attempting to fetch resource");
      networkError.status = 0; // Nätverksfel
      throw networkError;
    }
    throw err;
  }
}

/**
 * Kontrollera om backend är tillgänglig med retry
 */
export async function checkBackendHealth(retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/api/test`, {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.timeout(5000) // 5 sekunder timeout för health check
      });
      return response.ok;
    } catch (err) {
      console.warn(`Backend health check attempt ${attempt + 1} failed:`, err.message);
      if (attempt === retries) {
        return false; // Sista försöket misslyckades
      }
      // Vänta lite innan nästa försök
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

/**
 * Hjälpfunktion för att hantera API-svar
 */
export async function handleApiResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `API Error: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  
  return response.json();
}

/**
 * Hjälpfunktion för att skapa query parameters
 */
export function createQueryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
}
