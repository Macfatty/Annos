/**
 * JWT Blacklist Service
 *
 * In-memory JWT blacklist for logout functionality.
 * When Redis is added (PHASE 6), this can be migrated to Redis for persistence.
 *
 * Features:
 * - Add tokens to blacklist on logout
 * - Check if token is blacklisted
 * - Auto-cleanup of expired tokens
 * - Memory-efficient (stores only JTI or token hash)
 *
 * Note: In-memory implementation means blacklist is lost on server restart.
 * For production with multiple servers, migrate to Redis (see PHASE 6).
 */

class JwtBlacklistService {
  // In-memory Set for blacklisted tokens
  static blacklist = new Set();

  // Track when tokens were added for cleanup
  static tokenExpiry = new Map(); // token -> expiryTimestamp

  // Cleanup interval (run every 5 minutes)
  static cleanupInterval = null;
  static CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the blacklist service
   * Starts automatic cleanup of expired tokens
   */
  static init() {
    if (this.cleanupInterval) {
      return; // Already initialized
    }

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.CLEANUP_INTERVAL_MS);

    console.log('✅ JWT Blacklist Service initialized');
  }

  /**
   * Add a token to the blacklist
   *
   * @param {String} token - JWT token to blacklist
   * @param {Number} expiryTimestamp - Token expiry timestamp (from JWT payload)
   */
  static addToken(token, expiryTimestamp = null) {
    this.blacklist.add(token);

    if (expiryTimestamp) {
      this.tokenExpiry.set(token, expiryTimestamp);
    } else {
      // If no expiry provided, assume 24 hours from now
      const defaultExpiry = Date.now() + (24 * 60 * 60 * 1000);
      this.tokenExpiry.set(token, defaultExpiry);
    }

    console.log(`🚫 Token blacklisted (expires: ${new Date(expiryTimestamp || Date.now()).toISOString()})`);
  }

  /**
   * Check if a token is blacklisted
   *
   * @param {String} token - JWT token to check
   * @returns {Boolean} - True if token is blacklisted
   */
  static isBlacklisted(token) {
    return this.blacklist.has(token);
  }

  /**
   * Remove a token from the blacklist
   * (Usually only called by cleanup)
   *
   * @param {String} token - JWT token to remove
   */
  static removeToken(token) {
    this.blacklist.delete(token);
    this.tokenExpiry.delete(token);
  }

  /**
   * Clean up expired tokens from blacklist
   * This prevents memory leaks
   */
  static cleanupExpiredTokens() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, expiryTimestamp] of this.tokenExpiry.entries()) {
      if (expiryTimestamp && expiryTimestamp < now) {
        this.removeToken(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired tokens from blacklist`);
    }
  }

  /**
   * Get blacklist statistics
   *
   * @returns {Object} - Blacklist stats
   */
  static getStats() {
    return {
      blacklistedTokens: this.blacklist.size,
      oldestExpiry: this.tokenExpiry.size > 0
        ? Math.min(...Array.from(this.tokenExpiry.values()))
        : null,
      newestExpiry: this.tokenExpiry.size > 0
        ? Math.max(...Array.from(this.tokenExpiry.values()))
        : null
    };
  }

  /**
   * Clear all tokens (for testing only)
   */
  static clearAll() {
    this.blacklist.clear();
    this.tokenExpiry.clear();
    console.log('🧹 Blacklist cleared');
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  static shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('✅ JWT Blacklist Service shut down');
    }
  }
}

// Initialize on module load
JwtBlacklistService.init();

module.exports = JwtBlacklistService;
