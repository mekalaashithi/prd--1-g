import axios from 'axios';

// Resolve Backend Server APIs address
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto Inject JWT Bearer Sessions token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('community_nexus_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (err) => {
  return Promise.reject(err);
});

export const api = {
  // === AUTHENTICATION API ===
  async login(email, password) {
    const resp = await client.post('/auth/login', { email, password });
    return resp.data;
  },

  async register(payload) {
    const resp = await client.post('/auth/register', payload);
    return resp.data;
  },

  async getCurrentUser() {
    const resp = await client.get('/auth/me');
    return resp.data;
  },

  async updateProfile(payload) {
    const resp = await client.put('/auth/profile', payload);
    return resp.data;
  },

  async changeUserRole(role) {
    const resp = await client.put('/auth/role', { role });
    return resp.data;
  },

  // === VISITOR DISCOVERY API ===
  async getCommunities(filters = {}) {
    const resp = await client.get('/communities', { params: filters });
    return resp.data;
  },

  async getCommunity(id) {
    const resp = await client.get(`/communities/${id}`);
    return resp.data;
  },

  // === MEMBER CONTROLS API ===
  async joinCommunity(communityId) {
    const resp = await client.post(`/communities/${communityId}/join`);
    return resp.data;
  },

  async leaveCommunity(communityId) {
    const resp = await client.post(`/communities/${communityId}/leave`);
    return resp.data;
  },

  async rsvpEvent(eventId) {
    const resp = await client.post(`/events/${eventId}/rsvp`);
    return resp.data;
  },

  async unrsvpEvent(eventId) {
    const resp = await client.delete(`/events/${eventId}/rsvp`);
    return resp.data;
  },

  async applyAsVolunteer(eventId, details) {
    const resp = await client.post(`/events/${eventId}/volunteer`, details);
    return resp.data;
  },

  async withdrawVolunteerRequest(eventId) {
    const resp = await client.delete(`/events/${eventId}/volunteer`);
    return resp.data;
  },

  async getNotifications() {
    const resp = await client.get('/notifications');
    return resp.data;
  },

  async readNotification(id) {
    const resp = await client.post(`/notifications/${id}/read`);
    return resp.data;
  },

  async readAllNotifications() {
    const resp = await client.post('/notifications/read-all');
    return resp.data;
  },

  async getAchievements() {
    const resp = await client.get('/achievements');
    return resp.data;
  },

  // === ADMIN CONTROLS API ===
  async createCommunity(payload) {
    const resp = await client.post('/admin/communities', payload);
    return resp.data;
  },

  async getAdminRequests(communityId) {
    const resp = await client.get(`/admin/communities/${communityId}/requests`);
    return resp.data;
  },

  async resolveJoinRequest(requestId, status) {
    const resp = await client.post(`/admin/requests/${requestId}/resolve`, { status });
    return resp.data;
  },

  async getAdminVolunteers(communityId) {
    const resp = await client.get(`/admin/communities/${communityId}/volunteers`);
    return resp.data;
  },

  async resolveVolunteerRequest(requestId, status) {
    const resp = await client.post(`/admin/volunteers/${requestId}/resolve`, { status });
    return resp.data;
  },

  async createEvent(communityId, payload) {
    const resp = await client.post(`/admin/communities/${communityId}/events`, payload);
    return resp.data;
  },

  async broadcastAnnouncement(communityId, payload) {
    const resp = await client.post(`/admin/communities/${communityId}/announcements`, payload);
    return resp.data;
  }
};
