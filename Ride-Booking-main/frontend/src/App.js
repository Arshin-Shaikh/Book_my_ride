import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import Chat from './pages/Chat';
import ActiveRide from './pages/ActiveRide';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'passenger' ? '/passenger/dashboard' : '/driver/dashboard'} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>        <Toaster 
          position="top-right"
          richColors
          expand={false}
          duration={5000}
        />        <div className="app">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes - Passenger */}
            <Route
              path="/passenger/dashboard"
              element={
                <ProtectedRoute allowedRole="passenger">
                  <PassengerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Driver */}
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute allowedRole="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Chat (Both roles) */}
            <Route
              path="/chat/:rideId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Active Ride (Both roles) */}
            <Route
              path="/ride/:rideId"
              element={
                <ProtectedRoute>
                  <ActiveRide />
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
