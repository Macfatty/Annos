const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validateEmail, sanitizeInput } = require('../middleware/validation');

/**
 * Authentication Service
 * Hanterar all autentiseringslogik
 */
class AuthService {
  /**
   * Hash password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password
   */
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '24h' 
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
  }

  /**
   * Save refresh token to database
   * @param {number} userId - User ID
   * @param {string} token - Refresh token
   * @returns {Promise<void>}
   */
  static async saveRefreshToken(userId, token) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  }

  /**
   * Validate and get user from refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object|null>} User object or null if invalid
   */
  static async validateRefreshToken(token) {
    try {
      // Verify JWT signature
      const decoded = this.verifyRefreshToken(token);

      // Check if token exists and is not revoked in database
      const result = await pool.query(
        `SELECT rt.*, u.id, u.email, u.role, u.namn, u.telefon, u.adress
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1
           AND rt.revoked = FALSE
           AND rt.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Refresh token validation error:', error);
      return null;
    }
  }

  /**
   * Revoke refresh token (used during token rotation)
   * @param {string} oldToken - Old refresh token to revoke
   * @param {string} newToken - New replacement token (optional)
   */
  static async revokeRefreshToken(oldToken, newToken = null) {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked = TRUE,
           revoked_at = NOW(),
           replaced_by_token = $2
       WHERE token = $1`,
      [oldToken, newToken]
    );
  }

  /**
   * Revoke all refresh tokens for a user (used during logout)
   * @param {number} userId - User ID
   */
  static async revokeAllUserTokens(userId) {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked = TRUE,
           revoked_at = NOW()
       WHERE user_id = $1 AND revoked = FALSE`,
      [userId]
    );
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  static async cleanupExpiredTokens() {
    const result = await pool.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW() - INTERVAL '30 days'`
    );
    return result.rowCount;
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.REFRESH_SECRET);
  }

  /**
   * Register new user
   */
  static async register(userData) {
    const { email, password, namn, telefon, adress } = userData;

    // Validate input
    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Sanitize input
    const sanitizedData = {
      email: email.toLowerCase().trim(),
      password: await this.hashPassword(password),
      namn: sanitizeInput(namn),
      telefon: sanitizeInput(telefon),
      adress: sanitizeInput(adress)
    };

    try {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [sanitizedData.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password, namn, telefon, adress, role) 
         VALUES ($1, $2, $3, $4, $5, 'customer') 
         RETURNING id, email, namn, telefon, adress, role, created_at`,
        [sanitizedData.email, sanitizedData.password, sanitizedData.namn, 
         sanitizedData.telefon, sanitizedData.adress]
      );

      const user = result.rows[0];

      // Generate tokens
      const token = this.generateToken({
        userId: user.id,  // Use 'userId' for consistency with legacy endpoints
        email: user.email,
        role: user.role
      });

      const refreshToken = this.generateRefreshToken({
        userId: user.id,  // Use 'userId' for consistency
        email: user.email
      });

      // Save refresh token to database
      await this.saveRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          namn: user.namn,
          telefon: user.telefon,
          adress: user.adress,
          role: user.role
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      // DEBUG: Log incoming credentials
      console.log('[AUTH DEBUG] Login attempt:', {
        email: email,
        passwordLength: password?.length,
        passwordType: typeof password
      });

      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        console.log('[AUTH DEBUG] User not found:', email);
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];
      console.log('[AUTH DEBUG] User found:', { id: user.id, email: user.email, role: user.role });

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password);
      console.log('[AUTH DEBUG] Password valid:', isValidPassword);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const token = this.generateToken({
        userId: user.id,  // Use 'userId' for consistency with legacy endpoints
        email: user.email,
        role: user.role
      });

      const refreshToken = this.generateRefreshToken({
        userId: user.id,  // Use 'userId' for consistency
        email: user.email
      });

      // Save refresh token to database
      await this.saveRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          namn: user.namn,
          telefon: user.telefon,
          adress: user.adress,
          role: user.role
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const result = await pool.query(
        'SELECT id, email, namn, telefon, adress, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updateData) {
    const { namn, telefon, adress } = updateData;

    try {
      const result = await pool.query(
        `UPDATE users 
         SET namn = $1, telefon = $2, adress = $3, updated_at = NOW()
         WHERE id = $4 
         RETURNING id, email, namn, telefon, adress, role`,
        [sanitizeInput(namn), sanitizeInput(telefon), sanitizeInput(adress), userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const result = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.comparePassword(currentPassword, result.rows[0].password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );

      return { message: 'Password updated successfully' };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
