const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is a driver
const isDriver = (req, res, next) => {
  if (req.userRole !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver only.' });
  }
  next();
};

// Middleware to check if user is a passenger
const isPassenger = (req, res, next) => {
  if (req.userRole !== 'passenger') {
    return res.status(403).json({ message: 'Access denied. Passenger only.' });
  }
  next();
};

module.exports = { authMiddleware, isDriver, isPassenger };
