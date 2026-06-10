import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbStore, calculateDistance, User, Community, JoinRequest, Event, Announcement, Notification } from './store';
import { getUserGamification } from './gamification';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-communityhub-token-key-2026';

export const apiRouter = Router();

// Define augmented request types
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: User['role'];
    name: string;
  };
}

// Token Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token missing' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = decoded as { id: string; email: string; role: User['role']; name: string };
    next();
  });
}

// Role Authorization Middleware
export function requireRole(roles: User['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }
    next();
  };
}

// -----------------------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -----------------------------------------------------------------------------

// Post /api/auth/register
apiRouter.post('/auth/register', (req, res) => {
  const { name, email, password, role = null, location, interests = [] } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const users = dbStore.getUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    res.status(400).json({ error: 'Email already registered' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    roleId: dbStore.generateRoleId(role as User['role']),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role as User['role'],
    profileImage: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    location: location || { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
    interests,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  dbStore.flush();

  const tokenPayload = { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  // Create a welcome notification
  dbStore.addNotification(newUser.id, `Welcome to CommunityHub, ${newUser.name}! Start exploring nearby communities now.`, 'success', '/explore');

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      roleId: newUser.roleId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      profileImage: newUser.profileImage,
      location: newUser.location,
      interests: newUser.interests,
      createdAt: newUser.createdAt,
      gamification: getUserGamification(newUser.id)
    }
  });
});

// Post /api/auth/login
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const users = dbStore.getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      location: user.location,
      interests: user.interests,
      createdAt: user.createdAt,
      gamification: getUserGamification(user.id)
    }
  });
});

// Get /api/auth/me
apiRouter.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const users = dbStore.getUsers();
  const user = users.find(u => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: 'User profiles not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      location: user.location,
      interests: user.interests,
      createdAt: user.createdAt,
      gamification: getUserGamification(user.id)
    }
  });
});

// GET /api/users/me - Returns user details including persisted role
apiRouter.get('/users/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const users = dbStore.getUsers();
  const user = users.find(u => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: 'User profiles not found' });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.roleId,
    profileImage: user.profileImage,
    location: user.location,
    interests: user.interests || [],
    createdAt: user.createdAt
  });
});

// PATCH /api/users/role - Saves user's role selection to database permanently
apiRouter.patch('/users/role', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { role } = req.body;

  if (!role) {
    res.status(400).json({ error: 'Valid user role is required' });
    return;
  }

  // Support varying casing (e.g. visitor, member, community_admin)
  let normalizedRole: any = null;
  const lRole = role.toLowerCase();
  if (lRole === 'visitor') {
    normalizedRole = 'Visitor';
  } else if (lRole === 'member') {
    normalizedRole = 'Member';
  } else if (lRole === 'community_admin' || lRole === 'community admin') {
    normalizedRole = 'Community Admin';
  } else if (lRole === 'super_admin' || lRole === 'super admin') {
    normalizedRole = 'Super Admin';
  } else {
    normalizedRole = role;
  }

  const users = dbStore.getUsers();
  const user = users.find(u => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.role = normalizedRole as User['role'];
  user.roleId = dbStore.generateRoleId(user.role);
  dbStore.flush();

  res.json({
    message: 'User role updated permanently.',
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    user: {
      id: user.id,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      location: user.location,
      interests: user.interests,
      createdAt: user.createdAt,
      gamification: getUserGamification(user.id)
    }
  });
});

// Put /api/auth/profile (Update Profile)
apiRouter.put('/auth/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const users = dbStore.getUsers();
  const index = users.findIndex(u => u.id === req.user?.id);

  if (index === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = users[index];
  const { name, profileImage, location, interests } = req.body;

  if (name) user.name = name;
  if (profileImage) user.profileImage = profileImage;
  if (location) user.location = location;
  if (interests) user.interests = interests;

  dbStore.flush();

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      location: user.location,
      interests: user.interests,
      createdAt: user.createdAt
    }
  });
});

// Post /api/auth/forgot-password
apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const user = dbStore.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'No user registered with this email address' });
    return;
  }

  // Generate a mock reset token
  res.json({ message: 'Password recovery email sent successfully. A reset link of token code is active.' });
});

// Post /api/auth/reset-password
apiRouter.post('/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'Email and new password are required' });
    return;
  }

  const users = dbStore.getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  dbStore.flush();

  res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
});

// -----------------------------------------------------------------------------
// COMMUNITY DIRECTORY ENDPOINTS (VISITOR & MEMBER PORTS)
// -----------------------------------------------------------------------------

// Get /api/communities
apiRouter.get('/communities', (req, res) => {
  const { search, category, lat, lon, radius } = req.query;
  let list = dbStore.getCommunities().filter(c => c.status === 'active');

  // Search filter
  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(s) || c.description.toLowerCase().includes(s));
  }

  // Category filter
  if (category && category !== 'All') {
    list = list.filter(c => c.category.toLowerCase() === (category as string).toLowerCase());
  }

  // Location filter with Distance Calculation
  let outputList = list.map(c => {
    let distance: number | undefined = undefined;
    if (lat && lon) {
      distance = calculateDistance(
        Number(lat),
        Number(lon),
        c.latitude,
        c.longitude
      );
    }
    return {
      ...c,
      distance
    };
  });

  if (radius && lat && lon) {
    const limit = Number(radius);
    outputList = outputList.filter(c => c.distance !== undefined && c.distance <= limit);
  }

  // Sort by distance if available, otherwise by creation date
  if (lat && lon) {
    outputList.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } else {
    outputList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ communities: outputList });
});

// Get /api/communities/:id
apiRouter.get('/communities/:id', (req, res) => {
  const commId = req.params.id;
  const comm = dbStore.getCommunities().find(c => c.id === commId);

  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  const events = dbStore.getEvents().filter(e => e.communityId === commId);
  const announcements = dbStore.getAnnouncements().filter(a => a.communityId === commId);

  // Fetch approved volunteers for these events to list publicly
  const volunteersList = dbStore.getVolunteers().filter(v => v.communityId === commId && v.status === 'Approved');
  const uList = dbStore.getUsers();

  const eventsWithVolunteers = events.map(e => {
    const eventVols = volunteersList.filter(v => v.eventId === e.id);
    const enrichedVols = eventVols.map(v => {
      const userObj = uList.find(u => u.id === v.userId);
      return {
        id: v.id,
        userId: v.userId,
        userName: userObj ? userObj.name : 'Unknown User',
        userProfileImage: userObj ? userObj.profileImage : undefined,
        status: v.status
      };
    });
    return {
      ...e,
      volunteers: enrichedVols
    };
  });

  // Fetch admin profile info to attach
  const admin = dbStore.getUsers().find(u => u.id === comm.adminId);

  res.json({
    community: {
      ...comm,
      adminName: admin ? admin.name : 'Unknown Admin',
      adminProfileImage: admin ? admin.profileImage : undefined
    },
    events: eventsWithVolunteers,
    announcements,
  });
});

