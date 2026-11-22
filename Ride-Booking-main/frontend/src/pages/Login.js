import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoCarSportOutline, IoShieldCheckmarkOutline, IoFlashOutline } from 'react-icons/io5';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
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
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Navigate based on user role
      if (result.user.role === 'passenger') {
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
            <h1>Welcome Back</h1>
            <p>Sign in to continue to Ride Booking</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
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
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
          </div>
        </div>

        <div className="auth-visual-section" style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)' }}>
          <div className="auth-visual-content">
            <div className="visual-brand">
              <IoCarSportOutline style={{ fontSize: '48px', color: 'white' }} />
              <h2>Ride Booking</h2>
            </div>
            <h3 className="visual-title">Your journey starts here</h3>
            <p className="visual-description">
              Join thousands of riders and drivers using our platform for seamless, safe, and reliable transportation.
            </p>
            <div className="visual-features">
              <div className="visual-feature-item">
                <IoFlashOutline style={{ color: 'white' }} />
                <span>Instant booking</span>
              </div>
              <div className="visual-feature-item">
                <IoShieldCheckmarkOutline style={{ color: 'white' }} />
                <span>Safe & secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
