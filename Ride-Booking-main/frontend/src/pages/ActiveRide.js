import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ridesAPI } from '../services/api';
import useSocket from '../hooks/useSocket';
import { IoArrowBack, IoChatbubbleEllipsesOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoRefreshOutline, IoNavigateCircle, IoTimeOutline, IoCashOutline, IoLocationSharp, IoPersonCircle, IoCallSharp } from 'react-icons/io5';
import { toast } from 'sonner';
import RouteMapReadOnly from '../components/RouteMapReadOnly';

function ActiveRide() {
  const { rideId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(token);

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const isDriver = user?.role === 'driver';
  const isPassenger = user?.role === 'passenger';

  useEffect(() => {
    loadRideDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('ride-completed-notification', (completedRide) => {
      if (completedRide._id === rideId || completedRide.rideId === rideId) {
        setShowConfetti(true);
        loadRideDetails();
        setTimeout(() => {
          navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard');
        }, 3000);
      }
    });

    socket.on('ride-cancelled-by-driver', (data) => {
      if (data.rideId === rideId) {
        loadRideDetails();
      }
    });

    socket.on('new-chat-message', (data) => {
      console.log('New chat message received in ActiveRide:', data);
      console.log('Current rideId:', rideId, 'Message rideId:', data.rideId);
      if (data.rideId === rideId) {
        console.log('Setting hasUnreadMessages to true');
        setHasUnreadMessages(true);
        
        // Show toast notification with custom content
        const senderName = isDriver ? ride?.passengerId?.name : ride?.driverId?.name;
        const messagePreview = data.message && data.message.length > 60 ? data.message.substring(0, 60) + '...' : (data.message || 'New message');
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        toast(
          <div className="toast-notification-content" onClick={(e) => {
            e.stopPropagation();
            navigate(`/chat/${rideId}`);
            toast.dismiss();
          }}>
            <div className="toast-left-accent"></div>
            <div className="toast-icon-wrapper">
              <IoChatbubbleEllipsesOutline className="toast-icon" />
            </div>
            <div className="toast-text">
              <div className="toast-header">
                <span className="toast-sender">{senderName || 'User'}</span>
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
      socket.off('ride-completed-notification');
      socket.off('ride-cancelled-by-driver');
      socket.off('new-chat-message');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, rideId]);

  const loadRideDetails = async () => {
    try {
      const response = await ridesAPI.getRideDetails(rideId);
      setRide(response.data.ride);
      
      // Redirect if ride is not in accepted status
      if (response.data.ride.status === 'completed') {
        setTimeout(() => {
          navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard');
        }, 2000);
      } else if (response.data.ride.status === 'cancelled') {
        setError('This ride has been cancelled');
        setTimeout(() => {
          navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard');
        }, 3000);
      } else if (response.data.ride.status !== 'accepted') {
        navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard');
      }
    } catch (error) {
      console.error('Load ride error:', error);
      setError('Failed to load ride details');
      setTimeout(() => {
        navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    const paymentReceived = window.confirm('Has payment been received from the passenger?\n\nClick OK if payment is received.\nClick Cancel if payment is still pending.');
    
    if (!paymentReceived) {
      setError('Cannot complete ride - Payment is still pending. Please collect payment before completing the ride.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    
    try {
      const response = await ridesAPI.completeRide(rideId, paymentReceived);
      
      if (socket && response.data.ride) {
        socket.emit('ride-completed', {
          passengerId: ride.passengerId._id || ride.passengerId,
          ride: response.data.ride
        });
      }

      setShowConfetti(true);
      setSuccess('Ride completed successfully!');
      setTimeout(() => {
        navigate('/driver/dashboard');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to complete ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancelRide = async () => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this ride?');
    
    if (!confirmCancel) return;

    try {
      await ridesAPI.cancelRide(rideId);
      setSuccess('Ride cancelled successfully');
      setTimeout(() => {
        navigate('/driver/dashboard');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to cancel ride');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openChat = () => {
    setHasUnreadMessages(false);
    navigate(`/chat/${rideId}`);
  };

  const estimatedDuration = ride ? Math.ceil(ride.distance * 3) : 0; // ~3 min per km

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading ride details...</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="error-screen">
        <p>Ride not found</p>
      </div>
    );
  }

  return (
    <div className={`active-ride-page ${isDriver ? 'driver-theme' : 'passenger-theme'}`}>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-celebration">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="confetti-piece" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="ride-navbar">
        <button className="nav-back-btn" onClick={() => navigate(isDriver ? '/driver/dashboard' : '/passenger/dashboard')}>
          <IoArrowBack />
        </button>
        <h1 className="nav-title">Active Ride</h1>
        <div className="nav-status">
          <div className={`status-indicator ${ride.status}`}></div>
          <span>Live</span>
        </div>
      </nav>

      {/* Alerts */}
      {error && <div className="alert-banner error-banner">{error}</div>}
      {success && <div className="alert-banner success-banner">{success}</div>}

      {/* Route Map */}
      <div className="ride-content-wrapper">
        <RouteMapReadOnly 
          pickupLocation={ride.pickupLocation}
          dropLocation={ride.dropLocation}
          distance={ride.distance}
          pickupCoordinates={ride.pickupCoordinates}
          dropCoordinates={ride.dropCoordinates}
        />
      </div>

      {/* Main Content */}
      <div className="ride-content-wrapper">
        
        {/* Hero Section - Route Map Visual */}
        <div className="ride-hero-section">
          <div className="route-visual-container">
            <div className="route-endpoint pickup-point">
              <div className="endpoint-marker pickup-marker">
                <IoLocationSharp />
              </div>
              <div className="endpoint-info">
                <span className="endpoint-label">Pickup</span>
                <p className="endpoint-address">{ride.pickupLocation}</p>
              </div>
            </div>
            
            <div className="route-path">
              <div className="path-line"></div>
              <div className="path-pulse"></div>
            </div>
            
            <div className="route-endpoint drop-point">
              <div className="endpoint-marker drop-marker">
                <IoNavigateCircle />
              </div>
              <div className="endpoint-info">
                <span className="endpoint-label">Destination</span>
                <p className="endpoint-address">{ride.dropLocation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="ride-stats-grid">
          <div className="stat-card">
            <div className="stat-icon distance-icon">
              <IoNavigateCircle />
            </div>
            <div className="stat-content">
              <span className="stat-value">{ride.distance}</span>
              <span className="stat-unit">km</span>
            </div>
            <span className="stat-label">Distance</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon time-icon">
              <IoTimeOutline />
            </div>
            <div className="stat-content">
              <span className="stat-value">{estimatedDuration}</span>
              <span className="stat-unit">min</span>
            </div>
            <span className="stat-label">Duration</span>
          </div>

          <div className="stat-card highlight">
            <div className="stat-icon fare-icon">
              <IoCashOutline />
            </div>
            <div className="stat-content">
              <span className="stat-currency">₹</span>
              <span className="stat-value">{parseFloat(ride.fare).toFixed(2)}</span>
            </div>
            <span className="stat-label">Fare Amount</span>
          </div>
        </div>

        {/* Contact Card */}
        <div className="contact-card">
          <div className="contact-header">
            <h3>{isDriver ? 'Passenger Information' : 'Driver Information'}</h3>
          </div>
          <div className="contact-body">
            <div className="contact-avatar-wrapper">
              <div className="contact-avatar">
                <IoPersonCircle />
              </div>
              <div className="online-indicator"></div>
            </div>
            <div className="contact-info-wrapper">
              <h4 className="contact-name">
                {isDriver ? ride.passengerId?.name : ride.driverId?.name}
              </h4>
              <p className="contact-role">{isDriver ? 'Passenger' : 'Your Driver'}</p>
              <a href={`tel:${isDriver ? ride.passengerId?.phone : ride.driverId?.phone}`} className="contact-phone">
                <IoCallSharp />
                <span>{isDriver ? ride.passengerId?.phone : ride.driverId?.phone}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ride-actions">
          <button className="action-btn primary-action btn-with-notification" onClick={openChat}>
            <IoChatbubbleEllipsesOutline />
            <span>Message</span>
            {hasUnreadMessages && <span className={`notification-dot-chat ${isDriver ? 'passenger-dot' : 'driver-dot'}`}></span>}
          </button>

          {isDriver && (
            <>
              <button className="action-btn success-action" onClick={handleCompleteRide}>
                <IoCheckmarkCircleOutline />
                <span>Complete</span>
              </button>
              <button className="action-btn danger-action" onClick={handleCancelRide}>
                <IoCloseCircleOutline />
                <span>Cancel</span>
              </button>
            </>
          )}

          {isPassenger && (
            <button className="action-btn secondary-action" onClick={loadRideDetails}>
              <IoRefreshOutline />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActiveRide;