// Post /api/communities/:id/join (Submit Join Request)
apiRouter.post('/communities/:id/join', authenticateToken, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const userId = req.user?.id!;

  const comm = dbStore.getCommunities().find(c => c.id === commId);
  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  if (comm.status !== 'active') {
    res.status(400).json({ error: 'Community is suspended' });
    return;
  }

  if (comm.members.includes(userId)) {
    res.status(400).json({ error: 'You are already a member of this community' });
    return;
  }

  const existingRequest = dbStore.getJoinRequests().find(
    r => r.userId === userId && r.communityId === commId && r.status === 'Pending'
  );
  if (existingRequest) {
    res.status(400).json({ error: 'You already have a pending join request for this community.' });
    return;
  }

  const newRequest: JoinRequest = {
    id: 'req_' + Math.random().toString(36).substr(2, 9),
    userId,
    communityId: commId,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  dbStore.getJoinRequests().push(newRequest);
  dbStore.flush();

  dbStore.addNotification(
    comm.adminId, 
    `A new join request has been submitted for "${comm.name}" by applicant "${req.user?.name}"!`, 
    'info', 
    '/admin/requests'
  );

  res.status(201).json({
    message: 'Your join request was submitted successfully and is pending approval by the community admin.',
    request: newRequest
  });
});

// Post /api/join-request (Submit Pending Join Request)
apiRouter.post('/join-request', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { communityId } = req.body;
  if (!communityId) {
    res.status(400).json({ error: 'Community ID is required' });
    return;
  }
  const userId = req.user?.id!;

  const comm = dbStore.getCommunities().find(c => c.id === communityId);
  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  if (comm.status !== 'active') {
    res.status(400).json({ error: 'Community is suspended' });
    return;
  }

  if (comm.members.includes(userId)) {
    res.status(400).json({ error: 'You are already a member of this community' });
    return;
  }

  const existingRequest = dbStore.getJoinRequests().find(
    r => r.userId === userId && r.communityId === communityId && r.status === 'Pending'
  );
  if (existingRequest) {
    res.status(400).json({ error: 'You already have a pending join request for this community.' });
    return;
  }

  const newRequest: JoinRequest = {
    id: 'req_' + Math.random().toString(36).substr(2, 9),
    userId,
    communityId,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  dbStore.getJoinRequests().push(newRequest);
  dbStore.flush();

  dbStore.addNotification(
    comm.adminId,
    `A new join request has been submitted for "${comm.name}" by applicant "${req.user?.name}"!`,
    'info',
    '/admin/requests'
  );

  res.status(201).json({
    message: 'Your join request was submitted successfully and is pending approval by the community admin.',
    request: newRequest
  });
});

// Get /api/admin/requests (Fetch Requests for Admin)
apiRouter.get('/admin/requests', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user?.id!;
  const isSuper = req.user?.role === 'Super Admin';

  const communities = dbStore.getCommunities();
  const managedCommunityIds = isSuper 
    ? communities.map(c => c.id)
    : communities.filter(c => c.adminId === currentUserId).map(c => c.id);

  const requests = dbStore.getJoinRequests().filter(r => managedCommunityIds.includes(r.communityId));
  const users = dbStore.getUsers();

  const requestsWithContext = requests.map(r => {
    const user = users.find(u => u.id === r.userId);
    const comm = communities.find(c => c.id === r.communityId);
    return {
      id: r.id,
      userId: r.userId,
      roleId: user ? user.roleId : 'Unknown',
      userName: user ? user.name : 'Unknown User',
      userEmail: user ? user.email : '',
      communityId: r.communityId,
      communityName: comm ? comm.name : 'Unknown Community',
      status: r.status,
      createdAt: r.createdAt
    };
  });

  res.json({ requests: requestsWithContext });
});

// Put /api/admin/requests/:id/approve
apiRouter.put('/admin/requests/:id/approve', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const requestId = req.params.id;
  
  const joinReqs = dbStore.getJoinRequests();
  const reqIdx = joinReqs.findIndex(r => r.id === requestId);
  if (reqIdx === -1) {
    res.status(404).json({ error: 'Join request not found' });
    return;
  }

  const joinReq = joinReqs[reqIdx];
  const commId = joinReq.communityId;

  const comm = dbStore.getCommunities().find(c => c.id === commId);
  if (!comm) {
    res.status(404).json({ error: 'Associated community not found' });
    return;
  }

  // Authorize check
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Forbidden: You do not manage this community' });
    return;
  }

  joinReq.status = 'Approved';
  joinReq.reviewedAt = new Date().toISOString();

  // Add user to community members list
  if (!comm.members.includes(joinReq.userId)) {
    comm.members.push(joinReq.userId);
  }

  // Record membership inside DBStructure
  const memberships = dbStore.getDB().memberships || [];
  const exists = memberships.find(m => m.userId === joinReq.userId && m.communityId === commId);
  if (!exists) {
    memberships.push({
      id: 'memb_' + Math.random().toString(36).substr(2, 9),
      userId: joinReq.userId,
      communityId: commId,
      joinedAt: new Date().toISOString()
    });
  }
  dbStore.getDB().memberships = memberships;

  // Handle Promotion logic: if a Visitor becomes a Member after approval, update role to Member, sequential ID upgrades Vxxx to Mxxx
  const targetUser = dbStore.getUsers().find(u => u.id === joinReq.userId);
  let promotionMessage = '';
  if (targetUser && targetUser.role === 'Visitor') {
    const oldRoleId = targetUser.roleId;
    targetUser.role = 'Member';
    targetUser.roleId = dbStore.generateRoleId('Member');
    promotionMessage = ` User ${targetUser.name} has been promoted from Visitor (${oldRoleId}) to Member (${targetUser.roleId}).`;
  }

  dbStore.flush();

  // Notify target user
  dbStore.addNotification(
    joinReq.userId,
    `Congratulations! Your request to join "${comm.name}" was APPROVED by the community administration.${promotionMessage}`,
    'success',
    `/community/${comm.id}`
  );

  res.json({ 
    message: `Membership request successfully approved.${promotionMessage}`, 
    request: joinReq 
  });
});

