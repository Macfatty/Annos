import { useState, useCallback } from "react";

/**
 * Custom hook för API-anrop med loading states och error handling
 * Ger en enhetlig interface för API-anrop med automatisk state-hantering
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Utför API-anrop med automatisk loading och error state
   */
  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showLoading = true,
      clearError = true 
    } = options;

    try {
      if (showLoading) {
        setLoading(true);
      }
      
      if (clearError) {
        setError(null);
      }

      const result = await apiCall();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      console.error("API call failed:", err);
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Rensa error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sätt error state manuellt
   */
  const setErrorManuellt = useCallback((error) => {
    setError(error);
  }, []);

  return {
    // State
    loading,
    error,
    
    // Actions
    execute,
    clearError,
    setErrorManuellt,
  };
}

/**
 * Specialiserad hook för API-anrop med retry-logik
 */
export function useApiWithRetry() {
  const { loading, error, execute, clearError, setErrorManuellt } = useApi();

  /**
   * Utför API-anrop med retry-logik
   */
  const executeWithRetry = useCallback(async (apiCall, options = {}) => {
    const { 
      maxRetries = 3,
      retryDelay = 1000,
      onRetry,
      ...otherOptions 
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await execute(apiCall, {
          ...otherOptions,
          showLoading: attempt === 0, // Visa loading endast på första försöket
        });
        
        return result;
      } catch (err) {
        lastError = err;
        
        if (attempt < maxRetries) {
          console.warn(`API call attempt ${attempt + 1} failed, retrying...`, err.message);
          
          if (onRetry) {
            onRetry(attempt + 1, err);
          }
          
          // Vänta innan nästa försök
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    // Alla försök misslyckades
    throw lastError;
  }, [execute]);

  return {
    loading,
    error,
    execute: executeWithRetry,
    clearError,
    setErrorManuellt,
  };
}
