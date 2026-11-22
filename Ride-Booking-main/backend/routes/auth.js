const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateAvailability } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/availability', authMiddleware, updateAvailability);

module.exports = router;
