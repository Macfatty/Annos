const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Centraliserad API-klient som automatiskt hanterar autentisering
async function apiRequest(endpoint, options = {}) {
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
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Hantera timeout
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timeout");
      timeoutError.status = 408;
      throw timeoutError;
    }
    
    // Hantera nätverksfel och andra fel
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const networkError = new Error("NetworkError when attempting to fetch resource");
      networkError.status = 0; // Nätverksfel
      throw networkError;
    }
    throw error;
  }
}

// Kontrollera om backend är tillgänglig med retry
export async function checkBackendHealth(retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/api/test`, {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.timeout(5000) // 5 sekunder timeout för health check
      });
      return response.ok;
    } catch (error) {
      if (attempt === retries) {
        return false; // Sista försöket misslyckades
      }
      // Vänta lite innan nästa försök
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// Hämtar profil. Kastar Error med status-egenskap när svaret inte är OK.
export async function fetchProfile() {
  try {
    const res = await apiRequest("/api/profile");
    if (!res.ok) {
      const err = new Error(`Profile ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  } catch (error) {
    // Om det är ett nätverksfel eller 401, låt det bubbla upp
    if (error.status === 401 || error.status === 0) {
      throw error;
    }
    
    // För andra fel, logga och kasta vidare
    console.error("Fel vid profilhämtning:", error);
    throw error;
  }
}

export async function createOrder(payload) {
  const res = await apiRequest("/api/order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = new Error(`Order ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Admin API-funktioner
export async function fetchAdminOrders(slug = null) {
  const endpoint = slug ? `/api/admin/orders/today?slug=${slug}` : "/api/admin/orders/today";
  const res = await apiRequest(endpoint);
  if (!res.ok) {
    const err = new Error(`Admin orders ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function markOrderAsDone(orderId) {
  const res = await apiRequest(`/api/admin/orders/${orderId}/klart`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = new Error(`Mark order done ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Auth API-funktioner
export async function logout() {
  const res = await apiRequest("/api/auth/logout", {
    method: "POST",
  });
  if (!res.ok) {
    const err = new Error(`Logout ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Profile API-funktioner
export async function updateProfile(profileData) {
  const res = await apiRequest("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    const err = new Error(`Update profile ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}