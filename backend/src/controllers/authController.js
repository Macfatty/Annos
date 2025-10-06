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

      // Validate input
      if (!email || !password || !namn) {
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
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
   * Logout user
   */
  static async logout(req, res, next) {
    try {
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
   * Refresh token
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

      const decoded = AuthService.verifyRefreshToken(refreshToken);
      const user = await AuthService.getUserById(decoded.id);

      const newToken = AuthService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token: newToken }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
