import { useState, useEffect, useCallback } from "react";
import { fetchProfile, logout } from "../services/api";

/**
 * Custom hook för autentiseringshantering
 * Hanterar inloggning, utloggning, profilhämtning och rollhantering
 */
export function useAuth() {
  const [inloggad, setInloggad] = useState(false);
  const [role, setRole] = useState("");
  const [profil, setProfil] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  // Kontrollera om användaren är admin
  const isAdmin = role === "admin";
  const isCourier = role === "courier";
  const isRestaurant = role === "restaurant";
  const isCustomer = role === "customer" || (!isAdmin && !isCourier && !isRestaurant);

  /**
   * Ladda användarprofil och kontrollera autentisering
   */
  const loadProfile = useCallback(async () => {
    setAuthLoading(true);
    
    try {
      // Kontrollera först om vi har någon indikation på att användaren är inloggad
      const hasStoredAuth = localStorage.getItem("kundinfo");
      
      // Om ingen lagrad autentisering finns, hoppa över profilhämtning
      if (!hasStoredAuth) {
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(false);
        return;
      }

      // Kontrollera om backend är tillgänglig innan vi försöker hämta profil
      const { checkBackendHealth } = await import("../services/api");
      const backendAvailable = await checkBackendHealth();
      if (!backendAvailable) {
        console.warn("Backend inte tillgänglig - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(true);
        return;
      }
      
      setBackendError(false); // Backend är tillgänglig

      const data = await fetchProfile();
      setInloggad(true);
      setRole(data.role || "");
      setProfil(data);
    } catch (err) {
      if (err?.status === 401) {
        // Session har förfallit - rensa lokal data
        localStorage.removeItem("kundinfo");
        localStorage.removeItem("varukorg");
        setInloggad(false);
        setRole("");
        setProfil(null);
        console.log("Session förfallen - användaren är utloggad");
      } else if (err?.status === 404) {
        // Profil hittades inte - troligen gammalt JWT med fel fältnamn
        // Rensa lokal data och låt användaren logga in igen
        console.log("Profil hittades inte (404) - rensar gammal session och behandlar som utloggad");
        localStorage.removeItem("kundinfo");
        localStorage.removeItem("varukorg");
        // Clear old JWT cookie
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(false); // Viktigt! Backend fungerar, det är bara JWT som är gammalt
      } else if (err?.status === 0) {
        // Nätverksfel - backend är inte tillgänglig
        console.warn("Nätverksfel vid profilhämtning - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(true);
      } else if (err?.status === 408) {
        // Timeout - backend svarar för långsamt
        console.warn("Timeout vid profilhämtning - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(true);
      } else {
        // Andra fel
        console.error("Fel vid profilhämtning:", err);
        setInloggad(false);
        setRole("");
        setProfil(null);
        setBackendError(true);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Logga ut användaren
   */
  const loggaUt = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Logga ut lokalt även om API-anropet misslyckas
      localStorage.clear();
      setInloggad(false);
      setRole("");
      setProfil(null);
      setBackendError(false);
      window.dispatchEvent(new Event("storage"));
    }
  }, []);

  /**
   * Uppdatera profil
   */
  const updateProfil = useCallback(async (profilData) => {
    try {
      const { updateProfile } = await import("../services/api");
      const updatedProfil = await updateProfile(profilData);
      setProfil(updatedProfil);
      return updatedProfil;
    } catch (err) {
      console.error("Fel vid uppdatering av profil:", err);
      throw err;
    }
  }, []);

  // Ladda profil vid mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Lyssna på storage events för cross-tab sync
  useEffect(() => {
    const observer = () => {
      loadProfile();
    };
    window.addEventListener("storage", observer);
    return () => {
      window.removeEventListener("storage", observer);
    };
  }, [loadProfile]);

  return {
    // State
    inloggad,
    role,
    profil,
    authLoading,
    backendError,
    
    // Computed properties
    isAdmin,
    isCourier,
    isRestaurant,
    isCustomer,
    
    // Actions
    loadProfile,
    loggaUt,
    updateProfil,
  };
}