// Put /api/admin/requests/:id/reject
apiRouter.put('/admin/requests/:id/reject', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const requestId = req.params.id;

  const joinReqs = dbStore.getJoinRequests();
  const reqIdx = joinReqs.findIndex(r => r.id === requestId);
  if (reqIdx === -1) {
    res.status(404).json({ error: 'Join request not found' });
    return;
  }

  const joinReq = joinReqs[reqIdx];
  const commId = joinReq.communityId;

  const comm = dbStore.getCommunities().find(c => c.id === commId);
  if (!comm) {
    res.status(404).json({ error: 'Associated community not found' });
    return;
  }

  // Authorize check
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Forbidden: You do not manage this community' });
    return;
  }

  joinReq.status = 'Rejected';
  joinReq.reviewedAt = new Date().toISOString();

  dbStore.flush();

  // Notify user
  dbStore.addNotification(
    joinReq.userId,
    `Unfortunately, your membership request for "${comm.name}" was declined.`,
    'alert'
  );

  res.json({ 
    message: 'Membership request successfully rejected.', 
    request: joinReq 
  });
});

// Post /api/communities/:id/leave
apiRouter.post('/communities/:id/leave', authenticateToken, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const userId = req.user?.id!;

  const comm = dbStore.getCommunities().find(c => c.id === commId);
  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  if (comm.adminId === userId) {
    res.status(400).json({ error: 'As the Community Admin, you cannot leave. You must delete or transfer leadership instead.' });
    return;
  }

  const index = comm.members.indexOf(userId);
  if (index === -1) {
    res.status(400).json({ error: 'You are not a member of this community' });
    return;
  }

  // Remove from community members list
  comm.members.splice(index, 1);

  // Remove from memberships table
  const memberships = dbStore.getDB().memberships || [];
  const mIndex = memberships.findIndex(m => m.communityId === commId && m.userId === userId);
  if (mIndex !== -1) {
    memberships.splice(mIndex, 1);
  }

  // Delete join request completely to allow reapplying
  const joinReqs = dbStore.getJoinRequests();
  const rIndex = joinReqs.findIndex(r => r.communityId === commId && r.userId === userId);
  if (rIndex !== -1) {
    joinReqs.splice(rIndex, 1);
  }

  dbStore.flush();

  res.json({ message: 'Successfully departed the community.' });
});

// Post /api/join-requests/:id/withdraw
apiRouter.post('/join-requests/:id/withdraw', authenticateToken, (req: AuthenticatedRequest, res) => {
  const requestId = req.params.id;
  const userId = req.user?.id!;

  const reqs = dbStore.getJoinRequests();
  const index = reqs.findIndex(r => r.id === requestId && r.userId === userId);
  if (index === -1) {
    res.status(404).json({ error: 'Pending join request not found or not owned by you.' });
    return;
  }

  const joinReq = reqs[index];
  if (joinReq.status !== 'Pending' && (joinReq as any).status !== 'pending') {
    res.status(400).json({ error: 'Only pending requests can be withdrawn.' });
    return;
  }

  // Remove request from database
  reqs.splice(index, 1);
  dbStore.flush();

  res.json({ message: 'Join request successfully withdrawn.' });
});

// Get /api/join-requests
apiRouter.get('/join-requests', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  const requests = dbStore.getJoinRequests().filter(r => r.userId === userId);
  
  const communities = dbStore.getCommunities();
  const requestsWithCommunity = requests.map(r => {
    const community = communities.find(c => c.id === r.communityId);
    return {
      ...r,
      communityName: community ? community.name : 'Unknown Community',
      communityLogo: community ? community.logo : undefined,
    };
  });

  res.json({ requests: requestsWithCommunity });
});

// -----------------------------------------------------------------------------
// EVENT PARTICIPATION ENDPOINTS
// -----------------------------------------------------------------------------

apiRouter.get('/events/public', (req, res) => {
  const { lat, lon, radius } = req.query;
  const events = dbStore.getEvents();
  const communities = dbStore.getCommunities();

  let eventsWithDistance = events.map(e => {
    const comm = communities.find(c => c.id === e.communityId);
    let distance: number | undefined = undefined;
    if (comm && lat && lon) {
      distance = calculateDistance(
        Number(lat),
        Number(lon),
        comm.latitude,
        comm.longitude
      );
    }
    return {
      ...e,
      communityName: comm ? comm.name : 'Unknown Community',
      communityLogo: comm ? comm.logo : undefined,
      city: comm ? comm.city : 'Unknown',
      state: comm ? comm.state : 'Unknown',
      distance
    };
  });

  if (radius && lat && lon) {
    const limit = Number(radius);
    eventsWithDistance = eventsWithDistance.filter(e => e.distance !== undefined && e.distance <= limit);
  }

  if (lat && lon) {
    eventsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } else {
    eventsWithDistance.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  res.json({ events: eventsWithDistance });
});

apiRouter.get('/events', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  
  // Find events for communities the user has joined
  const communities = dbStore.getCommunities();
  const joinedCommunitiesIds = communities.filter(c => c.members.includes(userId)).map(c => c.id);

  const events = dbStore.getEvents();
  // Filter events belonging to joined communities OR return all if query param has all=true
  const loadAll = req.query.all === 'true';

  const filteredEvents = events.filter(e => loadAll || joinedCommunitiesIds.includes(e.communityId));

  const eventsWithContext = filteredEvents.map(e => {
    const comm = communities.find(c => c.id === e.communityId);
    return {
      ...e,
      communityName: comm ? comm.name : 'Unknown Community',
      communityLogo: comm ? comm.logo : undefined,
      isRSVPed: e.attendees.includes(userId)
    };
  });

  res.json({ events: eventsWithContext });
});

// Post /api/events/:id/rsvp
apiRouter.post('/events/:id/rsvp', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id!;

  const event = dbStore.getEvents().find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // Must be a member of the community to RSVP
  const community = dbStore.getCommunities().find(c => c.id === event.communityId);
  if (!community) {
    res.status(404).json({ error: 'Associated community not found' });
    return;
  }

  if (!community.members.includes(userId)) {
    res.status(403).json({ error: 'You must be a member of this community to RSVP of register for this event.' });
    return;
  }

  if (event.attendees.includes(userId)) {
    res.status(400).json({ error: 'You are already registered for this event' });
    return;
  }

  event.attendees.push(userId);
  dbStore.flush();

  res.json({ message: 'Successfully RSVPed to the event!', attendeesCount: event.attendees.length });
});

// Post /api/events/:id/unrsvp
apiRouter.post('/events/:id/unrsvp', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id!;

  const event = dbStore.getEvents().find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
;  }

  const index = event.attendees.indexOf(userId);
  if (index === -1) {
    res.status(400).json({ error: 'You have not RSVPed to this event' });
    return;
  }

  event.attendees.splice(index, 1);
  dbStore.flush();

  res.json({ message: 'Successfully cancelled your RSVP', attendeesCount: event.attendees.length });
});

