import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoCarSportOutline, IoShieldCheckmarkOutline, IoFlashOutline } from 'react-icons/io5';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'passenger') {
        navigate('/passenger/dashboard', { replace: true });
      } else {
        navigate('/driver/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(name, email, phone, password, role);
    
    if (result.success) {
      // Navigate based on user role
      if (role === 'passenger') {
        navigate('/passenger/dashboard');
      } else {
        navigate('/driver/dashboard');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-split-layout">
        <div className="auth-form-section">
          <div className="auth-card">
            <h1>Create Account</h1>
            <p>Sign up to get started with Ride Booking</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </div>

          <div className="form-group">
            <label>Register as</label>
            <select 
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
          </div>
        </div>

        <div className="auth-visual-section" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)' }}>
          <div className="auth-visual-content">
            <div className="visual-brand">
              <IoCarSportOutline style={{ fontSize: '48px', color: 'white' }} />
              <h2>Ride Booking</h2>
            </div>
            <h3 className="visual-title">Start your journey today</h3>
            <p className="visual-description">
              Whether you're looking for a ride or want to drive, join our platform and experience the future of transportation.
            </p>
            <div className="visual-features">
              <div className="visual-feature-item">
                <IoFlashOutline style={{ color: 'white' }} />
                <span>Quick & easy signup</span>
              </div>
              <div className="visual-feature-item">
                <IoShieldCheckmarkOutline style={{ color: 'white' }} />
                <span>Verified accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
