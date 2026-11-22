import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ridesAPI } from '../services/api';
import useSocket from '../hooks/useSocket';import { IoArrowBack, IoSendSharp, IoChatbubbleEllipsesOutline } from 'react-icons/io5';
function Chat() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const socket = useSocket(token);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Get current user ID in consistent format
  const getCurrentUserId = () => {
    return user?.id || user?._id;
  };

  useEffect(() => {
    loadRideDetails();
    loadMessages();
  }, [rideId]);

  useEffect(() => {
    if (!socket || !rideId) return;

    // Join the ride room
    socket.emit('join-ride-room', rideId);

    // Listen for new messages
    socket.on('ride-message-received', (data) => {
      if (data.rideId === rideId) {
        setMessages(prev => [...prev, {
          _id: Date.now().toString(),
          senderId: { _id: data.senderId, email: data.senderEmail, role: data.senderRole },
          message: data.message,
          timestamp: data.timestamp
        }]);
      }
    });

    return () => {
      socket.emit('leave-ride-room', rideId);
      socket.off('ride-message-received');
    };
  }, [socket, rideId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadRideDetails = async () => {
    try {
      const response = await ridesAPI.getRideDetails(rideId);
      setRide(response.data.ride);
    } catch (error) {
      setError('Failed to load ride details');
      console.error('Load ride error:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await ridesAPI.getRideMessages(rideId);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      const response = await ridesAPI.sendMessage(rideId, newMessage);
      
      // Add message to local state
      setMessages(prev => [...prev, response.data.chatMessage]);
      
      // Emit socket event
      if (socket && ride) {
        const receiverId = user.role === 'passenger' 
          ? ride.driverId?._id 
          : ride.passengerId?._id;
        
        socket.emit('ride-message', {
          rideId,
          message: newMessage,
          senderRole: user.role,
          senderEmail: user.email
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleBack = () => {
    if (user.role === 'passenger') {
      navigate('/passenger/dashboard');
    } else {
      navigate('/driver/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="back-icon" onClick={handleBack}>
          <IoArrowBack style={{ fontSize: '22px', verticalAlign: 'middle' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="chat-title">
            <IoChatbubbleEllipsesOutline style={{ marginRight: '8px', fontSize: '20px', verticalAlign: 'middle' }} />
            Chat
          </div>
          {ride && (
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {user.role === 'passenger' 
                ? `with ${ride.driverId?.name || ride.driverId?.email?.split('@')[0] || 'Driver'}`
                : `with ${ride.passengerId?.name || ride.passengerId?.email?.split('@')[0] || 'Passenger'}`
              }
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '10px 20px' }}>
          {error}
        </div>
      )}

      <div className="chat-container">
        <div className="chat-messages" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">—</div>
              <h3 className="empty-state-title">No messages yet</h3>
              <p className="empty-state-text">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              // Get sender ID from message
              const senderId = msg.senderId?._id || msg.senderId?.id;
              const currentUserId = getCurrentUserId();
              
              // Compare as strings to ensure match
              const isSent = senderId && currentUserId && String(senderId) === String(currentUserId);
              
              return (
                <div 
                  key={msg._id} 
                  className={`message ${isSent ? 'message-sent' : 'message-received'}`}
                >
                  {!isSent && (
                    <div className="message-sender">
                      {msg.senderId?.name || msg.senderId?.email?.split('@')[0] || msg.senderId.role}
                    </div>
                  )}
                  <div className="message-bubble">
                    {msg.message}
                  </div>
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button 
            type="submit" 
            className="btn-send" 
            disabled={!newMessage.trim()}
            title="Send message"
          >
            <IoSendSharp style={{ fontSize: '20px', verticalAlign: 'middle' }} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