// -----------------------------------------------------------------------------
// NOTIFICATIONS SYSTEM
// -----------------------------------------------------------------------------

apiRouter.get('/notifications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  const notifs = dbStore.getNotifications().filter(n => n.userId === userId);
  res.json({ notifications: notifs });
});

apiRouter.post('/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res) => {
  const notifId = req.params.id;
  const userId = req.user?.id!;

  const notifs = dbStore.getNotifications();
  const notif = notifs.find(n => n.id === notifId && n.userId === userId);

  if (!notif) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  notif.isRead = true;
  dbStore.flush();

  res.json({ message: 'Notification marked as read' });
});

apiRouter.post('/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  const notifs = dbStore.getNotifications();

  notifs.forEach(n => {
    if (n.userId === userId) {
      n.isRead = true;
    }
  });

  dbStore.flush();
  res.json({ message: 'All notifications marked as read' });
});


// -----------------------------------------------------------------------------
// COMMUNITY ADMIN ENDPOINTS (REQUIRES ROLE "Community Admin" or "Super Admin")
// -----------------------------------------------------------------------------

// Helper middleware to check if user manages this community
const checkCommunityManagement = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const communityId = req.params.id || req.body.communityId;
  if (!communityId) {
    res.status(400).json({ error: 'Community ID required' });
    return;
  }

  const comm = dbStore.getCommunities().find(c => c.id === communityId);
  if (!comm) {
    res.status(404).json({ error: 'Community details not found' });
    return;
  }

  // Super Admin bypasses, otherwise user must be the exact creator/adminId
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied: You do not manage this community' });
    return;
  }

  next();
};

// Create Community
apiRouter.post('/admin/communities', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { name, description, category, city, state, latitude, longitude, banner, logo } = req.body;
  const adminId = req.user?.id!;

  if (!name || !description || !category || !city || !state) {
    res.status(400).json({ error: 'Required fields missing for community creation' });
    return;
  }

  const communities = dbStore.getCommunities();
  const newCommunity: Community = {
    id: 'comm_' + Math.random().toString(36).substr(2, 9),
    name,
    description,
    category,
    city,
    state,
    latitude: Number(latitude) || 37.7749,
    longitude: Number(longitude) || -122.4194,
    banner: banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
    logo: logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    adminId,
    members: [adminId], // creator is immediately a member
    status: 'active',
    createdAt: new Date().toISOString()
  };

  communities.push(newCommunity);
  dbStore.flush();

  res.status(201).json({
    message: 'Community created successfully!',
    community: newCommunity
  });
});

// Edit Community
apiRouter.put('/admin/communities/:id', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;

  const { name, description, category, city, state, latitude, longitude, banner, logo } = req.body;

  if (name) comm.name = name;
  if (description) comm.description = description;
  if (category) comm.category = category;
  if (city) comm.city = city;
  if (state) comm.state = state;
  if (latitude !== undefined) comm.latitude = Number(latitude);
  if (longitude !== undefined) comm.longitude = Number(longitude);
  if (banner) comm.banner = banner;
  if (logo) comm.logo = logo;

  dbStore.flush();

  res.json({
    message: 'Community info saved successfully',
    community: comm
  });
});

// Delete Community
apiRouter.delete('/admin/communities/:id', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  
  const communities = dbStore.getCommunities();
  const index = communities.findIndex(c => c.id === commId);
  if (index === -1) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  // Remove community
  communities.splice(index, 1);

  // Sweep corresponding events, announcements, join requests
  const remainingEvents = dbStore.getEvents().filter(e => e.communityId !== commId);
  const remainingAnns = dbStore.getAnnouncements().filter(a => a.communityId !== commId);
  const remainingReqs = dbStore.getJoinRequests().filter(r => r.communityId !== commId);

  dbStore.getDB().events = remainingEvents;
  dbStore.getDB().announcements = remainingAnns;
  dbStore.getDB().joinRequests = remainingReqs;

  dbStore.flush();

  res.json({ message: 'Community and associated events/announcements fully purged.' });
});

// View Join Requests for community
apiRouter.get('/admin/communities/:id/requests', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const requests = dbStore.getJoinRequests().filter(r => r.communityId === commId);

  const users = dbStore.getUsers();
  const requestsWithUser = requests.map(r => {
    const user = users.find(u => u.id === r.userId);
    return {
      ...r,
      userName: user ? user.name : 'Unknown User',
      userEmail: user ? user.email : '',
      userProfileImage: user ? user.profileImage : undefined,
    };
  });

  res.json({ requests: requestsWithUser });
});

// Resolve Join Request (Approve/Reject)
apiRouter.post('/admin/requests/:requestId/resolve', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { requestId } = req.params;
  const { status } = req.body; // 'approved' | 'rejected'

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid resolution status' });
    return;
  }

  const joinReqs = dbStore.getJoinRequests();
  const reqIdx = joinReqs.findIndex(r => r.id === requestId);
  if (reqIdx === -1) {
    res.status(404).json({ error: 'Join request not found' });
    return;
  }

  const joinReq = joinReqs[reqIdx];
  const commId = joinReq.communityId;

  const comm = dbStore.getCommunities().find(c => c.id === commId);
  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  // Authorize check: current user is the admin of the requested community
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Forbidden: You do not manage this community' });
    return;
  }

  joinReq.status = status;
  joinReq.reviewedAt = new Date().toISOString();

  if (status === 'approved') {
    if (!comm.members.includes(joinReq.userId)) {
      comm.members.push(joinReq.userId);
    }
  }

  dbStore.flush();

  // Notify user
  const adminName = req.user?.name;
  dbStore.addNotification(
    joinReq.userId,
    status === 'approved' 
      ? `Congratulations! Your request to join "${comm.name}" was APPROVED by ${adminName}.`
      : `Unfortunately, your membership request for "${comm.name}" was declined.`,
    status === 'approved' ? 'success' : 'alert',
    `/community/${comm.id}`
  );

  res.json({ message: `Membership request successfully ${status}.`, request: joinReq });
});

// View Community Members
apiRouter.get('/admin/communities/:id/members', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;

  const users = dbStore.getUsers();
  const members = users.filter(u => comm.members.includes(u.id)).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    profileImage: u.profileImage,
    isCreator: u.id === comm.adminId,
    joinedAt: u.createdAt,
    gamification: getUserGamification(u.id)
  }));

  res.json({ members });
});

