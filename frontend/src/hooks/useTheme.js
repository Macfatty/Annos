import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook för tema-hantering
 * Hanterar ljust/mörkt läge med localStorage-persistens
 */
export function useTheme() {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem("tema") || "light";
  });

  // Uppdatera body class när tema ändras
  useEffect(() => {
    document.body.className = tema;
    localStorage.setItem("tema", tema);
  }, [tema]);

  // Lyssna på storage events för cross-tab sync
  useEffect(() => {
    const handleStorage = () => {
      const lagrat = localStorage.getItem("tema") || "light";
      setTema(lagrat);
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  /**
   * Växla mellan ljust och mörkt läge
   */
  const växlaTema = useCallback(() => {
    setTema(prev => prev === "light" ? "dark" : "light");
  }, []);

  /**
   * Sätt specifikt tema
   */
  const setTemaManuellt = useCallback((nyttTema) => {
    if (nyttTema === "light" || nyttTema === "dark") {
      setTema(nyttTema);
    } else {
      console.warn("Ogiltigt tema. Använd 'light' eller 'dark'");
    }
  }, []);

  // Computed properties
  const isDarkMode = tema === "dark";
  const isLightMode = tema === "light";

  return {
    // State
    tema,
    
    // Computed properties
    isDarkMode,
    isLightMode,
    
    // Actions
    växlaTema,
    setTemaManuellt,
  };
}
