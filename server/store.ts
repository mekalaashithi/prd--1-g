import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

export interface User {
  id: string;
  roleId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Visitor' | 'Member' | 'Community Admin' | 'Super Admin';
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
  members: string[]; // List of userIds
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  communityId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  requestedAt?: string;
  reviewedAt?: string;
}

export interface Membership {
  id: string;
  userId: string;
  communityId: string;
  joinedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  communityId: string;
  attendees: string[]; // List of userIds
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  communityId: string;
  createdBy: string; // userId
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

export interface DBStructure {
  users: User[];
  communities: Community[];
  joinRequests: JoinRequest[];
  memberships: Membership[];
  events: Event[];
  announcements: Announcement[];
  notifications: Notification[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

// Haversine formula to compute distance in km between two coordinate points
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(1));
}

export class DBStore {
  private data: DBStructure;

  constructor() {
    this.data = this.load();
  }

  private load(): DBStructure {
    let parsed: DBStructure | null = null;
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        parsed = JSON.parse(fileContent);
      }
    } catch (e) {
      console.error('Error reading database file, resetting to seed data:', e);
    }

    if (!parsed) {
      parsed = this.getSeedData();
    }

    // Ensure users have roleId
    if (parsed.users) {
      parsed.users.forEach(u => {
        if (!u.roleId) {
          u.roleId = this.generateRoleIdForUpgrade(u.role, parsed!.users);
        }
      });
    }

    // Ensure partnerships/memberships exist
    if (!parsed.memberships) {
      parsed.memberships = [];
    }

    // Ensure joinRequests status is uppercase and consistent
    if (parsed.joinRequests) {
      parsed.joinRequests.forEach((r: any) => {
        if (r.status === 'pending') r.status = 'Pending';
        if (r.status === 'approved') r.status = 'Approved';
        if (r.status === 'rejected') r.status = 'Rejected';
        if (!r.createdAt) {
          r.createdAt = r.requestedAt || new Date().toISOString();
        }
      });
    }

    // Populate memberships table from existing community members arrays if empty
    if (parsed.memberships.length === 0 && parsed.communities) {
      let idCounter = 1;
      parsed.communities.forEach(c => {
        c.members.forEach(mId => {
          parsed!.memberships.push({
            id: `member_ship_${idCounter++}`,
            userId: mId,
            communityId: c.id,
            joinedAt: c.createdAt || new Date().toISOString()
          });
        });
      });
    }