// Remove Member from Community
apiRouter.post('/admin/communities/:id/members/:userId/remove', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const userIdToRemove = req.params.userId;
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;

  if (comm.adminId === userIdToRemove) {
    res.status(400).json({ error: 'Cannot remove the primary Community Admin.' });
    return;
  }

  const index = comm.members.indexOf(userIdToRemove);
  if (index === -1) {
    res.status(400).json({ error: 'User is not a member of this community' });
    return;
  }

  comm.members.splice(index, 1);
  
  // Mark join requests for this community/user as rejected or reset
  const reqs = dbStore.getJoinRequests();
  reqs.forEach(r => {
    if (r.userId === userIdToRemove && r.communityId === commId) {
      r.status = 'Rejected';
    }
  });

  dbStore.flush();

  // Notify member
  dbStore.addNotification(
    userIdToRemove,
    `You have been removed from the community "${comm.name}" by the administrators.`,
    'warning'
  );

  res.json({ message: 'Member successfully removed' });
});

// Ban Member (Simple implementation: Removes member and resets profile notifications)
apiRouter.post('/admin/communities/:id/members/:userId/ban', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const userIdToBan = req.params.userId;
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;

  if (comm.adminId === userIdToBan) {
    res.status(400).json({ error: 'Cannot ban the primary Community Admin.' });
    return;
  }

  const idx = comm.members.indexOf(userIdToBan);
  if (idx !== -1) {
    comm.members.splice(idx, 1);
  }

  // Also block their pending or history requests by flagging them rejected
  const reqs = dbStore.getJoinRequests();
  reqs.forEach(r => {
    if (r.userId === userIdToBan && r.communityId === commId) {
      r.status = 'Rejected';
    }
  });

  dbStore.flush();

  // Notify user
  dbStore.addNotification(
    userIdToBan,
    `You have been banned from "${comm.name}". You are no longer permitted to access or request entry.`,
    'alert'
  );

  res.json({ message: 'User has been banned and expelled from the community.' });
});

// Assign member as Moderator / Admin
apiRouter.post('/admin/communities/:id/members/:userId/assign-moderator', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  
  const users = dbStore.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'User profiles not found' });
    return;
  }

  user.role = 'Community Admin';
  dbStore.flush();

  dbStore.addNotification(
    userId,
    `Congratulations! Your account role has been upgraded to "Community Admin" by the community directors.`,
    'success'
  );

  res.json({ message: 'User successfully promoted to Community Admin.' });
});

// Create Event
apiRouter.post('/admin/communities/:id/events', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const { title, description, eventDate, location, eventType = 'Meetup', maxParticipants = 50 } = req.body;

  if (!title || !description || !eventDate || !location) {
    res.status(400).json({ error: 'All event details must be complete' });
    return;
  }

  const events = dbStore.getEvents();
  const newEvent: Event = {
    id: 'evt_' + Math.random().toString(36).substr(2, 9),
    title,
    description,
    eventDate,
    location,
    communityId: commId,
    attendees: [req.user?.id!], // Organizer is first attendee
    eventType: eventType as any,
    maxParticipants: Number(maxParticipants),
    createdAt: new Date().toISOString()
  };

  events.push(newEvent);
  dbStore.flush();

  // Notify community members about a new event
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;
  comm.members.forEach(memberId => {
    if (memberId !== req.user?.id) {
      dbStore.addNotification(
        memberId,
        `New ${eventType} Scheduled in "${comm.name}": "${title}". Submit your RSVP now!`,
        'info',
        `/community/${commId}?tab=events`
      );
    }
  });

  res.status(201).json({ message: 'Event scheduled successfully!', event: newEvent });
});

// Edit Event
apiRouter.put('/admin/events/:eventId', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  const { title, description, eventDate, location, eventType, maxParticipants } = req.body;

  const events = dbStore.getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // Admin access verify
  const comm = dbStore.getCommunities().find(c => c.id === event.communityId)!;
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied: You do not manage this community / event' });
    return;
  }

  if (title) event.title = title;
  if (description) event.description = description;
  if (eventDate) event.eventDate = eventDate;
  if (location) event.location = location;
  if (eventType) event.eventType = eventType;
  if (maxParticipants !== undefined) event.maxParticipants = Number(maxParticipants);

  dbStore.flush();

  res.json({ message: 'Event details updated successfully.', event });
});

// Delete Event
apiRouter.delete('/admin/events/:eventId', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;

  const events = dbStore.getEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const event = events[idx];
  const comm = dbStore.getCommunities().find(c => c.id === event.communityId)!;
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied: You do not manage this community' });
    return;
  }

  events.splice(idx, 1);
  dbStore.flush();

  res.json({ message: 'Event deleted successfully.' });
});

// Create Announcement
apiRouter.post('/admin/communities/:id/announcements', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const { title, content, isPinned = false } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  const announcements = dbStore.getAnnouncements();
  const newAnn: Announcement = {
    id: 'ann_' + Math.random().toString(36).substr(2, 9),
    title,
    content,
    communityId: commId,
    createdBy: req.user?.id!,
    isPinned,
    createdAt: new Date().toISOString()
  };

  announcements.push(newAnn);
  dbStore.flush();

  // Notify community members
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;
  comm.members.forEach(memberId => {
    if (memberId !== req.user?.id) {
      dbStore.addNotification(
        memberId,
        `New Bulletin Board Notice in "${comm.name}": "${title}"`,
        'info',
        `/community/${commId}?tab=bulletins`
      );
    }
  });

  res.status(201).json({ message: 'Announcement posted successfully!', announcement: newAnn });
});

// Edit Announcement
apiRouter.put('/admin/announcements/:annId', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { annId } = req.params;
  const { title, content, isPinned } = req.body;

  const announcements = dbStore.getAnnouncements();
  const ann = announcements.find(a => a.id === annId);
  if (!ann) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }

  const comm = dbStore.getCommunities().find(c => c.id === ann.communityId)!;
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied' });
    return;
  }

  if (title) ann.title = title;
  if (content) ann.content = content;
  if (isPinned !== undefined) ann.isPinned = isPinned;

  dbStore.flush();

  res.json({ message: 'Announcement saved successfully.', announcement: ann });
});

// Delete Announcement
apiRouter.delete('/admin/announcements/:annId', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { annId } = req.params;

  const announcements = dbStore.getAnnouncements();
  const idx = announcements.findIndex(a => a.id === annId);
  if (idx === -1) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }

  const ann = announcements[idx];
  const comm = dbStore.getCommunities().find(c => c.id === ann.communityId)!;
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied' });
    return;
  }

  announcements.splice(idx, 1);
  dbStore.flush();

  res.json({ message: 'Announcement deleted successfully.' });
});

