export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Visitor' | 'Member' | 'Community Admin';
  profileImage?: string;
  location?: Location;
  interests?: string[];
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: 'Tech' | 'College' | 'Startup' | 'Sports' | 'NGO' | 'Cultural' | 'Gaming';
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  banner: string;
  logo: string;
  adminId: string;
  members: string[];
  status: 'active' | 'suspended';
  createdAt: string;
  distance?: number; // Calculated dynamically on backend or frontend
  adminName?: string;
  adminProfileImage?: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  communityId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  communityName?: string;
  communityLogo?: string;
  userName?: string;
  userEmail?: string;
  userProfileImage?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  communityId: string;
  attendees: string[];
  createdAt: string;
  communityName?: string;
  communityLogo?: string;
  isRSVPed?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  communityId: string;
  createdBy: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface CommunityAnalytics {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalEvents: number;
  eventParticipation: Array<{
    eventName: string;
    rsvps: number;
    percentage: number;
  }>;
  growthStatistics: Array<{
    name: string;
    members: number;
  }>;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalCommunities: number;
  totalEvents: number;
  activeCommunities: number;
  growthMetrics: Array<{
    name: string;
    users: number;
    communities: number;
  }>;
  categoriesCount: Array<{
    name: string;
    count: number;
  }>;
}
