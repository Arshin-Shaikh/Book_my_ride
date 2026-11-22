import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateAvailability: (isAvailable) => api.put('/auth/availability', { isAvailable })
};

// Rides API
export const ridesAPI = {
  createRide: (data) => api.post('/rides/create', data),
  getAvailableDrivers: () => api.get('/rides/drivers/available'),
  getPendingRides: () => api.get('/rides/pending'),
  acceptRide: (rideId) => api.put(`/rides/${rideId}/accept`),
  rejectRide: (rideId) => api.put(`/rides/${rideId}/reject`),
  completeRide: (rideId, paymentReceived) => api.put(`/rides/${rideId}/complete`, { paymentReceived }),
  cancelRide: (rideId) => api.put(`/rides/${rideId}/cancel`),
  cancelRideByPassenger: (rideId) => api.put(`/rides/${rideId}/cancel-passenger`),
  rerequestRide: (rideId) => api.put(`/rides/${rideId}/rerequest`),
  getUserRides: () => api.get('/rides/my-rides'),
  getRideDetails: (rideId) => api.get(`/rides/${rideId}`),
  sendMessage: (rideId, message) => api.post(`/rides/${rideId}/messages`, { message }),
  getRideMessages: (rideId) => api.get(`/rides/${rideId}/messages`)
};

export default api;
