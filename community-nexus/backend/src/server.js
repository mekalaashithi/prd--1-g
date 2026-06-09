import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Load models
import User from './models/User.js';
import Community from './models/Community.js';
import Event from './models/Event.js';
import VolunteerRequest from './models/VolunteerRequest.js';
import JoinRequest from './models/JoinRequest.js';
import Notification from './models/Notification.js';
import Achievement from './models/Achievement.js';

// Load middleware
import { authenticateToken, requireRole } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/community_nexus';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas.'))
  .catch((err) => console.error('Failed to establish connection to MongoDB Cluster:', err));

// --- HELPER TO GENERATE UNIQUE SECURE ALPHANUMERIC IDS WITH ROLE PREFIXES ---
const generateId = (prefix) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${result}`;
};

// --- HELPER FOR IN-APP NOTIFICATIONS & ACHIEVEMENT CHECKS ---
const createNotification = async (userId, communityId, message, type) => {
  try {
    const notif = new Notification({
      id: generateId('N'),
      userId,
      communityId,
      message,
      type
    });
    await notif.save();
    return notif;
  } catch (err) {
    console.error('Notification dispatch error:', err);
  }
};

const checkAndAwardAchievements = async (userId) => {
  try {
    // Collect stats
    const joinReqsCount = await JoinRequest.countDocuments({ userId, status: 'Approved' });
    const volunteerCount = await VolunteerRequest.countDocuments({ userId, status: 'Approved' });
    
    const achievements = [];

    // Rule 1: First Community Joined
    if (joinReqsCount >= 1) {
      const existing = await Achievement.findOne({ userId, badgeType: 'Core Joiner' });
      if (!existing) {
        achievements.push(new Achievement({
          id: generateId('ACH'),
          userId,
          badgeType: 'Core Joiner',
          title: 'Foundational Circular Builder',
          description: 'Awarded for taking steps to join your very first hyper-local community circle.'
        }));
        await createNotification(userId, '', '🏆 Achievement Unlocked: Foundational Circular Builder!', 'Badge');
      }
    }

    // Rule 2: Active Volunteer status
    if (volunteerCount >= 1) {
      const existing = await Achievement.findOne({ userId, badgeType: 'Volunteer Star' });
      if (!existing) {
        achievements.push(new Achievement({
          id: generateId('ACH'),
          userId,
          badgeType: 'Volunteer Star',
          title: 'Leadership Altruism Emblem',
          description: 'Recognized for submitting certified local service assistance to approved initiatives.'
        }));
        await createNotification(userId, '', '🏆 Achievement Unlocked: Leadership Altruism Emblem!', 'Badge');
      }
    }

    if (achievements.length > 0) {
      await Achievement.insertMany(achievements);
    }
  } catch (err) {
    console.error('Achievement review failure:', err);
  }
};

// ==================== AUTHENTICATION MODULE ====================

// SIGNUP
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, location, interests } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User profile with this email registry already exists.' });
    }

    // Salt password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Prefix user ID according to selected role
    let prefix = 'M'; // Default Member
    if (role === 'Visitor') prefix = 'V';
    if (role === 'Community Admin') prefix = 'A';

    const userId = generateId(prefix);

    const newUser = new User({
      id: userId,
      name,
      email,
      passwordHash,
      role: role || 'Member',
      location: location || { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
      interests: interests || []
    });

    await newUser.save();

    // Create session token
    const tokenSecret = process.env.JWT_SECRET || 'super_secret_cryptographic_nexus_key_987654321';
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email },
      tokenSecret,
      { expiresIn: '30d' }
    );

    // Bootstrap initial welcoming notification
    await createNotification(newUser.id, '', `Welcome to Community Nexus, ${newUser.name}! Explore communities and nearby events.`, 'Announcement');

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const userObj = await User.findOne({ email });
    if (!userObj) {
      return res.status(404).json({ message: 'Account not found. Verify email values.' });
    }

    const isMatch = await bcrypt.compare(password, userObj.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Authentication failed. Incorrect password credentials.' });
    }

    const tokenSecret = process.env.JWT_SECRET || 'super_secret_cryptographic_nexus_key_987654321';
    const token = jwt.sign(
      { id: userObj.id, role: userObj.role, email: userObj.email },
      tokenSecret,
      { expiresIn: '3d' }
    );

    res.json({
      token,
      user: userObj
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET PROFILE INFO
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userProfile = await User.findOne({ id: req.user.id });
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile ledger missing.' });
    }
    res.json(userProfile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE PROFILE
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, profileImage, location, interests } = req.body;
    const userProfile = await User.findOne({ id: req.user.id });
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile ledger missing.' });
    }

    if (name) userProfile.name = name;
    if (profileImage !== undefined) userProfile.profileImage = profileImage;
    if (location) userProfile.location = location;
    if (interests) userProfile.interests = interests;

    await userProfile.save();
    res.json(userProfile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SWITCH ROLE
app.put('/api/auth/role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Visitor', 'Member', 'Community Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid target permission node.' });
    }

    const userProfile = await User.findOne({ id: req.user.id });
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile ledger missing.' });
    }

    userProfile.role = role;
    await userProfile.save();

    res.json({ message: `Role permission swapped to ${role} successfully.`, user: userProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==================== VISITOR & DISCOVERY MODULE ====================

// GET COMMUNITIES
app.get('/api/communities', async (req, res) => {
  try {
    const { search, category, city } = req.query;
    let query = { status: 'active' };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    const communities = await Community.find(query);
    res.json({ communities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET DETAILED SPECIFIC COMMUNITY PAGE
app.get('/api/communities/:id', async (req, res) => {
  try {
    const comm = await Community.findOne({ id: req.params.id });
    if (!comm) {
      return res.status(404).json({ message: 'Community board missing.' });
    }

    const events = await Event.find({ communityId: comm.id });
    
    // Enrich events with approved volunteers
    const vols = await VolunteerRequest.find({ communityId: comm.id, status: 'Approved' });
    const eventsWithVols = await Promise.all(events.map(async (e) => {
      const eVols = vols.filter(v => v.eventId === e.id);
      const enrichedVols = await Promise.all(eVols.map(async (v) => {
        const u = await User.findOne({ id: v.userId });
        return {
          id: v.id,
          userId: v.userId,
          userName: u ? u.name : 'Unknown User',
          userProfileImage: u ? u.profileImage : undefined,
          status: v.status
        };
      }));
      return {
        ...e.toObject(),
        volunteers: enrichedVols
      };
    }));

    const adminUser = await User.findOne({ id: comm.adminId });

    res.json({
      community: {
        ...comm.toObject(),
        adminName: adminUser ? adminUser.name : 'Unknown Admin',
        adminProfileImage: adminUser ? adminUser.profileImage : undefined
      },
      events: eventsWithVols,
      announcements: [] // announcements array
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==================== MEMBER CONTROLS MODULE ====================

// JOIN COMMUNITY REQUEST
app.post('/api/communities/:id/join', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    const commId = req.params.id;
    const comm = await Community.findOne({ id: commId });
    if (!comm) {
      return res.status(404).json({ message: 'Community profile ledger not found.' });
    }

    // Check if membership or request exists
    if (comm.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already an approved circular member of this group.' });
    }

    const existingReq = await JoinRequest.findOne({ userId: req.user.id, communityId: commId });
    if (existingReq) {
      return res.status(400).json({ message: `Your request index is already logged as: ${existingReq.status}.` });
    }

    const newReq = new JoinRequest({
      id: generateId('JR'),
      userId: req.user.id,
      communityId: commId,
      status: 'Pending'
    });

    await newReq.save();

    // Alert admin
    await createNotification(
      comm.adminId,
      commId,
      `New join request received for ${comm.name}. Review applicant credentials.`,
      'Approval'
    );

    res.json({ status: 'Pending', message: 'Join request logged successfully. Review pending admin approval.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LEAVE COMMUNITY
app.post('/api/communities/:id/leave', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    const commId = req.params.id;
    const comm = await Community.findOne({ id: commId });
    if (!comm) {
      return res.status(404).json({ message: 'Community circle record missing.' });
    }

    comm.members = comm.members.filter(mId => mId !== req.user.id);
    await comm.save();

    // Clear any registries or join documents
    await JoinRequest.deleteMany({ userId: req.user.id, communityId: commId });

    res.json({ message: 'Successfully withdrawn from community circle.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REGISTER FOR MEETUP EVENT (RSVP)
app.post('/api/events/:id/rsvp', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    const evtId = req.params.id;
    const evt = await Event.findOne({ id: evtId });
    if (!evt) {
      return res.status(404).json({ message: 'Event schedule index missing.' });
    }

    // Verify community membership
    const comm = await Community.findOne({ id: evt.communityId });
    if (!comm || !comm.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You must be an approved community circle member to RSVP.' });
    }

    if (evt.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already registered to attend this meetup.' });
    }

    if (evt.attendees.length >= (evt.maxParticipants || 50)) {
      return res.status(400).json({ message: 'Meetup allocation limit exceeded. Attendance capacity is full.' });
    }

    evt.attendees.push(req.user.id);
    await evt.save();

    await createNotification(
      req.user.id,
      evt.communityId,
      `RSVP confirmed for meetup: "${evt.title}". We look forward to meeting you!`,
      'Event'
    );

    // Keep statistics
    await checkAndAwardAchievements(req.user.id);

    res.json({ message: 'Event RSVP registration submitted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CANCEL REGISTERED RSVP
app.delete('/api/events/:id/rsvp', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    const evtId = req.params.id;
    const evt = await Event.findOne({ id: evtId });
    if (!evt) {
      return res.status(404).json({ message: 'Event schedule ledger missing.' });
    }

    evt.attendees = evt.attendees.filter(id => id !== req.user.id);
    await evt.save();

    res.json({ message: 'Event RSVP booking has been canceled.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SUBMIT VOLUNTEER REQUESTS
app.post('/api/events/:id/volunteer', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    const evtId = req.params.id;
    const { motivation, skills, experience } = req.body;

    const evt = await Event.findOne({ id: evtId });
    if (!evt) {
      return res.status(404).json({ message: 'Meetup event index not found.' });
    }

    const comm = await Community.findOne({ id: evt.communityId });
    if (!comm || !comm.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You must be an active circle member to offer volunteer assistance' });
    }

    const existing = await VolunteerRequest.findOne({ userId: req.user.id, eventId: evtId });
    if (existing) {
      return res.status(400).json({ message: `Volunteer logs index details are already: ${existing.status}` });
    }

    const newVol = new VolunteerRequest({
      id: generateId('VOL'),
      userId: req.user.id,
      eventId: evtId,
      communityId: evt.communityId,
      status: 'Pending',
      motivation,
      skills,
      experience: experience || ''
    });

    await newVol.save();

    // Warn Admin
    await createNotification(
      comm.adminId,
      comm.id,
      `New volunteer offer submitted for meetup: "${evt.title}" by ${req.user.email}`,
      'Volunteer'
    );

    res.json({ message: 'Volunteer support registry submitted for clearance.', request: newVol });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// WITHDRAW VOLUNTEER REQUESTS
app.delete('/api/events/:id/volunteer', authenticateToken, requireRole(['Member']), async (req, res) => {
  try {
    await VolunteerRequest.deleteOne({ userId: req.user.id, eventId: req.params.id });
    res.json({ message: 'Volunteer request profile withdrawn.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET LOGGED PROFILE NOTIFICATIONS
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateOne({ id: req.params.id, userId: req.user.id }, { isRead: true });
    res.json({ message: 'Notification ledger updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id }, { isRead: true });
    res.json({ message: 'All notification alert counters zeroed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ACHIEVEMENTS
app.get('/api/achievements', authenticateToken, async (req, res) => {
  try {
    const list = await Achievement.find({ userId: req.user.id });
    res.json({ achievements: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==================== ADMINISTRATIVE MASTER MODULE ====================

// CREATE COMMUNITY
app.post('/api/admin/communities', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const { name, description, category, city, state, latitude, longitude, banner, logo } = req.body;
    const commId = generateId('COMM');

    const newComm = new Community({
      id: commId,
      name,
      description,
      category,
      city,
      state,
      latitude: Number(latitude) || 17.3850,
      longitude: Number(longitude) || 78.4867,
      banner,
      logo,
      adminId: req.user.id,
      members: [req.user.id] // Admin is automatically member #1
    });

    await newComm.save();
    res.status(201).json({ message: 'Community circle created and registered successfully.', community: newComm });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET PENDING JOIN REQUESTS FOR ADMIN FOR A SPECIFIC COMMUNITY
app.get('/api/admin/communities/:id/requests', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const commId = req.params.id;
    const comm = await Community.findOne({ id: commId });
    if (!comm || comm.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. You do not hold administration clearance over this community.' });
    }

    const joinRequests = await JoinRequest.find({ communityId: commId, status: 'Pending' });
    
    // Enrich with user names
    const enriched = await Promise.all(joinRequests.map(async (r) => {
      const u = await User.findOne({ id: r.userId });
      return {
        ...r.toObject(),
        userName: u ? u.name : 'Unknown Applicant',
        userEmail: u ? u.email : '',
        userProfileImage: u ? u.profileImage : undefined
      };
    }));

    res.json({ requests: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RESOLVE JOIN REQUESTS (APPROVE/REJECT)
app.post('/api/admin/requests/:id/resolve', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const { status } = req.body; // Approved or Rejected
    const joinReq = await JoinRequest.findOne({ id: req.params.id });
    if (!joinReq) {
      return res.status(404).json({ message: 'Join request entry missing.' });
    }

    const comm = await Community.findOne({ id: joinReq.communityId });
    if (!comm || comm.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. Administrative authorization failure.' });
    }

    joinReq.status = status;
    await joinReq.save();

    if (status === 'Approved') {
      comm.members.push(joinReq.userId);
      await comm.save();

      // Dispatch alert to approved member
      await createNotification(
        joinReq.userId,
        comm.id,
        `Congratulations! Your request to join the community "${comm.name}" has been approved! 🎉`,
        'Approval'
      );

      // Check Badges award
      await checkAndAwardAchievements(joinReq.userId);
    } else {
      await createNotification(
        joinReq.userId,
        comm.id,
        `Unfortunately, your join request for "${comm.name}" was declined.`,
        'Approval'
      );
    }

    res.json({ message: `Applicant credentials status marked as ${status}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// MANAGE VOLUNTEERS ENDPOINT (CLEARING APPLICANTS)
