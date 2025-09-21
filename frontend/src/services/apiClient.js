const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Centraliserad API-klient som automatiskt hanterar autentisering
 * Används av alla service-klasser för konsistent API-hantering
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
    
    // Hantera 401 Unauthorized - men redirecta inte automatiskt
    if (response.status === 401) {
      localStorage.removeItem("kundinfo");
      window.dispatchEvent(new Event("storage"));
      // Skapa ett fel-objekt med status för bättre felhantering
      const error = new Error(`Unauthorized: ${response.status}`);
      error.status = 401;
      throw error;
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
