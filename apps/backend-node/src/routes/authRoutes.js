
const express = require('express');

const {
    registerUser,
    loginUser,
    getCurrentUser
} = require('../controllers/authController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected route
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
