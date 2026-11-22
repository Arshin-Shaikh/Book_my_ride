import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ridesAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import { IoCarSportOutline, IoChatbubbleEllipsesOutline, IoLogOutOutline, IoAddCircleOutline, IoEllipsisVertical, IoTimeSharp, IoPersonCircleOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import LocationMapPicker from '../components/LocationMapPicker';

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

function PassengerDashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(token);

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home'); // 'home', 'book', 'rides', 'account'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadMessages, setUnreadMessages] = useState({});
  const [cancelledRide, setCancelledRide] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Debug: Log unreadMessages whenever it changes
  useEffect(() => {
    console.log('Passenger unreadMessages updated:', unreadMessages);
  }, [unreadMessages]);

  // Book ride form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [mapData, setMapData] = useState(null);

  // Handle location data from map
  const handleLocationChange = (locationData) => {
    setMapData(locationData);
    setPickupLocation(locationData.startAddress);
    setDropLocation(locationData.endAddress);
    setDistance(locationData.distance);
  };

  useEffect(() => {
    loadRides();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for ride accepted notification
    socket.on('ride-accepted-notification', (ride) => {
      console.log('Ride accepted:', ride);
      setSuccess('Driver accepted your ride!');
      loadRides();
      // Redirect to active ride page after 1 second
      setTimeout(() => {
        navigate(`/ride/${ride._id || ride.rideId}`);
      }, 1000);
    });

    // Listen for ride rejected notification
    socket.on('ride-rejected-notification', (data) => {
      console.log('Ride rejected:', data);
      setError('Driver rejected the ride. Requesting another driver...');
      loadRides();
      setTimeout(() => setError(''), 5000);
    });

    // Listen for ride completed notification
    socket.on('ride-completed-notification', (ride) => {
      console.log('Ride completed:', ride);
      setSuccess('Ride completed! Thank you for using our service.');
      loadRides();
      setTimeout(() => setSuccess(''), 5000);
    });

    // Listen for ride cancelled by driver
    socket.on('ride-cancelled-by-driver', (data) => {
      const currentUserId = user?.id || user?._id;
      if (data.passengerId === currentUserId) {
        console.log('Ride cancelled by driver:', data);
        setCancelledRide(data.rideId);
        setShowCancelModal(true);
        loadRides();
      }
    });

    // Listen for new messages
    socket.on('new-chat-message', (data) => {
      console.log('New chat message received in PassengerDashboard:', data);
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
        const ride = rides.find(r => r._id === data.rideId);
        const senderName = ride?.driverId?.name || 'Driver';
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
      socket.off('ride-accepted-notification');
      socket.off('ride-rejected-notification');
      socket.off('ride-completed-notification');
      socket.off('ride-cancelled-by-driver');
      socket.off('new-chat-message');
    };
  }, [socket, navigate, user]);

  const loadRides = async () => {
    try {
      const response = await ridesAPI.getUserRides();
      setRides(response.data.rides);
    } catch (error) {
      console.error('Load rides error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await ridesAPI.createRide({
        pickupLocation,
        dropLocation,
        distance: parseFloat(distance),
        pickupCoordinates: mapData?.startLocation,
        dropCoordinates: mapData?.endLocation
      });

      // Emit socket event to notify drivers
      if (socket) {
        socket.emit('new-ride-request', response.data.ride);
      }

      setSuccess('Ride requested successfully! Waiting for driver acceptance...');
      setActiveView('home');
      setPickupLocation('');
      setDropLocation('');
      setDistance('');
      loadRides();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to book ride');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancelRide = async (rideId) => {
    try {
      await ridesAPI.cancelRideByPassenger(rideId);
      toast.success('Ride cancelled successfully');
      loadRides();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel ride');
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

  const handleRerequestRide = async () => {
    try {
      await ridesAPI.rerequestRide(cancelledRide);
      setSuccess('🔄 Ride re-requested! Searching for another driver...');
      setShowCancelModal(false);
      setCancelledRide(null);
      loadRides();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to re-request ride');
      setShowCancelModal(false);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeclinedRerequest = () => {
    setShowCancelModal(false);
    setCancelledRide(null);
  };

  return (
    <div className="dashboard passenger-dashboard">
      <nav className="navbar">
        <div className="navbar-brand">
          <IoCarSportOutline style={{ marginRight: '8px', fontSize: '24px', verticalAlign: 'middle' }} />
          Ride Booking
        </div>
        <div className="navbar-user">
          <span className="user-email">{user?.name || user?.email?.split('@')[0]}</span>
          <span className="user-role">Passenger</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <IoLogOutOutline style={{ marginRight: '6px', fontSize: '18px', verticalAlign: 'middle' }} />
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* HOME VIEW */}
        {activeView === 'home' && (
          <div className="home-view">
            <div className="hero-banner">
              <div className="hero-content-dash">
                <h1 className="hero-heading">Welcome, {user?.name || 'Guest'}!</h1>
                <p className="hero-subtext">Where would you like to go today?</p>
              </div>
            </div>

            <div className="action-cards-grid">
              <div className="action-card" onClick={() => {
                if (!rides.some(ride => ride.status === 'requested' || ride.status === 'accepted')) {
                  setActiveView('book');
                } else {
                  setError('Complete your active ride before booking another');
                  setTimeout(() => setError(''), 3000);
                }
              }}>
                <div className="action-icon">
                  <IoAddCircleOutline />
                </div>
                <h3>Book a Ride</h3>
                <p>Request a new ride to your destination</p>
              </div>

              <div className="action-card" onClick={() => setActiveView('rides')}>
                <div className="action-icon">
                  <IoTimeSharp />
                </div>
                <h3>My Rides</h3>
                <p>View your current and previous rides</p>
              </div>

              <div className="action-card" onClick={() => setActiveView('account')}>
                <div className="action-icon">
                  <IoPersonCircleOutline />
                </div>
                <h3>Account</h3>
                <p>Manage your profile and settings</p>
              </div>
            </div>

            {/* Active Ride Quick View */}
            {rides.some(ride => ride.status === 'requested' || ride.status === 'accepted' || ride.status === 'in-progress') && (
              <div className="active-ride-quick-view">
                <h3>Your Active Ride</h3>
                {rides.filter(ride => ride.status === 'requested' || ride.status === 'accepted' || ride.status === 'in-progress').map(ride => (
                  <div key={ride._id} className="quick-ride-card" onClick={ride.status !== 'requested' ? () => navigate(`/ride/${ride._id}`) : undefined} style={{ cursor: ride.status === 'requested' ? 'default' : 'pointer' }}>
                    <div className="quick-ride-info">
                      <span className="quick-status">{ride.status}</span>
                      <p className="quick-route">{shortenAddress(ride.pickupLocation, 30)} → {shortenAddress(ride.dropLocation, 30)}</p>
                    </div>
                    {ride.status === 'requested' ? (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="waiting-status">
                          <span className="waiting-text">Waiting for driver...</span>
                        </div>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRide(ride._id);
                          }}
                          style={{ boxShadow: 'none', whiteSpace: 'nowrap' }}
                        >
                          Cancel Ride
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-primary btn-sm btn-with-notification">
                        View Details
                        {unreadMessages[ride._id] > 0 && <span className="notification-dot"></span>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOK RIDE VIEW */}
        {activeView === 'book' && (
          <div className="book-view">
            <div className="view-header">
              <button className="btn-back" onClick={() => setActiveView('home')}>← Back</button>
              <h2>Book a New Ride</h2>
            </div>
            <div className="card">
              <form onSubmit={handleBookRide}>
                {/* Map Component */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <LocationMapPicker onLocationChange={handleLocationChange} />
                </div>

                {/* Distance auto-filled from map */}
                {distance && (
                  <div className="booking-summary">
                    <div className="summary-item">
                      <span className="summary-label">Distance:</span>
                      <span className="summary-value">{distance} km</span>
                    </div>
                    {mapData?.duration && (
                      <div className="summary-item">
                        <span className="summary-label">Estimated Time:</span>
                        <span className="summary-value">{mapData.duration} mins</span>
                      </div>
                    )}
                    <div className="summary-item">
                      <span className="summary-label">Estimated Fare:</span>
                      <span className="summary-value">₹{(parseFloat(distance) * 10).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!pickupLocation || !dropLocation || !distance}
                  >
                    Request Ride
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setActiveView('home');
                      setPickupLocation('');
                      setDropLocation('');
                      setDistance('');
                      setMapData(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MY RIDES VIEW */}
        {activeView === 'rides' && (
          <div className="rides-view">
            <div className="view-header">
              <button className="btn-back" onClick={() => setActiveView('home')}>← Back</button>
              <h2>My Rides</h2>
            </div>
        <div className="card">

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : rides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">—</div>
              <h3 className="empty-state-title">No rides yet</h3>
              <p className="empty-state-text">Book your first ride to get started</p>
            </div>
          ) : (
            <div>
              {rides.map((ride) => (
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ride-details">
                    <p><strong>From:</strong> {shortenAddress(ride.pickupLocation)}</p>
                    <p><strong>To:</strong> {shortenAddress(ride.dropLocation)}</p>
                    <p><strong>Distance:</strong> {ride.distance} km</p>
                    {ride.driverId && (
                      <>
                        <p><strong>Driver:</strong> {ride.driverId.name}</p>
                        <p><strong>Phone:</strong> {ride.driverId.phone}</p>
                      </>
                    )}
                  </div>

                  <div className="ride-fare">₹{parseFloat(ride.fare).toFixed(2)}</div>

                  {ride.status === 'completed' && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        color: ride.paymentReceived ? '#28a745' : '#dc3545',
                        fontWeight: '600'
                      }}>
                        Payment: {ride.paymentReceived ? 'Received' : 'Pending'}
                      </span>
                    </div>
                  )}

                  {ride.status === 'accepted' && (
                    <div className="ride-actions">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/ride/${ride._id}`)}
                      >
                        View Active Ride
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}

        {/* ACCOUNT VIEW */}
        {activeView === 'account' && (
          <div className="account-view">
            <div className="view-header">
              <button className="btn-back" onClick={() => setActiveView('home')}>← Back</button>
              <h2>Account Settings</h2>
            </div>
            <div className="card">
              <div className="account-section">
                <h3>Profile Information</h3>
                <div className="account-info-grid">
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{user?.name || 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Role:</span>
                    <span className="info-value">{user?.role}</span>
                  </div>
                </div>
              </div>

              <div className="account-section">
                <h3>Ride Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-number">{rides.filter(r => r.status === 'completed').length}</div>
                    <div className="stat-label">Completed Rides</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{rides.filter(r => r.status === 'cancelled').length}</div>
                    <div className="stat-label">Cancelled Rides</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{rides.length}</div>
                    <div className="stat-label">Total Rides</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={handleDeclinedRerequest}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Ride Cancelled</h3>
            <p style={{ marginTop: '16px', marginBottom: '24px', color: '#86868b' }}>
              The driver has cancelled your ride. Would you like to search for another driver?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleDeclinedRerequest}
              >
                No, Thanks
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleRerequestRide}
              >
                Yes, Find Another Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PassengerDashboard;
