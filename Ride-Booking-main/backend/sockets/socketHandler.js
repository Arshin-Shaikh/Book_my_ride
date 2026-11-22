const jwt = require('jsonwebtoken');

// Store connected users: userId -> socketId
const connectedUsers = new Map();

const setupSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);

    // Join user to their personal room
    socket.join(socket.userId);

    // Notify about connection
    socket.emit('connected', { 
      message: 'Connected to server',
      userId: socket.userId,
      role: socket.userRole
    });

    // Handle new ride request - notify all available drivers
    socket.on('new-ride-request', (rideData) => {
      console.log('New ride request:', rideData);
      // Broadcast to all drivers
      io.emit('ride-request-notification', rideData);
    });

    // Handle ride acceptance - notify passenger
    socket.on('ride-accepted', (data) => {
      console.log('Ride accepted:', data);
      const { passengerId, ride } = data;
      // Send to specific passenger
      io.to(passengerId).emit('ride-accepted-notification', ride);
    });

    // Handle ride rejection
    socket.on('ride-rejected', (data) => {
      console.log('Ride rejected:', data);
      const { passengerId, rideId } = data;
      io.to(passengerId).emit('ride-rejected-notification', { rideId });
    });

    // Handle ride completion - notify passenger
    socket.on('ride-completed', (data) => {
      console.log('Ride completed:', data);
      const { passengerId, ride } = data;
      io.to(passengerId).emit('ride-completed-notification', ride);
    });

    // Handle chat messages
    socket.on('send-message', (messageData) => {
      console.log('New message:', messageData);
      const { rideId, receiverId, message } = messageData;
      
      // Send to receiver
      io.to(receiverId).emit('new-message', {
        rideId,
        message,
        senderId: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle joining a ride room for chat
    socket.on('join-ride-room', (rideId) => {
      socket.join(`ride-${rideId}`);
      console.log(`User ${socket.userId} joined ride room: ride-${rideId}`);
    });

    // Handle leaving a ride room
    socket.on('leave-ride-room', (rideId) => {
      socket.leave(`ride-${rideId}`);
      console.log(`User ${socket.userId} left ride room: ride-${rideId}`);
    });

    // Send message to ride room
    socket.on('ride-message', (data) => {
      const { rideId, message, senderRole, senderEmail } = data;
      // Broadcast to all users in the ride room except sender
      socket.to(`ride-${rideId}`).emit('ride-message-received', {
        rideId,
        message,
        senderRole,
        senderEmail,
        senderId: socket.userId,
        timestamp: new Date()
      });
      
      // Also emit globally for unread notifications (for users not in chat room)
      io.emit('new-chat-message', {
        rideId,
        senderId: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
    });
  });

  return io;
};

module.exports = { setupSocket, connectedUsers };
