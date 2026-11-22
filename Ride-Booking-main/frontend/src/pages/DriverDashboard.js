import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ridesAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import { IoCarSportOutline, IoChatbubbleEllipsesOutline, IoLogOutOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoToggle, IoEllipsisVertical } from 'react-icons/io5';
import { toast } from 'sonner';

// Helper function to shorten addresses
const shortenAddress = (address, maxLength = 40) => {
  if (!address) return '';
  if (address.length <= maxLength) return address;
  
  // Try to get the first meaningful part (city/area)
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  
  return address.substring(0, maxLength) + '...';
};

function DriverDashboard() {
  const { user, logout, updateAvailability, token } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(token);

  const [pendingRides, setPendingRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadMessages, setUnreadMessages] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);

  // Debug: Log unreadMessages whenever it changes
  useEffect(() => {
    console.log('Driver unreadMessages updated:', unreadMessages);
  }, [unreadMessages]);

  useEffect(() => {
    loadPendingRides();
    loadMyRides();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for new ride requests
    socket.on('ride-request-notification', (ride) => {
      console.log('New ride request:', ride);
      if (isAvailable) {
        setSuccess('New ride request available!');
        loadPendingRides();
        setTimeout(() => setSuccess(''), 5000);
      }
    });

    // Listen for ride taken by another driver
    socket.on('ride-taken', (data) => {
      console.log('Ride taken by another driver:', data);
      // Remove the ride from pending list
      setPendingRides(prevRides => prevRides.filter(ride => ride._id !== data.rideId));
    });

    // Listen for ride cancelled by passenger
    socket.on('ride-cancelled-by-passenger', (data) => {
      console.log('Ride cancelled by passenger:', data);
      // Remove the ride from pending list
      setPendingRides(prevRides => prevRides.filter(ride => ride._id !== data.rideId));
    });

    // Listen for new messages
    socket.on('new-chat-message', (data) => {
      console.log('New chat message received in DriverDashboard:', data);
      // Mark as unread if sent by someone else
      const currentUserId = user?.id || user?._id;
      console.log('Current user ID:', currentUserId, 'Sender ID:', data.senderId);
      if (data.senderId !== currentUserId) {
        console.log('Setting unread message for ride:', data.rideId);
        setUnreadMessages(prev => ({
          ...prev,
          [data.rideId]: (prev[data.rideId] || 0) + 1
        }));
        
        // Show toast notification with custom content
        const ride = [...pendingRides, ...myRides].find(r => r._id === data.rideId);
        const senderName = ride?.passengerId?.name || 'Passenger';
        const messagePreview = data.message && data.message.length > 60 ? data.message.substring(0, 60) + '...' : (data.message || 'New message');
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        toast(
          <div className="toast-notification-content" onClick={(e) => {
            e.stopPropagation();
            navigate(`/chat/${data.rideId}`);
            toast.dismiss();
          }}>
            <div className="toast-left-accent"></div>
            <div className="toast-icon-wrapper">
              <IoChatbubbleEllipsesOutline className="toast-icon" />
            </div>
            <div className="toast-text">
              <div className="toast-header">
                <span className="toast-sender">{senderName}</span>
                <span className="toast-time">{timeString}</span>
              </div>
              <p className="toast-message-preview">{messagePreview}</p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        );
      }
    });

    return () => {
      socket.off('ride-request-notification');
      socket.off('ride-taken');
      socket.off('ride-cancelled-by-passenger');
      socket.off('new-chat-message');
    };
  }, [socket, isAvailable]);

  const loadPendingRides = async () => {
    try {
      const response = await ridesAPI.getPendingRides();
      setPendingRides(response.data.rides);
    } catch (error) {
      console.error('Load pending rides error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRides = async () => {
    try {
      const response = await ridesAPI.getUserRides();
      setMyRides(response.data.rides);
    } catch (error) {
      console.error('Load my rides error:', error);
    }
  };

  const handleToggleAvailability = async () => {
    const newAvailability = !isAvailable;
    const result = await updateAvailability(newAvailability);
    
    if (result.success) {
      setIsAvailable(newAvailability);
      setSuccess(newAvailability ? 'You are now available for rides' : 'You are now offline');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      const response = await ridesAPI.acceptRide(rideId);
      
      // Emit socket event to notify passenger
      if (socket && response.data.ride) {
        socket.emit('ride-accepted', {
          passengerId: response.data.ride.passengerId._id,
          ride: response.data.ride
        });
      }

      setSuccess('Ride accepted successfully!');
      loadPendingRides();
      loadMyRides();
      
      // Redirect to active ride page after 1 second
      setTimeout(() => {
        navigate(`/ride/${rideId}`);
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to accept ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRejectRide = async (rideId, passengerId) => {
    try {
      await ridesAPI.rejectRide(rideId);
      
      // Emit socket event to notify passenger
      if (socket) {
        socket.emit('ride-rejected', {
          passengerId,
          rideId
        });
      }

      loadPendingRides();
      loadMyRides();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reject ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCompleteRide = async (rideId, passengerId) => {
    const paymentReceived = window.confirm('Has payment been received?');
    
    try {
      const response = await ridesAPI.completeRide(rideId, paymentReceived);
      
      // Emit socket event to notify passenger
      if (socket && response.data.ride) {
        socket.emit('ride-completed', {
          passengerId,
          ride: response.data.ride
        });
      }

      setSuccess('Ride completed successfully!');
      loadMyRides();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to complete ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancelRide = async (rideId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this ride?');
    
    if (!confirmCancel) return;

    try {
      await ridesAPI.cancelRide(rideId);
      setSuccess('Ride cancelled successfully');
      loadMyRides();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to cancel ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openChat = (ride) => {
    // Clear unread count when opening chat
    setUnreadMessages(prev => {
      const updated = { ...prev };
      delete updated[ride._id];
      return updated;
    });
    navigate(`/chat/${ride._id}`);
  };

  return (
    <div className="dashboard driver-dashboard">
      <nav className="navbar">
        <div className="navbar-brand">
          <IoCarSportOutline style={{ marginRight: '8px', fontSize: '24px', verticalAlign: 'middle' }} />
          Ride Booking
        </div>
        <div className="navbar-user">
          <div className="toggle-container">
            <span className="toggle-label">
              {isAvailable ? 'Available' : 'Offline'}
            </span>
            <div 
              className={`toggle-switch ${isAvailable ? 'active' : ''}`}
              onClick={handleToggleAvailability}
            >
              <div className="toggle-slider"></div>
            </div>
          </div>
          <span className="user-email">{user?.name || user?.email?.split('@')[0]}</span>
          <span className="user-role">Driver</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <IoLogOutOutline style={{ marginRight: '6px', fontSize: '18px', verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Pending Ride Requests */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Pending Ride Requests</h2>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : !isAvailable ? (
            <div className="empty-state">
              <div className="empty-state-icon">💤</div>
              <h3 className="empty-state-title">You're Offline</h3>
              <p className="empty-state-text">Turn on availability to see ride requests</p>
            </div>
          ) : pendingRides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <h3 className="empty-state-title">No pending requests</h3>
              <p className="empty-state-text">
                {myRides.some(ride => ride.status === 'accepted') 
                  ? 'Complete your current ride to see new requests' 
                  : 'Waiting for ride requests...'}
              </p>
            </div>
          ) : (
            <div>
              {pendingRides.map((ride) => (
                <div key={ride._id} className="ride-card">
                  <div className="ride-header">
                    <span className={`ride-status status-${ride.status}`}>
                      New Request
                    </span>
                    <span style={{ fontSize: '12px', color: '#86868b' }}>
                      {new Date(ride.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="ride-details">
                    <p><strong>Passenger:</strong> {ride.passengerId?.name}</p>
                    <p><strong>Phone:</strong> {ride.passengerId?.phone}</p>
                    <p><strong>From:</strong> {ride.pickupLocation}</p>
                    <p><strong>To:</strong> {ride.dropLocation}</p>
                    <p><strong>Distance:</strong> {ride.distance} km</p>
                  </div>

                  <div className="ride-fare">₹{parseFloat(ride.fare).toFixed(2)}</div>

                  <div className="ride-actions" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleAcceptRide(ride._id)}
                      style={{ flex: 1, boxShadow: 'none' }}
                    >
                      Accept Ride
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRejectRide(ride._id, ride.passengerId?._id)}
                      style={{ flex: 1, boxShadow: 'none' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active/Completed Rides */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Rides</h2>
          </div>

          {myRides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">—</div>
              <h3 className="empty-state-title">No rides yet</h3>
              <p className="empty-state-text">Accept a ride to get started</p>
            </div>
          ) : (
            <div>
              {myRides.map((ride) => (
                <div key={ride._id} className="ride-card">
                  <div className="ride-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className={`ride-status status-${ride.status}`}>
                        {ride.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#86868b' }}>
                        {new Date(ride.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {ride.status === 'accepted' && (
                      <div className="dropdown-container" style={{ position: 'relative' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setOpenDropdown(openDropdown === ride._id ? null : ride._id)}
                          style={{ padding: '8px 12px' }}
                        >
                          <IoEllipsisVertical style={{ fontSize: '18px', verticalAlign: 'middle' }} />
                        </button>
                        {openDropdown === ride._id && (
                          <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                handleCompleteRide(ride._id, ride.passengerId?._id);
                                setOpenDropdown(null);
                              }}
                            >
                              <IoCheckmarkCircleOutline style={{ marginRight: '8px', fontSize: '18px', verticalAlign: 'middle' }} />
                              Complete Ride
                            </button>
                            <button 
                              className="dropdown-item"
                              onClick={() => {
                                openChat(ride);
                                setOpenDropdown(null);
                              }}
                            >
                              <IoChatbubbleEllipsesOutline style={{ marginRight: '8px', fontSize: '18px', verticalAlign: 'middle' }} />
                              Chat
                              {unreadMessages[ride._id] > 0 && (
                                <span className="unread-badge" style={{ marginLeft: '8px' }}>{unreadMessages[ride._id]}</span>
                              )}
                            </button>
                            <button 
                              className="dropdown-item dropdown-item-danger"
                              onClick={() => {
                                handleCancelRide(ride._id);
                                setOpenDropdown(null);
                              }}
                            >
                              <IoCloseCircleOutline style={{ marginRight: '8px', fontSize: '18px', verticalAlign: 'middle' }} />
                              Cancel Ride
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ride-details">
                    <p><strong>Passenger:</strong> {ride.passengerId?.name}</p>
                    <p><strong>Phone:</strong> {ride.passengerId?.phone}</p>
                    <p><strong>From:</strong> {shortenAddress(ride.pickupLocation)}</p>
                    <p><strong>To:</strong> {shortenAddress(ride.dropLocation)}</p>
                    <p><strong>Distance:</strong> {ride.distance} km</p>
                  </div>

                  <div className="ride-fare">₹{parseFloat(ride.fare).toFixed(2)}</div>

                  {ride.status === 'completed' && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        color: ride.paymentReceived ? '#28a745' : '#dc3545',
                        fontWeight: '600'
                      }}>
                        Payment: {ride.paymentReceived ? '✓ Received' : '✗ Pending'}
                      </span>
                    </div>
                  )}

                  <div className="ride-actions">
                    {ride.status === 'accepted' && (
                      <button 
                        className="btn btn-outline btn-sm btn-with-notification"
                        onClick={() => navigate(`/ride/${ride._id}`)}
                      >
                        View Active Ride
                        {unreadMessages[ride._id] > 0 && <span className="notification-dot"></span>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
