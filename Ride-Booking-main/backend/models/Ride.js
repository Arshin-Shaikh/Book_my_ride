const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickupLocation: {
    type: String,
    required: true
  },
  pickupCoordinates: {
    lat: Number,
    lng: Number
  },
  dropLocation: {
    type: String,
    required: true
  },
  dropCoordinates: {
    lat: Number,
    lng: Number
  },
  distance: {
    type: Number,
    required: true
  },
  fare: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'requested'
  },
  paymentReceived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);
