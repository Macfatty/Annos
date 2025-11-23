import { apiRequest } from "../apiClient";

function normalizeUserPayload(payload, fallbackEmail) {
  if (!payload) {
    return null;
  }

  const candidate = payload.user || payload.data?.user || payload;

  if (!candidate) {
    return null;
  }

  return {
    namn: candidate.namn ?? "",
    email: candidate.email ?? fallbackEmail ?? "",
    telefon: candidate.telefon ?? "",
    adress: candidate.adress ?? "",
  };
}

function persistUser(user) {
  localStorage.setItem("kundinfo", JSON.stringify(user));
  window.dispatchEvent(new Event("storage"));
}

/**
 * Autentiseringsservice
 * Hanterar inloggning, utloggning, profilhantering och session
 */
export class AuthService {
  /**
   * Hämta användarprofil
   */
  static async fetchProfile() {
    try {
      const res = await apiRequest("/api/profile");
      if (!res.ok) {
        const err = new Error(`Profile ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const response = await res.json();

      // Unwrap backend response: { success: true, data: {...} } -> {...}
      if (response.success && response.data) {
        return response.data;
      }

      // Fallback for legacy format (direct user object)
      return response;
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

  /**
   * Uppdatera användarprofil
   */
  static async updateProfile(profilData) {
    try {
      const res = await apiRequest("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profilData),
      });

      if (!res.ok) {
        // Try to extract error message from backend
        let errorMessage = `Profile update ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parse errors
        }

        const err = new Error(errorMessage);
        err.status = res.status;
        throw err;
      }

      const response = await res.json();

      // Unwrap backend response: { success: true, message: "...", data: {...} } -> {...}
      if (response.success && response.data) {
        return response.data;
      }

      // Fallback for legacy format (direct user object)
      return response;
    } catch (error) {
      console.error("Fel vid profiluppdatering:", error);
      throw error;
    }
  }

  /**
   * Logga ut användare
   */
  static async logout() {
    try {
      const res = await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      
      if (!res.ok) {
        console.warn("Logout API misslyckades, men fortsätter med lokal utloggning");
      }
      
      // Rensa lokal data oavsett API-resultat
      localStorage.removeItem("kundinfo");
      localStorage.removeItem("varukorg");
      window.dispatchEvent(new Event("storage"));
      
      return true;
    } catch (error) {
      console.error("Fel vid utloggning:", error);
      
      // Rensa lokal data även om API-anropet misslyckas
      localStorage.removeItem("kundinfo");
      localStorage.removeItem("varukorg");
      window.dispatchEvent(new Event("storage"));
      
      throw error;
    }
  }

  /**
   * Logga in med email och lösenord
   */
  static async login(email, password) {
    try {
      const credentials = { email };

      if (typeof password === "string" && password.trim().length > 0) {
        credentials.password = password;
        credentials.losenord = password;
      }

      const res = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || payload.success === false) {
        throw new Error(payload.message || "Inloggning misslyckades");
      }

      const normalizedUser = normalizeUserPayload(payload?.data ?? payload, email);

      if (!normalizedUser) {
        throw new Error("Inloggning misslyckades");
      }

      persistUser(normalizedUser);

      return {
        success: payload.success ?? true,
        message: payload.message,
        user: normalizedUser,
        token: payload?.data?.token ?? payload.token,
      };
    } catch (error) {
      console.error("Fel vid inloggning:", error);
      throw error;
    }
  }

  /**
   * Registrera ny användare
   */
  static async register(userData) {
    try {
      const res = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Registrering misslyckades");
      }
      
      const data = await res.json();
      
      // Spara användarinfo
      localStorage.setItem(
        "kundinfo",
        JSON.stringify({
          namn: data.namn,
          email: data.email,
          telefon: data.telefon,
          adress: data.adress || "",
        })
      );
      
      // Cross-tab sync
      window.dispatchEvent(new Event("storage"));
      
      return data;
    } catch (error) {
      console.error("Fel vid registrering:", error);
      throw error;
    }
  }

  /**
   * Logga in med Google
   */
  static async loginWithGoogle(token) {
    try {
      const res = await apiRequest("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      
      if (!res.ok) {
        throw new Error("Google-inloggning misslyckades");
      }
      
      const data = await res.json();
      
      // Spara användarinfo
      localStorage.setItem(
        "kundinfo",
        JSON.stringify({
          namn: data.namn,
          email: data.email,
          telefon: data.telefon,
          adress: data.adress || "",
        })
      );
      
      // Cross-tab sync
      window.dispatchEvent(new Event("storage"));
      
      return data;
    } catch (error) {
      console.error("Fel vid Google-inloggning:", error);
      throw error;
    }
  }

  /**
   * Logga in med Apple
   */
  static async loginWithApple(token) {
    try {
      const res = await apiRequest("/api/auth/apple", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      
      if (!res.ok) {
        throw new Error("Apple-inloggning misslyckades");
      }
      
      const data = await res.json();
      
      // Spara användarinfo
      localStorage.setItem(
        "kundinfo",
        JSON.stringify({
          namn: data.namn,
          email: data.email,
          telefon: data.telefon,
          adress: data.adress || "",
        })
      );
      
      // Cross-tab sync
      window.dispatchEvent(new Event("storage"));
      
      return data;
    } catch (error) {
      console.error("Fel vid Apple-inloggning:", error);
      throw error;
    }
  }
}

// Export för bakåtkompatibilitet
export const fetchProfile = AuthService.fetchProfile;
export const updateProfile = AuthService.updateProfile;
export const logout = AuthService.logout;
export const login = AuthService.login;
export const register = AuthService.register;
export const loginWithGoogle = AuthService.loginWithGoogle;
export const loginWithApple = AuthService.loginWithApple;