app.get('/api/admin/communities/:id/volunteers', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const commId = req.params.id;
    const comm = await Community.findOne({ id: commId });
    if (!comm || comm.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden access. Circular admin clearance mismatch.' });
    }

    const volsList = await VolunteerRequest.find({ communityId: commId });
    
    const enriched = await Promise.all(volsList.map(async (v) => {
      const u = await User.findOne({ id: v.userId });
      const e = await Event.findOne({ id: v.eventId });
      return {
        ...v.toObject(),
        userName: u ? u.name : 'Unknown User',
        userProfileImage: u ? u.profileImage : undefined,
        eventTitle: e ? e.title : 'Community Event',
        communityName: comm.name
      };
    }));

    res.json({ volunteers: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RESOLVE VOLUNTEER REQUESTS
app.post('/api/admin/volunteers/:id/resolve', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const { status } = req.body; // Approved or Rejected
    const volReq = await VolunteerRequest.findOne({ id: req.params.id });
    if (!volReq) {
      return res.status(404).json({ message: 'Volunteer log entry missing.' });
    }

    const comm = await Community.findOne({ id: volReq.communityId });
    if (!comm || comm.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Administrative privilege required.' });
    }

    volReq.status = status;
    await volReq.save();

    const evt = await Event.findOne({ id: volReq.eventId });

    if (status === 'Approved') {
      await createNotification(
        volReq.userId,
        comm.id,
        `Success! You have been approved as a Volunteer for "${evt ? evt.title : 'Community Meetup'}". Thank you for your leadership! 🎗️`,
        'Volunteer'
      );
      await checkAndAwardAchievements(volReq.userId);
    } else {
      await createNotification(
        volReq.userId,
        comm.id,
        `Your volunteer request registration for the event "${evt ? evt.title : 'Community Meetup'}" was declined.`,
        'Volunteer'
      );
    }

    res.json({ message: `Volunteer application resolved to ${status}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// CREATE EVENTS
app.post('/api/admin/communities/:id/events', authenticateToken, requireRole(['Community Admin', 'Super Admin']), async (req, res) => {
  try {
    const commId = req.params.id;
    const { title, description, eventDate, location, maxParticipants, eventType } = req.body;

    const comm = await Community.findOne({ id: commId });
    if (!comm || comm.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden circular command code authorization.' });
    }

    const newEvt = new Event({
      id: generateId('EVT'),
      title,
      description,
      eventDate,
      location,
      communityId: commId,
      maxParticipants: Number(maxParticipants) || 50,
      eventType: eventType || 'Meetup',
      attendees: [req.user.id] // Admin attends their own event
    });

    await newEvt.save();

    // Alert all circle members
    await Promise.all(comm.members.map(mId => 
      createNotification(mId, commId, `New Meetup Scheduled: "${title}" by ${comm.name}! RSVP to confirm attendance.`, 'Event')
    ));

    res.status(201).json({ message: 'Meetup event created successfully.', event: newEvt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// STARTUP LISTENER AT PORT 3000 FOR LOCAL DEVELOPMENT INTERFACES
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Community Nexus Core Router' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[COMMUNITY NEXUS SERVICE ACTIVE] Running on port ${PORT}`);
});
