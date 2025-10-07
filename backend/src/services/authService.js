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
      expiresIn: "15m"
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_SECRET, { 
      expiresIn: '7d' 
    });
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
        id: user.id, 
        email: user.email, 
        role: user.role 
      });
      
      const refreshToken = this.generateRefreshToken({ 
        id: user.id, 
        email: user.email 
      });

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
      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const token = this.generateToken({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });
      
      const refreshToken = this.generateRefreshToken({ 
        id: user.id, 
        email: user.email 
      });

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
