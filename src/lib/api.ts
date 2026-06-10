const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('communityhub_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Network request failed');
  }
  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    return request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(payload: any) {
    return request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe() {
    return request<{ user: any }>('/auth/me');
  },

  async getUsersMe() {
    return request<any>('/users/me');
  },

  async getCurrentUser() {
    const res = await this.getMe();
    return res.user;
  },

  async updatePersistedRole(role: string) {
    return request<{ message: string; user: any }>('/users/role', {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  logout() {
    localStorage.removeItem('communityhub_token');
  },

  async updateProfile(payload: { name?: string; profileImage?: string; location?: any; interests?: string[] }) {
    return request<{ message: string; user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, newPassword: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  },

  // Communities (Explore & Profile)
  async getCommunities(filters: { search?: string; category?: string; lat?: number; lon?: number; radius?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.lat !== undefined) params.append('lat', filters.lat.toString());
    if (filters.lon !== undefined) params.append('lon', filters.lon.toString());
    if (filters.radius !== undefined) params.append('radius', filters.radius.toString());

    return request<{ communities: any[] }>(`/communities?${params.toString()}`);
  },

  async getCommunity(id: string) {
    return request<{ community: any; events: any[]; announcements: any[] }>(`/communities/${id}`);
  },

  async joinCommunity(id: string) {
    return request<{ message: string; request: any }>(`/communities/${id}/join`, {
      method: 'POST',
    });
  },

  async leaveCommunity(id: string) {
    return request<{ message: string }>(`/communities/${id}/leave`, {
      method: 'POST',
    });
  },

  async withdrawJoinRequest(requestId: string) {
    return request<{ message: string }>(`/join-requests/${requestId}/withdraw`, {
      method: 'POST',
    });
  },

  async applyAsVolunteer(eventId: string, payload: { motivation: string; skills: string; experience?: string }) {
    return request<{ message: string; volunteer: any }>(`/events/${eventId}/volunteer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async withdrawVolunteerRequest(eventId: string) {
    return request<{ message: string }>(`/events/${eventId}/volunteer`, {
      method: 'DELETE',
    });
  },

  async getMyVolunteers() {
    return request<{ volunteers: any[] }>('/volunteers/my');
  },

  async getAdminVolunteers(communityId: string) {
    return request<{ volunteers: any[] }>(`/admin/communities/${communityId}/volunteers`);
  },

  async updateVolunteerStatus(volunteerId: string, status: 'Approved' | 'Rejected') {
    return request<{ message: string; volunteer: any }>(`/admin/volunteers/${volunteerId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async getUserProfile(userId: string) {
    return request<{ profile: any }>(`/users/${userId}/profile`);
  },

  async getJoinRequests() {
    return request<{ requests: any[] }>('/join-requests');
  },

  // Events & RSVPs
  async getEvents(all = false) {
    return request<{ events: any[] }>(`/events?all=${all}`);
  },

  async getPublicEvents(filters?: { lat?: number; lon?: number; radius?: number }) {
    let query = '';
    if (filters) {
      const parts: string[] = [];
      if (filters.lat !== undefined) parts.push(`lat=${filters.lat}`);
      if (filters.lon !== undefined) parts.push(`lon=${filters.lon}`);
      if (filters.radius !== undefined) parts.push(`radius=${filters.radius}`);
      if (parts.length > 0) query = '?' + parts.join('&');
    }
    return request<{ events: any[] }>(`/events/public${query}`);
  },

  async rsvpEvent(eventId: string) {
    return request<{ message: string; attendeesCount: number }>(`/events/${eventId}/rsvp`, {
      method: 'POST',
    });
  },

  async unrsvpEvent(eventId: string) {
    return request<{ message: string; attendeesCount: number }>(`/events/${eventId}/unrsvp`, {
      method: 'POST',
    });
  },

  // Notifications
  async getNotifications() {
    return request<{ notifications: any[] }>('/notifications');
  },

  async readNotification(id: string) {
    return request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async readAllNotifications() {
    return request<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    });
  },

  // Admin Controls
  async createCommunity(payload: any) {
    return request<{ message: string; community: any }>('/admin/communities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCommunity(id: string, payload: any) {
    return request<{ message: string; community: any }>(`/admin/communities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteCommunity(id: string) {
    return request<{ message: string }>(`/admin/communities/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminRequests(communityId: string) {
    return request<{ requests: any[] }>(`/admin/communities/${communityId}/requests`);
  },

  async resolveRequest(requestId: string, status: 'approved' | 'rejected') {
    return request<{ message: string; request: any }>(`/admin/requests/${requestId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async getAdminPendingRequests() {
    return request<{ requests: any[] }>('/admin/requests');
  },

  async approveJoinRequest(id: string) {
    return request<{ message: string; request: any }>(`/admin/requests/${id}/approve`, {
      method: 'PUT',
    });
  },

  async rejectJoinRequest(id: string) {
    return request<{ message: string; request: any }>(`/admin/requests/${id}/reject`, {
      method: 'PUT',
    });
  },

  async submitJoinRequest(communityId: string) {
    return request<{ message: string; request: any }>('/join-request', {
      method: 'POST',
      body: JSON.stringify({ communityId }),
    });
  },

  async getAdminMembers(communityId: string) {
    return request<{ members: any[] }>(`/admin/communities/${communityId}/members`);
  },

  async removeMember(communityId: string, userId: string) {
    return request<{ message: string }>(`/admin/communities/${communityId}/members/${userId}/remove`, {
      method: 'POST',
    });
  },

  async banMember(communityId: string, userId: string) {
    return request<{ message: string }>(`/admin/communities/${communityId}/members/${userId}/ban`, {
      method: 'POST',
    });
  },

  async assignModerator(communityId: string, userId: string) {
    return request<{ message: string }>(`/admin/communities/${communityId}/members/${userId}/assign-moderator`, {
      method: 'POST',
    });
  },

  async createEvent(communityId: string, payload: any) {
    return request<{ message: string; event: any }>(`/admin/communities/${communityId}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEvent(eventId: string, payload: any) {
    return request<{ message: string; event: any }>(`/admin/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(eventId: string) {
    return request<{ message: string }>(`/admin/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  async createAnnouncement(communityId: string, payload: any) {
    return request<{ message: string; announcement: any }>(`/admin/communities/${communityId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAnnouncement(annId: string, payload: any) {
    return request<{ message: string; announcement: any }>(`/admin/announcements/${annId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAnnouncement(annId: string) {
    return request<{ message: string }>(`/admin/announcements/${annId}`, {
      method: 'DELETE',
    });
  },

  async getCommunityAnalytics(communityId: string) {
    return request<{ analytics: any }>(`/admin/communities/${communityId}/analytics`);
  },

  // Gamification & Attendance
  async getLeaderboard(range = 'All-Time') {
    return request<{ leaderboard: any[] }>(`/leaderboard?range=${range}`);
  },

  async getRecognition() {
    return request<{ recognition: any }>('/recognition');
  },

  async submitAttendance(eventId: string, attendance: Array<{ userId: string; status: 'Present' | 'Absent'; contributionType?: string }>) {
    return request<{ message: string }>(`/admin/events/${eventId}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ attendance }),
    });
  },

  // Super Admin Endpoints
  async getSuperUsers() {
    return request<{ users: any[] }>('/super-admin/users');
  },

  async changeUserRole(userId: string, role: string) {
    return request<{ message: string }>((`/super-admin/users/${userId}/change-role`), {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(userId: string) {
    return request<{ message: string }>(`/super-admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getSuperCommunities() {
    return request<{ communities: any[] }>('/super-admin/communities');
  },

  async toggleCommunityStatus(id: string) {
    return request<{ message: string; community: any }>(`/super-admin/communities/${id}/toggle-status`, {
      method: 'POST',
    });
  },

  async getSuperAnalytics() {
    return request<{ analytics: any }>('/super-admin/analytics');
  },
};