    this.saveData(parsed);
    return parsed;
  }

  // Generate unique sequential roleId
  public generateRoleId(role: 'Visitor' | 'Member' | 'Community Admin' | 'Super Admin'): string {
    return this.generateRoleIdForUpgrade(role, this.getUsers());
  }

  private generateRoleIdForUpgrade(role: 'Visitor' | 'Member' | 'Community Admin' | 'Super Admin', usersList: User[]): string {
    let prefix = 'V';
    if (role === 'Member') {
      prefix = 'M';
    } else if (role === 'Community Admin' || role === 'Super Admin') {
      prefix = 'A';
    }

    const numbers = usersList
      .filter(u => u.roleId && u.roleId.startsWith(prefix))
      .map(u => parseInt(u.roleId.slice(1), 10))
      .filter(num => !isNaN(num));

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const padded = String(nextNum).padStart(3, '0');
    return `${prefix}${padded}`;
  }

  private saveData(data: DBStructure) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database to disk:', e);
    }
  }

  public flush() {
    this.saveData(this.data);
  }

  // Get collections
  public getDB(): DBStructure {
    return this.data;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getCommunities(): Community[] {
    return this.data.communities;
  }

  public getJoinRequests(): JoinRequest[] {
    return this.data.joinRequests;
  }

  public getEvents(): Event[] {
    return this.data.events;
  }

  public getAnnouncements(): Announcement[] {
    return this.data.announcements;
  }

  public getNotifications(): Notification[] {
    return this.data.notifications;
  }

  // Common helpers
  public addNotification(userId: string, message: string, type: Notification['type'] = 'info', link?: string) {
    const notification: Notification = {
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      userId,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      link,
    };
    this.data.notifications.unshift(notification);
    this.flush();
    return notification;
  }

  private getSeedData(): DBStructure {
    const salt = bcrypt.genSaltSync(10);
    const commonHash = bcrypt.hashSync('password123', salt);

    // Initial users
    const users: User[] = [
      {
        id: 'user_super_admin',
        roleId: 'A001',
        name: 'Alex Johnson',
        email: 'admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Super Admin',
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', state: 'California' },
        interests: ['SaaS', 'Leadership', 'Events'],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_tech_admin',
        roleId: 'A002',
        name: 'Sarah Chen',
        email: 'tech_admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Community Admin',
        profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.7858, longitude: -122.4008, city: 'San Francisco', state: 'California' },
        interests: ['TypeScript', 'React', 'Open Source'],
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_sport_admin',
        roleId: 'A003',
        name: 'Marcus Rashford',
        email: 'sport_admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Community Admin',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.7349, longitude: -122.4394, city: 'San Francisco', state: 'California' },
        interests: ['Football', 'Fitness', 'Outdoors'],
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_member1',
        roleId: 'M001',
        name: 'David Kim',
        email: 'member1@communityhub.com',
        passwordHash: commonHash,
        role: 'Member',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.7649, longitude: -122.4294, city: 'San Francisco', state: 'California' },
        interests: ['Coding', 'Cycling', 'Startups'],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_member2',
        roleId: 'M002',
        name: 'Emma Watson',
        email: 'member2@communityhub.com',
        passwordHash: commonHash,
        role: 'Member',
        profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.8049, longitude: -122.4494, city: 'San Francisco', state: 'California' },
        interests: ['Art', 'Gaming', 'Reading'],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_visitor',
        roleId: 'V001',
        name: 'John Doe',
        email: 'visitor@communityhub.com',
        passwordHash: commonHash,
        role: 'Visitor',
        profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', state: 'California' },
        interests: ['Exploring'],
        createdAt: new Date().toISOString()
      }
    ];

    // Seed communities
    const communities: Community[] = [
      {
        id: 'comm_sf_devs',
        name: 'Silicon Valley Developers Circle',
        description: 'The ultimate meetup group for coders, designers, stack developers, and founders. We discuss React, TypeScript, AI agents, and host monthly Hackathons!',
        category: 'Tech',
        city: 'San Francisco',
        state: 'California',
        latitude: 37.7789,
        longitude: -122.4144,
        banner: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin', 'user_member1', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_vizag_tech',
        name: 'Visakhapatnam Tech Hub',
        description: 'Building the next Silicon Coast in Andhra Pradesh. A coalition of software developers, product managers, and UI/UX designers in Vizag collaborating on modern Tech, AI, and cloud SaaS.',
        category: 'Tech',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        latitude: 17.6868,
        longitude: 83.2185,
        banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 65 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_hyd_ai',
        name: 'Hyderabad AI Developers',
        description: 'A stellar community centering around Generative AI, Large Language Models, deep learning, NLP, and computer vision. Join our weekly hackathons in Gachibowli and Hitec City!',
        category: 'Tech',
        city: 'Hyderabad',
        state: 'Telangana',
        latitude: 17.3850,
        longitude: 78.4867,
        banner: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_london_fintech',
        name: 'London Fintech Innovators',
        description: 'A high-profile network for quantitative researchers, blockchain engineers, Web3 leaders, and premium startup founders based in City of London, UK.',
        category: 'Startup',
        city: 'London',
        state: 'Greater London',
        latitude: 51.5074,
        longitude: -0.1278,
        banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_super_admin',
        members: ['user_super_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_tokyo_gaming',
        name: 'Tokyo Anime & Tabletop Guild',
        description: 'A friendly community open to all gaming enthusiasts, tabletop fans, and manga artists in Tokyo, Japan. Weekly card game meetups and friendly boardgame fights!',
        category: 'Gaming',
        city: 'Tokyo',
        state: 'Tokyo Prefecture',
        latitude: 35.6762,
        longitude: 139.6503,
        banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_sport_admin',
        members: ['user_sport_admin'],
        status: 'active',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_gachibowli_sports',
        name: 'Gachibowli Sports Club',
        description: 'Organizing weekend football matches, cricket net practices, badminton tournaments, and evening jogging groups in Gachibowli, Hyderabad, Telangana.',
        category: 'Sports',
        city: 'Hyderabad',
        state: 'Telangana',
        latitude: 17.4435,
        longitude: 78.3489,
        banner: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_sport_admin',
        members: ['user_sport_admin', 'user_member1', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_amaravati_startup',
        name: 'Amaravati Startup Network',
        description: 'Connecting product builders, incubator heads, and local small business innovators in Vijayawada, Andhra Pradesh, India. Structured masterminds and venture guidance.',
        category: 'Startup',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        latitude: 16.5062,
        longitude: 80.6480,
        banner: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin'],
        status: 'active',
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Seed memberships based on seed communities
    const memberships: Membership[] = [];
    let membershipIdCounter = 1;
    communities.forEach(c => {
      c.members.forEach(mId => {
        memberships.push({
          id: `member_ship_${membershipIdCounter++}`,
          userId: mId,
          communityId: c.id,
          joinedAt: c.createdAt
        });
      });
    });

    // Seed events
    const events: Event[] = [
      {
        id: 'evt_hackathon_2026',
        title: 'SF Summer AI Hackathon',
        description: 'Join us for a 24-hour coding sprint dedicated to building practical, server-side agentic tools. Lunch, snacks, and prizes are supplied by our local sponsors.',
        eventDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Salesforce Tower, Floor 42, San Francisco, CA',
        communityId: 'comm_sf_devs',
        attendees: ['user_tech_admin', 'user_member1', 'user_member2'],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'evt_sports_day',
        title: 'Gachibowli Badminton Masters Tournament',
        description: 'Friendly knockout matches for individuals. Register early to book your court slots! Snacks and hydration drinks included.',
        eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Pullela Gopichand Badminton Academy, Gachibowli, Hyderabad',
        communityId: 'comm_gachibowli_sports',
        attendees: ['user_sport_admin', 'user_member1', 'user_member2'],
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Seed Announcements
    const announcements: Announcement[] = [
      {
        id: 'ann_welcome_devs',
        title: 'Welcome to Silicon Valley Developers Circle!',
        content: 'We are excited to kick off our Summer season of learning and building together. Be sure to check the active events section for upcoming meetups and hackathons!',
        communityId: 'comm_sf_devs',
        createdBy: 'user_tech_admin',
        isPinned: true,
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Seed notifications
    const notifications: Notification[] = [];

    // Seed join requests with correct capitalized statuses
    const joinRequests: JoinRequest[] = [
      {
        id: 'req_pending_1',
        userId: 'user_member1',
        communityId: 'comm_tokyo_gaming',
        status: 'Pending',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'req_pending_2',
        userId: 'user_member2',
        communityId: 'comm_amaravati_startup',
        status: 'Pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    return {
      users,
      communities,
      joinRequests,
      memberships,
      events,
      announcements,
      notifications,
    };
  }
}

export const dbStore = new DBStore();
