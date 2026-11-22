import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoCarSportOutline, 
  IoFlashOutline, 
  IoShieldCheckmarkOutline, 
  IoChatbubbleEllipsesOutline, 
  IoArrowForward,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoWalletOutline
} from 'react-icons/io5';

function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="header-content">
            <div className="logo">
              <IoCarSportOutline style={{ fontSize: '28px', marginRight: '8px' }} />
              <span className="logo-text">Ride Booking</span>
            </div>
            <nav className="header-nav">
              <button className="btn-text" onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                Get Started
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content" style={{ transform: `translateY(${scrollY * 0.1}px)`, opacity: 1 - scrollY * 0.001 }}>
          <h1 className="hero-title animate-fade-in">
            Your ride, just a tap away
          </h1>
          <p className="hero-subtitle animate-fade-in-delay">
            Experience seamless rides with real-time tracking, instant booking, and professional drivers at your fingertips.
          </p>
          <div className="hero-buttons animate-fade-in-delay-2">
            <button className="btn btn-hero" onClick={() => navigate('/register')}>
              Start Riding
              <IoArrowForward style={{ marginLeft: '8px', fontSize: '20px', verticalAlign: 'middle' }} />
            </button>
            <button className="btn btn-hero-outline" onClick={() => navigate('/register')}>
              Become a Driver
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section animate-on-scroll">
        <div className="landing-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Happy Riders</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Professional Drivers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Cities Covered</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Service Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section animate-on-scroll">
        <div className="landing-container">
          <h2 className="section-title">How it works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Request a ride</h3>
              <p className="step-description">
                Enter your pickup and drop location. Our smart system calculates the fare instantly.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Get matched</h3>
              <p className="step-description">
                A nearby driver accepts your request. Track them in real-time as they arrive.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Enjoy your ride</h3>
              <p className="step-description">
                Ride safely to your destination. Chat with your driver and rate your experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section animate-on-scroll">
        <div className="landing-container">
          <h2 className="section-title">Why choose us</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <IoFlashOutline />
              </div>
              <h3 className="feature-title">Instant Booking</h3>
              <p className="feature-description">
                Book your ride in seconds with automatic fare calculation and real-time driver matching.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <IoShieldCheckmarkOutline />
              </div>
              <h3 className="feature-title">Safe & Secure</h3>
              <p className="feature-description">
                Your safety is our priority. All drivers are verified and tracked throughout your journey.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <IoChatbubbleEllipsesOutline />
              </div>
              <h3 className="feature-title">Real-time Updates</h3>
              <p className="feature-description">
                Stay connected with instant notifications and chat with your driver during the ride.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <IoCarSportOutline />
              </div>
              <h3 className="feature-title">Professional Drivers</h3>
              <p className="feature-description">
                Ride with confidence knowing our drivers are experienced, courteous, and reliable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section animate-on-scroll">
        <div className="landing-container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2 className="benefits-title">Built for your convenience</h2>
              <p className="benefits-subtitle">Everything you need for a perfect ride experience</p>
              <div className="benefits-list">
                <div className="benefit-item">
                  <IoCheckmarkCircleOutline className="benefit-icon" />
                  <span>Transparent pricing with no hidden fees</span>
                </div>
                <div className="benefit-item">
                  <IoTimeOutline className="benefit-icon" />
                  <span>Quick pickup times, average under 5 minutes</span>
                </div>
                <div className="benefit-item">
                  <IoWalletOutline className="benefit-icon" />
                  <span>Flexible payment options for your convenience</span>
                </div>
              </div>
            </div>
            <div className="benefits-visual">
              <div className="visual-card card-1">
                <IoCarSportOutline className="visual-icon" />
                <p>Real-time Tracking</p>
              </div>
              <div className="visual-card card-2">
                <IoChatbubbleEllipsesOutline className="visual-icon" />
                <p>In-app Chat</p>
              </div>
              <div className="visual-card card-3">
                <IoShieldCheckmarkOutline className="visual-icon" />
                <p>Safe Rides</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section animate-on-scroll">
        <div className="landing-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to ride?</h2>
            <p className="cta-subtitle">Join thousands of satisfied riders today</p>
            <button className="btn btn-cta" onClick={() => navigate('/register')}>
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-wrapper">
          <div className="footer-main">
            <div className="footer-brand-section">
              <div className="footer-logo">
                <IoCarSportOutline style={{ fontSize: '32px' }} />
                <span className="footer-brand-name">Ride Booking</span>
              </div>
              <p className="footer-tagline">
                Your journey, our priority
              </p>
            </div>
            
            <div className="footer-actions">
              <button className="footer-btn footer-btn-primary" onClick={() => navigate('/register')}>
                Get Started
              </button>
              <button className="footer-btn footer-btn-secondary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>
          
          <div className="footer-bottom-bar">
            <p className="footer-copyright">© 2026 Ride Booking. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
