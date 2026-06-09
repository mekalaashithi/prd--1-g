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
  membershipStatus?: 'Active' | 'Left';
  leftAt?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  eventId: string;
  date: string;
  status: 'Present' | 'Absent';
  contributionType?: 'Attendance' | 'Volunteer' | 'Contribution' | 'Organizer';
}

export interface Volunteer {
  id: string;
  userId: string;
  eventId: string;
  communityId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedAt: string;
  motivation?: string;
  skills?: string;
  experience?: string;
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
  eventType?: 'Meetup' | 'Workshop' | 'Sports Event' | 'Startup Networking Events' | 'Coding Sessions' | 'Career Guidance Sessions' | 'Webinars';
  maxParticipants?: number;
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
  attendance?: Attendance[];
  volunteers?: Volunteer[];
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

    parsed.memberships.forEach(m => {
      if (!m.membershipStatus) {
        m.membershipStatus = 'Active';
      }
    });

    // Ensure attendance log exists
    if (!parsed.attendance) {
      parsed.attendance = [];
    }

    // Ensure volunteers list exists
    if (!parsed.volunteers) {
      parsed.volunteers = [];
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
            joinedAt: c.createdAt || new Date().toISOString(),
            membershipStatus: 'Active'
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

  public getAttendance(): Attendance[] {
    if (!this.data.attendance) {
      this.data.attendance = [];
    }
    return this.data.attendance;
  }

  public getVolunteers(): Volunteer[] {
    if (!this.data.volunteers) {
      this.data.volunteers = [];
    }
    return this.data.volunteers;
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

    // Initial users with realistic Indian names and locations
    const users: User[] = [
      {
        id: 'user_super_admin',
        roleId: 'A001',
        name: 'Amit Patel',
        email: 'admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Super Admin',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
        interests: ['SaaS', 'Leadership', 'Events'],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_tech_admin',
        roleId: 'A002',
        name: 'Sai Kiran',
        email: 'tech_admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Community Admin',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 17.6868, longitude: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' },
        interests: ['TypeScript', 'React', 'Open Source'],
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_sport_admin',
        roleId: 'A003',
        name: 'Sandhya Rao',
        email: 'sport_admin@communityhub.com',
        passwordHash: commonHash,
        role: 'Community Admin',
        profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
        interests: ['Cricket', 'Fitness', 'Outdoors'],
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_member1',
        roleId: 'M001',
        name: 'Rahul Kumar',
        email: 'member1@communityhub.com',
        passwordHash: commonHash,
        role: 'Member',
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 13.6280, longitude: 79.4192, city: 'Tirupati', state: 'Andhra Pradesh' },
        interests: ['Coding', 'Cycling', 'Startups'],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'user_member2',
        roleId: 'M002',
        name: 'Priya Naidu',
        email: 'member2@communityhub.com',
        passwordHash: commonHash,
        role: 'Member',
        profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
        location: { latitude: 16.5062, longitude: 80.6480, city: 'Vijayawada', state: 'Andhra Pradesh' },
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
        location: { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
        interests: ['Exploring'],
        createdAt: new Date().toISOString()
      }
    ];

    // Seed communities fully localized in Andhra Pradesh & Telangana
    const communities: Community[] = [
      {
        id: 'comm_hyd_devs',
        name: 'Hyderabad Developers Circle',
        description: 'The ultimate meetup group for coders, designers, stack developers, and founders in Hyderabad. We discuss React, TypeScript, AI agents, and host monthly Hackathons at T-Hub Phase 2!',
        category: 'Tech',
        city: 'Hyderabad',
        state: 'Telangana',
        latitude: 17.3850,
        longitude: 78.4867,
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
        id: 'comm_tirupati_smart',
        name: 'Tirupati Smart Agriculture Squad',
        description: 'An innovation collective at SV Agricultural College, Tirupati. Leveraging IoT, sensors, satellite imagery, and drone analytics to advance yield models for local farmers.',
        category: 'Startup',
        city: 'Tirupati',
        state: 'Andhra Pradesh',
        latitude: 13.6280,
        longitude: 79.4192,
        banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_super_admin',
        members: ['user_super_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_warangal_coding',
        name: 'Warangal Kotlin Guild',
        description: 'A friendly community open to all Android and Kotlin developers in Warangal. Regular coding jams and tech talks at NIT Warangal, incubating awesome apps!',
        category: 'Gaming',
        city: 'Warangal',
        state: 'Telangana',
        latitude: 17.9689,
        longitude: 79.5941,
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
        description: 'Organizing weekend cricket tournaments, football leagues, badminton matches, and active morning runs around Gachibowli Stadium and botanical gardens.',
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
        description: 'Connecting product builders, incubator heads, and local small business innovators in Vijayawada and Guntur, Andhra Pradesh, India. Structured masterminds and mentorship panels.',
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
      },
      {
        id: 'comm_nellore_green',
        name: 'Nellore Eco Volunteers',
        description: 'Dedicated NGO community in Nellore conducting Pennar river cleanups, local flora preservation, and waste management campaigns to build a green Nellore.',
        category: 'NGO',
        city: 'Nellore',
        state: 'Andhra Pradesh',
        latitude: 14.4426,
        longitude: 79.9865,
        banner: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_super_admin',
        members: ['user_super_admin', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_guntur_code',
        name: 'Guntur Coding Hackers',
        description: 'The ultimate algorithms study guild in Guntur focusing on advanced data structures, competitive coding, system architecture, and local student masterclasses.',
        category: 'Tech',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        latitude: 16.3067,
        longitude: 80.4365,
        banner: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_kurnool_trail',
        name: 'Kurnool Trekking & Outdoors',
        description: 'Exploring the beauty of Kurnool district from Orvakal Rock Gardens to Nallamala forests. Weekly hiking trails, outdoor camping, and fitness runs.',
        category: 'Sports',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        latitude: 15.8281,
        longitude: 78.0373,
        banner: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_sport_admin',
        members: ['user_sport_admin', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_anantapur_college',
        name: 'Anantapur College Innovation Club',
        description: 'An expansive college community for young engineering and agricultural student builders in Anantapur to build prototypes, share notes, and run local hackathons.',
        category: 'College',
        city: 'Anantapur',
        state: 'Andhra Pradesh',
        latitude: 14.6819,
        longitude: 77.6006,
        banner: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_super_admin',
        members: ['user_super_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_kakinada_port',
        name: 'Kakinada Startup Network',
        description: 'Inspiring regional entrepreneurship across Kakinada port city. Mentoring startups, SaaS builders, and local logistics solutions providers with veteran advisors.',
        category: 'Startup',
        city: 'Kakinada',
        state: 'Andhra Pradesh',
        latitude: 16.9891,
        longitude: 82.2439,
        banner: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_tech_admin',
        members: ['user_tech_admin', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_vizag_culture',
        name: 'Vizag Beachside Music Guild',
        description: 'Celebrating classical Carnatic music, native Andhra folk tunes, sand art, and beachside acoustic performances on Rama Krishna beach road in Vizag.',
        category: 'Cultural',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        latitude: 17.7888,
        longitude: 83.3740,
        banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_super_admin',
        members: ['user_super_admin', 'user_member1', 'user_member2'],
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comm_hyd_gamers',
        name: 'Hitec City Esports Arena',
        description: 'The gaming league hub in Hyderabad for Valorant, Dota, and BGMI players. Weekly competitive LAN tournaments, gaming stream viewing parties, and esports network.',
        category: 'Gaming',
        city: 'Hyderabad',
        state: 'Telangana',
        latitude: 17.3850,
        longitude: 78.4867,
        banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
        logo: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=150',
        adminId: 'user_sport_admin',
        members: ['user_sport_admin', 'user_member1'],
        status: 'active',
        createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString()
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
          joinedAt: c.createdAt,
          membershipStatus: 'Active'
        });
      });
    });

    // Seed events localized in Andhra Pradesh & Telangana
    const events: Event[] = [
      {
        id: 'evt_tech_meetup_1',
        title: 'Hyderabad Generative AI Symposium',
        description: 'Join us at T-Hub Phase 2, Gachibowli, for an immersive series of masterclasses on building multi-agent LLM systems with langchain and typescript.',
        eventDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        location: 'T-Hub Phase 2, Gachibowli, Hyderabad, Telangana',
        communityId: 'comm_hyd_devs',
        attendees: ['user_tech_admin', 'user_member1', 'user_member2'],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: 'Workshop',
        maxParticipants: 150
      },
      {
        id: 'evt_sports_day',
        title: 'Gachibowli Badminton Champions Cup',
        description: 'Weekend singles knock-out tournament. Register early to book your slots! Dynamic coaching panel and hydration drinks sponsored locally.',
        eventDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        location: 'Pullela Gopichand Badminton Academy, Gachibowli, Hyderabad',
        communityId: 'comm_gachibowli_sports',
        attendees: ['user_sport_admin', 'user_member1', 'user_member2'],
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: 'Sports Event',
        maxParticipants: 32
      },
      {
        id: 'evt_coding_marathon',
        title: 'Warangal Kotlin Code Jams',
        description: 'Bring your laptop for a 3-hour collaborative sprint building light Android apps in Jetpack Compose.',
        eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days in future
        location: 'Department of CSE, NIT Warangal, Telangana',
        communityId: 'comm_warangal_coding',
        attendees: ['user_sport_admin', 'user_member1'],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: 'Coding Sessions',
        maxParticipants: 80
      },
      {
        id: 'evt_nellore_green_1',
        title: 'Pennar Riverfront Cleansing Drive',
        description: 'Join hands for our mega eco-conservation volunteering project along the banks of Pennar River, Nellore. Bags and gloves provided.',
        eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Pennar Riverfront Walkway, Nellore, Andhra Pradesh',
        communityId: 'comm_nellore_green',
        attendees: ['user_super_admin', 'user_member2'],
        createdAt: new Date().toISOString(),
        eventType: 'Meetup',
        maxParticipants: 100
      },
      {
        id: 'evt_guntur_code_1',
        title: 'Guntur Graph Algorithms Hack',
        description: 'Dive deep into Graph Traversal, shortest path problems, and recursive optimization techniques with core CSE faculty guidelines.',
        eventDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Guntur Engineering Hub Campus Hall B, Guntur',
        communityId: 'comm_guntur_code',
        attendees: ['user_tech_admin', 'user_member1'],
        createdAt: new Date().toISOString(),
        eventType: 'Workshop',
        maxParticipants: 60
      },
      {
        id: 'evt_kurnool_trail_1',
        title: 'Orvakal Rock Garden Trek',
        description: 'A moderate early morning 5K trek through the spectacular mineral rock trails of Orvakal. Bring hiking boots and energy drinks.',
        eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Orvakal Rock Gardens, Kurnool Outskirts, Kurnool',
        communityId: 'comm_kurnool_trail',
        attendees: ['user_sport_admin', 'user_member2'],
        createdAt: new Date().toISOString(),
        eventType: 'Sports Event',
        maxParticipants: 40
      },
      {
        id: 'evt_anantapur_college_1',
        title: 'Anantapur Student Hack-A-Thon',
        description: '24-hour non-stop building sprint for local agricultural technology devices and IoT automation systems. Amazing awards and jury panels.',
        eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'JNTU Anantapur Seminar Auditorium, Anantapur',
        communityId: 'comm_anantapur_college',
        attendees: ['user_super_admin', 'user_member1'],
        createdAt: new Date().toISOString(),
        eventType: 'Coding Sessions',
        maxParticipants: 120
      },
      {
        id: 'evt_kakinada_port_1',
        title: 'Kakinada Maritime Tech Pitch Night',
        description: 'An open microphone startup pitch night for logistics platforms, import/export networks, and e-commerce models.',
        eventDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Kakinada Port Business Center Conference Room, Kakinada',
        communityId: 'comm_kakinada_port',
        attendees: ['user_tech_admin', 'user_member2'],
        createdAt: new Date().toISOString(),
        eventType: 'Startup Networking Events',
        maxParticipants: 50
      },
      {
        id: 'evt_vizag_culture_1',
        title: 'RK Beach Sand & Unplugged Folk Harmony',
        description: 'Unwind at the beachside with traditional folk music ensembles and live sand sculpture workshops under the cooling moon.',
        eventDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'RK Beach Open Air Auditorium Stage, Visakhapatnam',
        communityId: 'comm_vizag_culture',
        attendees: ['user_super_admin', 'user_member1', 'user_member2'],
        createdAt: new Date().toISOString(),
        eventType: 'Meetup',
        maxParticipants: 300
      },
      {
        id: 'evt_hyd_gamers_1',
        title: 'BGMI Cyber Championship LAN',
        description: 'A flagship local LAN setup tournament for mobile gaming teams. 4K high refresh rate monitors and giant streaming setup.',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Cyber Arena Lounge first floor, Hitec City, Hyderabad',
        communityId: 'comm_hyd_gamers',
        attendees: ['user_sport_admin', 'user_member1'],
        createdAt: new Date().toISOString(),
        eventType: 'Meetup',
        maxParticipants: 64
      }
    ];

    // Seed Announcements
    const announcements: Announcement[] = [
      {
        id: 'ann_welcome_devs',
        title: 'Welcome to Hyderabad Developers Circle!',
        content: 'We are thrilled to launch our group. Our tech talks will center on cutting edge web dev, server integrations, and AI. Keep an eye on our T-Hub schedules!',
        communityId: 'comm_hyd_devs',
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
        communityId: 'comm_warangal_coding',
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

    // Seed robust Attendance records to naturally populate the Leaderboard / Recognition Wall
    const attendance: Attendance[] = [
      // Amit Patel attended/organized multiple events
      { id: 'att_1', userId: 'user_super_admin', eventId: 'evt_tech_meetup_1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Organizer' },
      
      // Sai Kiran (tech admin) organized and attended
      { id: 'att_2', userId: 'user_tech_admin', eventId: 'evt_tech_meetup_1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Organizer' },
      
      // Rahul Kumar: member1 has great attendance
      { id: 'att_3', userId: 'user_member1', eventId: 'evt_tech_meetup_1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Volunteer' },
      { id: 'att_4', userId: 'user_member1', eventId: 'evt_sports_day', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Attendance' },
      
      // Priya Naidu: member2 has great attendance
      { id: 'att_5', userId: 'user_member2', eventId: 'evt_tech_meetup_1', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Attendance' },
      { id: 'att_6', userId: 'user_member2', eventId: 'evt_sports_day', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Present', contributionType: 'Attendance' }
    ];

    return {
      users,
      communities,
      joinRequests,
      memberships,
      events,
      announcements,
      notifications,
      attendance,
    };
  }
}

export const dbStore = new DBStore();
