const Ride = require('../models/Ride');
const User = require('../models/User');
const Message = require('../models/Message');

// Create a new ride request (Passenger only)
const createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, distance } = req.body;

    // Validate input
    if (!pickupLocation || !dropLocation || !distance) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if passenger already has an active ride
    const activeRide = await Ride.findOne({
      passengerId: req.userId,
      status: { $in: ['requested', 'accepted'] }
    });

    if (activeRide) {
      return res.status(400).json({ 
        message: 'You already have an active ride. Please wait for it to complete before booking another.' 
      });
    }

    // Calculate fare based on distance
    const ratePerKm = parseFloat(process.env.RATE_PER_KM) || 10;
    const fare = parseFloat((distance * ratePerKm).toFixed(2));

    // Create new ride
    const ride = new Ride({
      passengerId: req.userId,
      pickupLocation,
      dropLocation,
      distance,
      fare,
      status: 'requested'
    });

    await ride.save();

    // Populate passenger details
    await ride.populate('passengerId', 'name email phone role');

    res.status(201).json({
      message: 'Ride requested successfully',
      ride
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ message: 'Server error while creating ride' });
  }
};

// Get available drivers
const getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ 
      role: 'driver', 
      isAvailable: true 
    }).select('-password');

    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending ride requests for driver
const getPendingRides = async (req, res) => {
  try {
    // Check if driver has an active ride
    const activeRide = await Ride.findOne({
      driverId: req.userId,
      status: 'accepted'
    });

    // If driver has an active ride, return empty array
    if (activeRide) {
      return res.json({ rides: [] });
    }

    const rides = await Ride.find({ 
      status: 'requested',
      driverId: null
    })
    .populate('passengerId', 'name email phone')
    .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error('Get pending rides error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept ride (Driver only)
const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    // Check if driver already has an active ride
    const activeRide = await Ride.findOne({
      driverId: req.userId,
      status: 'accepted'
    });

    if (activeRide) {
      return res.status(400).json({ message: 'You already have an active ride. Please complete it before accepting another.' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride is not available for acceptance' });
    }

    // Update ride
    ride.driverId = req.userId;
    ride.status = 'accepted';
    await ride.save();

    // Populate details
    await ride.populate('passengerId driverId', 'name email phone role');

    // Notify all drivers that this ride is no longer available
    const io = req.app.get('io');
    if (io) {
      io.emit('ride-taken', { rideId: ride._id.toString() });
    }

    res.json({
      message: 'Ride accepted successfully',
      ride
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject ride (Driver only)
const rejectRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride cannot be rejected' });
    }

    ride.status = 'rejected';
    await ride.save();

    res.json({
      message: 'Ride rejected',
      ride
    });
  } catch (error) {
    console.error('Reject ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Complete ride (Driver only)
const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { paymentReceived } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.driverId.toString() !== req.userId) {
      return res.status(403).json({ message: 'You are not assigned to this ride' });
    }

    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'Ride is not in accepted state' });
    }

    ride.status = 'completed';
    ride.paymentReceived = paymentReceived || false;
    await ride.save();

    await ride.populate('passengerId driverId', 'name email phone role');

    res.json({
      message: 'Ride completed successfully',
      ride
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's rides
const getUserRides = async (req, res) => {
  try {
    const userRole = req.userRole;
    let rides;

    if (userRole === 'passenger') {
      rides = await Ride.find({ passengerId: req.userId })
        .populate('driverId', 'name email phone')
        .sort({ createdAt: -1 });
    } else if (userRole === 'driver') {
      rides = await Ride.find({ driverId: req.userId })
        .populate('passengerId', 'name email phone')
        .sort({ createdAt: -1 });
    }

    res.json({ rides });
  } catch (error) {
    console.error('Get user rides error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get specific ride details
const getRideDetails = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId)
      .populate('passengerId', 'name email phone role')
      .populate('driverId', 'name email phone role');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if user is part of this ride
    if (
      ride.passengerId._id.toString() !== req.userId &&
      ride.driverId?._id.toString() !== req.userId
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Get ride details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message in ride chat
const sendMessage = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if ride is accepted
    if (ride.status !== 'accepted' && ride.status !== 'completed') {
      return res.status(400).json({ message: 'Chat only available for accepted rides' });
    }

    // Check if user is part of this ride
    if (
      ride.passengerId.toString() !== req.userId &&
      ride.driverId?.toString() !== req.userId
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const newMessage = new Message({
      rideId,
      senderId: req.userId,
      message
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'name email phone role');

    res.status(201).json({
      message: 'Message sent successfully',
      chatMessage: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages for a ride
const getRideMessages = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if user is part of this ride
    if (
      ride.passengerId.toString() !== req.userId &&
      ride.driverId?.toString() !== req.userId
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ rideId })
      .populate('senderId', 'name email phone role')
      .sort({ timestamp: 1 });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel ride by driver
const cancelRideByDriver = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if the driver is the one who accepted this ride
    if (ride.driverId?.toString() !== req.userId) {
      return res.status(403).json({ message: 'You are not the driver for this ride' });
    }

    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted rides can be cancelled' });
    }

    // Update ride status to cancelled
    ride.status = 'cancelled';
    await ride.save();

    // Populate passenger details
    await ride.populate('passengerId driverId', 'name email phone role');

    // Notify passenger via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('ride-cancelled-by-driver', {
        rideId: ride._id.toString(),
        passengerId: ride.passengerId._id.toString(),
        driverName: ride.driverId.name,
        driverEmail: ride.driverId.email
      });
    }

    res.json({
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Re-request ride by passenger
const rerequestRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if the passenger is the owner of this ride
    if (ride.passengerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'You are not the passenger for this ride' });
    }

    if (ride.status !== 'cancelled') {
      return res.status(400).json({ message: 'Only cancelled rides can be re-requested' });
    }

    // Reset ride status and remove driver
    ride.status = 'requested';
    ride.driverId = null;
    await ride.save();

    // Populate details
    await ride.populate('passengerId', 'name email phone role');

    // Notify all available drivers
    const io = req.app.get('io');
    if (io) {
      io.emit('ride-request-notification', {
        rideId: ride._id.toString(),
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        passengerName: ride.passengerId.name,
        passengerEmail: ride.passengerId.email
      });
    }

    res.json({
      message: 'Ride re-requested successfully',
      ride
    });
  } catch (error) {
    console.error('Re-request ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel ride by passenger (only for requested rides)
const cancelRideByPassenger = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if the passenger is the one who requested this ride
    if (ride.passengerId?.toString() !== req.userId) {
      return res.status(403).json({ message: 'You are not the passenger for this ride' });
    }

    // Only allow cancellation of requested rides (not yet accepted by driver)
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Only requested rides can be cancelled by passenger' });
    }

    // Update ride status to cancelled
    ride.status = 'cancelled';
    await ride.save();

    // Notify all drivers via socket that this ride has been cancelled
    const io = req.app.get('io');
    if (io) {
      io.emit('ride-cancelled-by-passenger', {
        rideId: ride._id.toString()
      });
    }

    res.json({
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (error) {
    console.error('Cancel ride by passenger error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
};