// Analytics for Community Admin
apiRouter.get('/admin/communities/:id/analytics', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const comm = dbStore.getCommunities().find(c => c.id === commId)!;

  const totalMembers = comm.members.length;
  // Mock metrics based on seed logic that represent professional SaaS values
  const activeMembers = Math.max(1, Math.round(totalMembers * 0.75));
  const newMembersThisMonth = Math.max(1, Math.round(totalMembers * 0.20));

  const events = dbStore.getEvents().filter(e => e.communityId === commId);
  const totalEvents = events.length;
  
  // Calculate event participation RSVP percentages
  const eventParticipation = events.map(e => ({
    eventName: e.title,
    rsvps: e.attendees.length,
    percentage: Math.round((e.attendees.length / Math.max(1, totalMembers)) * 100)
  }));

  // Render dummy month growth statistics
  const growthStatistics = [
    { name: 'Jan', members: Math.max(1, totalMembers - 5) },
    { name: 'Feb', members: Math.max(2, totalMembers - 3) },
    { name: 'Mar', members: Math.max(2, totalMembers - 2) },
    { name: 'Apr', members: Math.max(3, totalMembers - 2) },
    { name: 'May', members: Math.max(4, totalMembers - 1) },
    { name: 'Jun', members: totalMembers }
  ];

  res.json({
    analytics: {
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      totalEvents,
      eventParticipation,
      growthStatistics
    }
  });
});


// -----------------------------------------------------------------------------
// SUPER ADMIN ENDPOINTS (REQUIRES ROLE "Super Admin")
// -----------------------------------------------------------------------------

// View All Users
apiRouter.get('/super-admin/users', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  const users = dbStore.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    profileImage: u.profileImage,
    location: u.location,
    interests: u.interests
  }));

  res.json({ users });
});

// Update User Role
apiRouter.post('/super-admin/users/:userId/change-role', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const isSelf = req.user?.id === userId;
  const isSuper = req.user?.role === 'Super Admin';
  const isCommAdmin = req.user?.role === 'Community Admin';

  if (!isSelf && !isSuper && !isCommAdmin) {
    res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    return;
  }

  if (!role || !['Visitor', 'Member', 'Community Admin', 'Super Admin'].includes(role)) {
    res.status(400).json({ error: 'Valid user role is required' });
    return;
  }

  const users = dbStore.getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.role = role as User['role'];
  dbStore.flush();

  dbStore.addNotification(userId, `A platform controller has adjusted your clearance role to "${role}".`, 'warning');

  res.json({ message: 'User role updated successfully.', user });
});

// Ban User
apiRouter.delete('/super-admin/users/:userId', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  const { userId } = req.params;

  if (userId === 'user_super_admin') {
    res.status(400).json({ error: 'Cannot delete the primary platform Super Admin.' });
    return;
  }

  const users = dbStore.getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    res.status(444).json({ error: 'User not found' });
    return;
  }

  users.splice(index, 1);

  // Also remove user from all community membership arrays
  const comms = dbStore.getCommunities();
  comms.forEach(c => {
    const idx = c.members.indexOf(userId);
    if (idx !== -1) {
      c.members.splice(idx, 1);
    }
  });

  // Purge dynamic responses
  dbStore.getDB().joinRequests = dbStore.getJoinRequests().filter(r => r.userId !== userId);
  dbStore.getDB().events.forEach(e => {
    const idx = e.attendees.indexOf(userId);
    if (idx !== -1) {
      e.attendees.splice(idx, 1);
    }
  });

  dbStore.flush();

  res.json({ message: 'User successfully banned and deleted from server.' });
});

// All Communities (Including suspended)
apiRouter.get('/super-admin/communities', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  const communities = dbStore.getCommunities();
  const users = dbStore.getUsers();

  const enrichedComms = communities.map(c => {
    const admin = users.find(u => u.id === c.adminId);
    return {
      ...c,
      adminName: admin ? admin.name : 'Unknown Admin',
      adminEmail: admin ? admin.email : ''
    };
  });

  res.json({ communities: enrichedComms });
});

// Suspend Community Toggle
apiRouter.post('/super-admin/communities/:id/toggle-status', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  const commId = req.params.id;
  const comm = dbStore.getCommunities().find(c => c.id === commId);

  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  comm.status = comm.status === 'active' ? 'suspended' : 'active';
  dbStore.flush();

  // Notify creator / admin
  dbStore.addNotification(
    comm.adminId, 
    `Your community "${comm.name}" has been ${comm.status === 'active' ? 're-activated' : 'suspended'} by the platform supervisors.`,
    comm.status === 'active' ? 'success' : 'alert'
  );

  res.json({ message: `Community status changed to ${comm.status}`, community: comm });
});

// Platform settings mock save
apiRouter.post('/super-admin/settings', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  res.json({ message: 'Global platform settings updated successfully.' });
});

// Global Super Admin Analytics
apiRouter.get('/super-admin/analytics', authenticateToken, requireRole(['Super Admin']), (req, res) => {
  const users = dbStore.getUsers();
  const communities = dbStore.getCommunities();
  const events = dbStore.getEvents();

  const totalUsers = users.length;
  const totalCommunities = communities.length;
  const totalEvents = events.length;
  const activeCommunities = communities.filter(c => c.status === 'active').length;

  res.json({
    analytics: {
      totalUsers,
      totalCommunities,
      totalEvents,
      activeCommunities,
      growthMetrics: [
        { name: 'Week 1', users: Math.max(1, totalUsers - 4), communities: Math.max(1, totalCommunities - 2) },
        { name: 'Week 2', users: Math.max(1, totalUsers - 3), communities: Math.max(1, totalCommunities - 1) },
        { name: 'Week 3', users: Math.max(2, totalUsers - 1), communities: Math.max(1, totalCommunities - 1) },
        { name: 'Week 4', users: totalUsers, communities: totalCommunities }
      ],
      categoriesCount: [
        { name: 'Tech', count: communities.filter(c => c.category === 'Tech').length },
        { name: 'College', count: communities.filter(c => c.category === 'College').length },
        { name: 'Startup', count: communities.filter(c => c.category === 'Startup').length },
        { name: 'Sports', count: communities.filter(c => c.category === 'Sports').length },
        { name: 'NGO', count: communities.filter(c => c.category === 'NGO').length },
        { name: 'Cultural', count: communities.filter(c => c.category === 'Cultural').length },
        { name: 'Gaming', count: communities.filter(c => c.category === 'Gaming').length }
      ]
    }
  });
});

