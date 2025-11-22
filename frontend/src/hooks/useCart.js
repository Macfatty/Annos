import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook för kundvagnshantering
 * Hanterar varukorg, lägg till/ta bort varor, redigering
 */
export function useCart() {
  const [varukorg, setVarukorg] = useState(() => {
    const sparad = localStorage.getItem("varukorg");
    return sparad ? JSON.parse(sparad) : [];
  });

  const [valdRatt, setValdRatt] = useState(null);
  const [redigeringsIndex, setRedigeringsIndex] = useState(null);

  // Spara varukorg till localStorage när den ändras
  useEffect(() => {
    localStorage.setItem("varukorg", JSON.stringify(varukorg));
  }, [varukorg]);

  /**
   * Lägg till vara i kundvagn
   */
  const addToCart = useCallback((vara) => {
    if (redigeringsIndex !== null) {
      // Redigera befintlig vara
      const ny = [...varukorg];
      ny[redigeringsIndex] = vara;
      setVarukorg(ny);
      setRedigeringsIndex(null);
    } else {
      // Lägg till ny vara
      setVarukorg(prev => [...prev, vara]);
    }
    setValdRatt(null);
  }, [varukorg, redigeringsIndex]);

  /**
   * Ta bort vara från kundvagn
   */
  const removeFromCart = useCallback((index) => {
    setVarukorg(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Uppdatera vara i kundvagn
   */
  const updateCartItem = useCallback((index, updatedVara) => {
    setVarukorg(prev => prev.map((item, i) => i === index ? updatedVara : item));
  }, []);

  /**
   * Rensa hela kundvagnen
   */
  const clearCart = useCallback(() => {
    setVarukorg([]);
  }, []);

  /**
   * Redigera vara i kundvagn
   */
  const editCartItem = useCallback((index) => {
    setRedigeringsIndex(index);
    setValdRatt(varukorg[index]);
  }, [varukorg]);

  /**
   * Avbryt redigering
   */
  const cancelEdit = useCallback(() => {
    setRedigeringsIndex(null);
    setValdRatt(null);
  }, []);

  /**
   * Beräkna totalpris
   */
  const totalPris = varukorg.reduce((summa, item) => {
    const tillvalPris = Array.isArray(item.tillval)
      ? item.tillval.reduce((acc, val) => acc + (val.pris || 0), 0)
      : 0;
    return summa + item.pris + tillvalPris;
  }, 0);

  /**
   * Beräkna antal varor
   */
  const antalVaror = varukorg.length;

  /**
   * Kontrollera om kundvagnen är tom
   */
  const isCartEmpty = antalVaror === 0;

  return {
    // State
    varukorg,
    valdRatt,
    redigeringsIndex,

    // Computed properties
    totalPris,
    antalVaror,
    isCartEmpty,

    // Actions
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    editCartItem,
    cancelEdit,
    setValdRatt,
    setRedigeringsIndex,
    setVarukorg, // Export for direct cart manipulation (Checkout, Kundvagn)
  };
}
