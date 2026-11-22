const express = require('express');
const router = express.Router();
const {
  createRide,
  getAvailableDrivers,
  getPendingRides,
  acceptRide,
  rejectRide,
  completeRide,
  getUserRides,
  getRideDetails,
  sendMessage,
  getRideMessages,
  cancelRideByDriver,
  cancelRideByPassenger,
  rerequestRide
} = require('../controllers/rideController');
const { authMiddleware, isDriver, isPassenger } = require('../middleware/auth');

// Passenger routes
router.post('/create', authMiddleware, isPassenger, createRide);
router.get('/drivers/available', authMiddleware, getAvailableDrivers);
router.put('/:rideId/cancel-passenger', authMiddleware, isPassenger, cancelRideByPassenger);

// Driver routes
router.get('/pending', authMiddleware, isDriver, getPendingRides);
router.put('/:rideId/accept', authMiddleware, isDriver, acceptRide);
router.put('/:rideId/reject', authMiddleware, isDriver, rejectRide);
router.put('/:rideId/complete', authMiddleware, isDriver, completeRide);
router.put('/:rideId/cancel', authMiddleware, isDriver, cancelRideByDriver);

// Passenger routes for cancelled rides
router.put('/:rideId/rerequest', authMiddleware, isPassenger, rerequestRide);

// Common routes
router.get('/my-rides', authMiddleware, getUserRides);
router.get('/:rideId', authMiddleware, getRideDetails);

// Chat routes
router.post('/:rideId/messages', authMiddleware, sendMessage);
router.get('/:rideId/messages', authMiddleware, getRideMessages);

module.exports = router;