// Mark Attendance & Save Contributions
apiRouter.post('/admin/events/:eventId/attendance', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  const { attendance } = req.body; // array of { userId: string, status: 'Present'|'Absent', contributionType?: string }

  const event = dbStore.getEvents().find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const comm = dbStore.getCommunities().find(c => c.id === event.communityId)!;
  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Access Denied: You do not manage this community' });
    return;
  }

  const attendanceList = dbStore.getAttendance();

  if (Array.isArray(attendance)) {
    attendance.forEach(item => {
      const { userId, status, contributionType = 'Attendance' } = item;
      
      let record = attendanceList.find(a => a.userId === userId && a.eventId === eventId);
      if (record) {
        record.status = status;
        record.contributionType = contributionType;
        record.date = new Date().toISOString();
      } else {
        attendanceList.push({
          id: 'att_' + Math.random().toString(36).substr(2, 9),
          userId,
          eventId,
          date: new Date().toISOString(),
          status,
          contributionType
        });
      }

      // Automatically add a customized notification for reward recognition
      if (status === 'Present') {
        const rewardPoints = contributionType === 'Volunteer' ? 20 
          : (contributionType === 'Contribution' ? 15 
          : (contributionType === 'Organizer' ? 30 : 10));

        dbStore.addNotification(
          userId,
          `You have been marked Present as "${contributionType}" for "${event.title}"! Earned +${rewardPoints} Points.`,
          'success',
          '/leaderboard'
        );
      }
    });

    dbStore.flush();
  }

  res.json({ message: 'Attendance and reward indices updated successfully.' });
});

// Fetch Leaderboard rankings
apiRouter.get('/leaderboard', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { range = 'All-Time' } = req.query; // Weekly, Monthly, All-Time
  const users = dbStore.getUsers().filter(u => u.role !== 'Super Admin'); // Compare regular members
  
  let dateLimitMs: number | undefined = undefined;
  if (range === 'Weekly') {
    dateLimitMs = 7 * 24 * 60 * 60 * 1000;
  } else if (range === 'Monthly') {
    dateLimitMs = 30 * 24 * 60 * 60 * 1000;
  }

  const list = users.map(u => {
    const stats = getUserGamification(u.id, dateLimitMs);
    return {
      id: u.id,
      name: u.name,
      profileImage: u.profileImage,
      location: u.location,
      role: u.role,
      points: stats.totalPoints,
      stars: stats.stars,
      level: stats.level,
      eventsAttended: stats.eventsAttended,
      volunteerActivities: stats.volunteerActivities,
      currentStreak: stats.currentStreak,
      highestStreak: stats.highestStreak,
      badges: stats.badges.filter(b => b.earned)
    };
  });

  // Sort by points descending, events descending, then name ascending
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.eventsAttended !== a.eventsAttended) return b.eventsAttended - a.eventsAttended;
    return a.name.localeCompare(b.name);
  });

  const rankedLeaderboard = list.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  res.json({ leaderboard: rankedLeaderboard });
});

// Dynamic Community Recognition Wall
apiRouter.get('/recognition', authenticateToken, (req, res) => {
  const users = dbStore.getUsers().filter(u => u.role !== 'Super Admin');
  const userStats = users.map(u => ({
    user: {
      id: u.id,
      name: u.name,
      profileImage: u.profileImage,
      location: u.location,
      role: u.role,
      joinedAt: u.createdAt
    },
    stats: getUserGamification(u.id)
  }));

  // Top Contributor - highest points
  const sortedByPoints = [...userStats].sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
  const topContributor = sortedByPoints[0]?.stats.totalPoints > 0 ? sortedByPoints[0] : null;

  // Top Volunteer - most volunteer events
  const sortedByVolunteer = [...userStats].sort((a, b) => b.stats.volunteerActivities - a.stats.volunteerActivities);
  const topVolunteer = sortedByVolunteer[0]?.stats.volunteerActivities > 0 ? sortedByVolunteer[0] : null;

  // Community Champion - most events attended
  const sortedByEvents = [...userStats].sort((a, b) => b.stats.eventsAttended - a.stats.eventsAttended);
  const communityChampion = sortedByEvents[0]?.stats.eventsAttended > 0 ? sortedByEvents[0] : null;

  // Rising Star - Joined in the last 30 days and has some participation
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const risingStars = userStats.filter(item => {
    const joinedTime = new Date(item.user.joinedAt).getTime();
    return joinedTime >= thirtyDaysAgo && item.stats.totalPoints > 0;
  });
  risingStars.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
  const risingStar = risingStars[0] || null;

  // Member of the Month - Most event attendances in the last 30 days
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const monthlyStats = users.map(u => ({
    user: {
      id: u.id,
      name: u.name,
      profileImage: u.profileImage,
      location: u.location
    },
    stats: getUserGamification(u.id, thirtyDaysMs)
  }));
  monthlyStats.sort((a, b) => b.stats.eventsAttended - a.stats.eventsAttended);
  const memberOfTheMonth = monthlyStats[0]?.stats.eventsAttended > 0 ? monthlyStats[0] : null;

  res.json({
    recognition: {
      topContributor,
      topVolunteer,
      communityChampion,
      risingStar,
      memberOfTheMonth
    }
  });
});

// -----------------------------------------------------------------------------
// PUBLIC MEMBER PROFILE ENDPOINT
// -----------------------------------------------------------------------------
apiRouter.get('/users/:id/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.id;
  const user = dbStore.getUsers().find(u => u.id === targetUserId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Get gamification stats
  const stats = getUserGamification(targetUserId);

  // Get joined communities
  const communities = dbStore.getCommunities().filter(c => c.members.includes(targetUserId));

  // Get total events attended (event history)
  const userAttendances = dbStore.getAttendance().filter(a => a.userId === targetUserId && a.status === 'Present');
  const evts = dbStore.getEvents();
  const eventHistory = userAttendances.map(a => {
    const event = evts.find(e => e.id === a.eventId);
    const comm = communities.find(c => c.id === event?.communityId);
    return {
      eventId: a.eventId,
      status: a.status,
      date: a.date,
      contributionType: a.contributionType,
      title: event ? event.title : 'Deleted Event',
      eventType: event ? event.eventType : 'Meetup',
      communityName: comm ? comm.name : 'Unknown Community',
    };
  });

  // Calculate community rank
  const allUsers = dbStore.getUsers().filter(u => u.role !== 'Super Admin');
  const userPointsList = allUsers.map(u => ({
    userId: u.id,
    points: getUserGamification(u.id).totalPoints,
  }));
  userPointsList.sort((a, b) => b.points - a.points);
  const rank = userPointsList.findIndex(item => item.userId === targetUserId) + 1;

  res.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      profileImage: user.profileImage,
      location: user.location,
      interests: user.interests || [],
      createdAt: user.createdAt,
      rank,
      points: stats.totalPoints,
      stars: stats.stars,
      level: stats.level,
      currentStreak: stats.currentStreak,
      highestStreak: stats.highestStreak,
      earnedBadges: stats.badges.filter(b => b.earned),
      lockedBadges: stats.badges.filter(b => !b.earned),
      communitiesJoined: communities.length,
      volunteerActivitiesCount: stats.volunteerActivities,
      totalEventsAttended: stats.eventsAttended,
      eventHistory,
    }
  });
});

