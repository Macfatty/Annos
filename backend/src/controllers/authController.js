const AuthService = require('../services/authService');
const { validateRequest, validateEmail, sanitizeInput } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * Authentication Controller
 * Hanterar alla autentiseringsrelaterade endpoints
 */
class AuthController {
  /**
   * Register new user
   */
  static async register(req, res, next) {
    try {
      const { email, password, namn, telefon, adress } = req.body;

      // DEBUG: Log registration attempt
      console.log('[REGISTER DEBUG] Request body:', {
        email,
        hasPassword: !!password,
        passwordLength: password?.length,
        namn,
        telefon,
        adress
      });

      // Validate input
      if (!email || !password || !namn) {
        console.log('[REGISTER DEBUG] Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Email, password and name are required'
        });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }

      const result = await AuthService.register({
        email,
        password,
        namn: sanitizeInput(namn),
        telefon: sanitizeInput(telefon),
        adress: sanitizeInput(adress)
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req, res, next) {
    try {
      const { email, password, losenord } = req.body;
      const submittedPassword =
        typeof password === 'string' && password.trim().length > 0
          ? password
          : typeof losenord === 'string'
            ? losenord
            : '';

      if (!email || !submittedPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await AuthService.login(email, submittedPassword);

      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user and revoke all refresh tokens
   */
  static async logout(req, res, next) {
    try {
      // Revoke all refresh tokens for this user
      const userId = req.user.userId || req.user.id;
      if (userId) {
        await AuthService.revokeAllUserTokens(userId);
      }

      res.clearCookie('token');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      // Even if revoking tokens fails, clear cookies
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      next(error);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req, res, next) {
    try {
      // BACKWARD COMPATIBILITY: Support both userId and id
      const userId = req.user.userId || req.user.id;
      const user = await AuthService.getUserById(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      // BACKWARD COMPATIBILITY: Support both userId and id
      const userId = req.user.userId || req.user.id;
      const { namn, telefon, adress } = req.body;

      const updatedUser = await AuthService.updateProfile(userId, {
        namn: sanitizeInput(namn),
        telefon: sanitizeInput(telefon),
        adress: sanitizeInput(adress)
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res, next) {
    try {
      // BACKWARD COMPATIBILITY: Support both userId and id
      const userId = req.user.userId || req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      await AuthService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token with token rotation (Industry Standard)
   * Token Rotation: When a refresh token is used, it is revoked and a new one is issued
   * This prevents replay attacks and limits the damage if a token is compromised
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided'
        });
      }

      // Validate refresh token from database (checks revocation, expiry)
      const tokenData = await AuthService.validateRefreshToken(refreshToken);

      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Generate new access token
      const newAccessToken = AuthService.generateToken({
        userId: tokenData.id,  // Use userId for consistency
        email: tokenData.email,
        role: tokenData.role
      });

      // Generate new refresh token (Token Rotation)
      const newRefreshToken = AuthService.generateRefreshToken({
        userId: tokenData.id,
        email: tokenData.email
      });

      // Revoke old refresh token and save new one
      await AuthService.revokeRefreshToken(refreshToken, newRefreshToken);
      await AuthService.saveRefreshToken(tokenData.id, newRefreshToken);

      // Set new cookies
      res.cookie('token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token: newAccessToken }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  }
}

module.exports = AuthController;
