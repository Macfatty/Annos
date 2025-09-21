const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

/**
 * Authentication Routes
 * Alla autentiseringsrelaterade endpoints
 */

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('namn').notEmpty().trim(),
  body('telefon').optional().trim(),
  body('adress').optional().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const updateProfileValidation = [
  body('namn').optional().trim(),
  body('telefon').optional().trim(),
  body('adress').optional().trim()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
];

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.use(verifyJWT);

router.get('/profile', AuthController.getProfile);
router.put('/profile', updateProfileValidation, AuthController.updateProfile);
router.put('/change-password', changePasswordValidation, AuthController.changePassword);
router.post('/logout', AuthController.logout);

module.exports = router;