// -----------------------------------------------------------------------------
// VOLUNTEER SYSTEM ENDPOINTS
// -----------------------------------------------------------------------------

apiRouter.post('/events/:id/volunteer', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id!;

  const evts = dbStore.getEvents();
  const event = evts.find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // Check if user is a member of this community
  const comm = dbStore.getCommunities().find(c => c.id === event.communityId);
  if (!comm || !comm.members.includes(userId)) {
    res.status(403).json({ error: 'You must join this community first to volunteer.' });
    return;
  }

  // Check if they already applied
  const vList = dbStore.getVolunteers();
  const existing = vList.find(v => v.eventId === eventId && v.userId === userId);
  if (existing) {
    res.status(400).json({ error: 'You have already applied to volunteer for this event.' });
    return;
  }

  const { motivation, skills, experience } = req.body;
  if (!motivation || !skills) {
    res.status(400).json({ error: 'Please provide why you want to volunteer and your skills contribution.' });
    return;
  }

  const volApp: any = {
    id: 'vol_' + Math.random().toString(36).substr(2, 9),
    userId,
    eventId,
    communityId: event.communityId,
    status: 'Pending',
    motivation,
    skills,
    experience: experience || '',
    appliedAt: new Date().toISOString()
  };

  vList.push(volApp);
  dbStore.flush();

  res.json({ message: 'Volunteer application submitted successfully!', volunteer: volApp });
});

apiRouter.delete('/events/:id/volunteer', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const userId = req.user?.id!;

  const vList = dbStore.getVolunteers();
  const index = vList.findIndex(v => v.eventId === eventId && v.userId === userId && v.status === 'Pending');
  if (index === -1) {
    res.status(400).json({ error: 'Pending volunteer request not found or already processed.' });
    return;
  }

  vList.splice(index, 1);
  dbStore.flush();

  res.json({ message: 'Volunteer request withdrawn successfully!' });
});

apiRouter.get('/volunteers/my', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  const vList = dbStore.getVolunteers();
  const myVolunteers = vList.filter(v => v.userId === userId);

  const evts = dbStore.getEvents();
  const comms = dbStore.getCommunities();

  const enriched = myVolunteers.map(v => {
    const event = evts.find(e => e.id === v.eventId);
    const comm = comms.find(c => c.id === v.communityId);
    return {
      ...v,
      eventTitle: event ? event.title : 'Deleted Event',
      eventDate: event ? event.eventDate : undefined,
      location: event ? event.location : undefined,
      communityName: comm ? comm.name : 'Deleted Community',
    };
  });

  res.json({ volunteers: enriched });
});

apiRouter.get('/admin/communities/:id/volunteers', authenticateToken, requireRole(['Community Admin', 'Super Admin']), checkCommunityManagement, (req: AuthenticatedRequest, res) => {
  const commId = req.params.id;
  const vList = dbStore.getVolunteers().filter(v => v.communityId === commId);

  const uList = dbStore.getUsers();
  const evts = dbStore.getEvents();

  const enriched = vList.map(v => {
    const user = uList.find(u => u.id === v.userId);
    const event = evts.find(e => e.id === v.eventId);

    return {
      ...v,
      userName: user ? user.name : 'Unknown',
      userEmail: user ? user.email : 'Unknown',
      userProfileImage: user ? user.profileImage : undefined,
      eventTitle: event ? event.title : 'Deleted Event',
      eventDate: event ? event.eventDate : undefined,
    };
  });

  res.json({ volunteers: enriched });
});

apiRouter.post('/admin/volunteers/:volunteerId/status', authenticateToken, requireRole(['Community Admin', 'Super Admin']), (req: AuthenticatedRequest, res) => {
  const { volunteerId } = req.params;
  const { status } = req.body; // 'Approved' | 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    res.status(400).json({ error: 'Status must be Approved or Rejected' });
    return;
  }

  const vList = dbStore.getVolunteers();
  const volRec = vList.find(v => v.id === volunteerId);
  if (!volRec) {
    res.status(404).json({ error: 'Volunteer records not found' });
    return;
  }

  // Check if requester is community admin
  const comm = dbStore.getCommunities().find(c => c.id === volRec.communityId);
  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  if (req.user?.role !== 'Super Admin' && comm.adminId !== req.user?.id) {
    res.status(403).json({ error: 'Forbidden: You do not manage this community.' });
    return;
  }

  volRec.status = status;

  // Add notification to member
  const evts = dbStore.getEvents();
  const event = evts.find(e => e.id === volRec.eventId);
  const eventTitle = event ? event.title : 'Event';

  if (status === 'Approved') {
    dbStore.addNotification(
      volRec.userId,
      `Hooray! You are APPROVED as a volunteer for "${eventTitle}"!`,
      'success'
    );

    // Link volunteer role and grant points/volunteerActivities via an Attendance record
    const attendanceLogs = dbStore.getAttendance();
    const existingAtt = attendanceLogs.find(a => a.userId === volRec.userId && a.eventId === volRec.eventId);
    if (existingAtt) {
      existingAtt.status = 'Present';
      existingAtt.contributionType = 'Volunteer';
    } else {
      attendanceLogs.push({
        id: 'att_' + Math.random().toString(36).substr(2, 9),
        userId: volRec.userId,
        eventId: volRec.eventId,
        date: event ? event.eventDate : new Date().toISOString(),
        status: 'Present',
        contributionType: 'Volunteer'
      });
    }
  } else {
    dbStore.addNotification(
      volRec.userId,
      `Unfortunately, your volunteer request for "${eventTitle}" was not approved.`,
      'warning'
    );

    // If previously approved and now rejected, make sure to clean up any Attendance record that gave them volunteer status
    const attendanceLogs = dbStore.getAttendance();
    const idx = attendanceLogs.findIndex(a => a.userId === volRec.userId && a.eventId === volRec.eventId && a.contributionType === 'Volunteer');
    if (idx !== -1) {
      attendanceLogs.splice(idx, 1);
    }
  }

  dbStore.flush();
  res.json({ message: `Volunteer status successfully updated to ${status}.`, volunteer: volRec });
});

