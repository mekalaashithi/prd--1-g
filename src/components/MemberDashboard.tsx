import React, { useState, useEffect } from 'react';
import { User, MapPin, Tag, Compass, Calendar, Check, Clock, AlertCircle, Edit, Map, Bookmark, CheckSquare, Star, Trophy, Flame, Award, Heart, Shield, Globe, HeartHandshake } from 'lucide-react';
import { api } from '../lib/api';

interface MemberDashboardProps {
  user: any;
  onRefreshUser: () => void;
  onSelectCommunity: (id: string) => void;
  onViewProfile: (userId: string) => void;
}

const INTERESTS_PRESETS = [
  'TS/JS Coding',
  'Startup Pitching',
  'AI/ML Agents',
  'Outdoor Running',
  'Football & Soccer',
  'Tabletop Boardgames',
  'Composting & Compost',
  'Poetry & Theatre Slams'
];

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  onRefreshUser,
  onSelectCommunity,
  onViewProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'communities' | 'events' | 'requests' | 'leaderboard' | 'recognition' | 'volunteer'>('communities');
  
  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [city, setCity] = useState(user?.location?.city || '');
  const [state, setState] = useState(user?.location?.state || '');
  
  // Data lists
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [myVolunteers, setMyVolunteers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardRange, setLeaderboardRange] = useState<'Weekly' | 'Monthly' | 'All-Time'>('All-Time');
  const [recognition, setRecognition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation Overlays to satisfy iFrame Guidelines
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const [leaveConfirmName, setLeaveConfirmName] = useState<string>('');
  const [withdrawConfirmId, setWithdrawConfirmId] = useState<string | null>(null);
  const [withdrawConfirmName, setWithdrawConfirmName] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, activeTab, leaderboardRange]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [commsResp, reqsResp, evtsResp, lbResp, recogResp, volsResp] = await Promise.all([
        api.getCommunities(),
        api.getJoinRequests(),
        api.getEvents(true), // Pull active events context
        api.getLeaderboard(leaderboardRange),
        api.getRecognition(),
        api.getMyVolunteers().catch(() => ({ volunteers: [] }))
      ]);

      // Filter communities user is a member of
      const joined = commsResp.communities.filter((c) => c.members.includes(user.id));
      setJoinedCommunities(joined);
      
      setJoinRequests(reqsResp.requests);
      
      // Filter events user RSVPed for
      const rsvps = evtsResp.events.filter((e) => e.isRSVPed);
      setMyEvents(rsvps);

      setLeaderboard(lbResp.leaderboard);
      setRecognition(recogResp.recognition);
      setMyVolunteers(volsResp?.volunteers || []);

    } catch (e: any) {
      console.error(e);
      setErrorMsg('Failed to synchronize user profiles and registry records.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const updatedLoc = {
        ...user.location,
        city,
        state
      };
      
      const resp = await api.updateProfile({
        name: profileName,
        profileImage,
        location: updatedLoc,
        interests: selectedInterests
      });

      setSuccessMsg(resp.message);
      onRefreshUser();
      setIsEditing(false);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred updating profile');
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleLeaveTrigger = (commId: string, commName: string) => {
    setLeaveConfirmId(commId);
    setLeaveConfirmName(commName);
  };

  const handleConfirmLeave = async () => {
    if (!leaveConfirmId) return;
    try {
      await api.leaveCommunity(leaveConfirmId);
      setSuccessMsg(`Successfully left "${leaveConfirmName}".`);
      setLeaveConfirmId(null);
      loadUserData();
      onRefreshUser();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to leave community.');
      setLeaveConfirmId(null);
    }
  };

  const handleWithdrawTrigger = (requestId: string, commName: string) => {
    setWithdrawConfirmId(requestId);
    setWithdrawConfirmName(commName);
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawConfirmId) return;
    try {
      await api.withdrawJoinRequest(withdrawConfirmId);
      setSuccessMsg(`Successfully withdrew your join request for "${withdrawConfirmName}".`);
      setWithdrawConfirmId(null);
      loadUserData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to withdraw request.');
      setWithdrawConfirmId(null);
    }
  };

  const handleCancelRSVP = async (eventId: string) => {
    try {
      await api.unrsvpEvent(eventId);
      setSuccessMsg('RSVP canceled successfully.');
      loadUserData();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleWithdrawVolunteer = async (eventId: string) => {
    if (!window.confirm('Are you positive you want to withdraw your volunteer request?')) return;
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.withdrawVolunteerRequest(eventId);
      setSuccessMsg('Volunteer request withdrawn successfully.');
      loadUserData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to withdraw volunteer request.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-800 font-sans">
      
      {/* 👤 PORTAL SUMMARY HEADER */}
      {(() => {
        const gamification = user?.gamification || {
          totalPoints: 0,
          level: 'Level 1 Explorer',
          stars: 0,
          currentStreak: 0,
          highestStreak: 0,
          badges: []
        };
        
        return (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-6 mb-8">
            <div className="flex items-center space-x-4">
              <img
                src={user?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.name || 'Member')}`}
                alt="My Profile Picture"
                className="w-16 h-16 rounded-full border-2 border-indigo-200 bg-slate-50 object-cover"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{user?.name}</h1>
                  <span className="px-2.5 py-0.5 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-120 flex items-center gap-1 shrink-0 uppercase tracking-wide">
                    <Shield className="w-3 h-3 text-indigo-500" />
                    {gamification.level}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 mt-1 font-medium flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {user?.location?.city || 'Hyderabad'}, {user?.location?.state || 'Telangana'}
                </p>

                {/* Stars Indicator */}
                <div className="flex items-center space-x-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Participation:</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < gamification.stars
                          ? 'fill-amber-400 text-amber-450'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                  {gamification.stars === 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 italic">No Stars</span>
                  )}
                </div>
              </div>
            </div>

            {/* Gamification Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans min-w-[280px] md:min-w-[450px]">
              <div className="bg-slate-50 px-3 py-2.5 border border-slate-100 rounded-xl text-center flex flex-col justify-between">
                <span className="block font-mono text-base font-bold text-indigo-700">{joinedCommunities.length}</span>
                <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider mt-1">Circles Joined</span>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 px-3 py-2.5 border border-amber-100/50 rounded-xl text-center flex flex-col justify-between">
                <span className="block font-mono text-base font-bold text-amber-700 flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  {gamification.totalPoints} <span className="text-[9px] font-sans font-bold">XP</span>
                </span>
                <span className="text-[9px] text-amber-800/80 uppercase font-bold tracking-wider mt-1">Reward Points</span>
              </div>

              <div className="bg-rose-50/70 px-3 py-2.5 border border-rose-100/50 rounded-xl text-center flex flex-col justify-between">
                <span className="block font-mono text-base font-bold text-rose-700 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
                  {gamification.currentStreak} <span className="text-[9px] font-sans font-bold">Wk</span>
                </span>
                <span className="text-[9px] text-rose-800/80 uppercase font-bold tracking-wider mt-1">Active Streak</span>
              </div>

              <div className="bg-indigo-50/70 px-3 py-2.5 border border-indigo-120 rounded-xl text-center flex flex-col justify-between">
                <span className="block font-mono text-base font-bold text-purple-700">
                  {gamification.badges.filter((b: any) => b.earned).length} / {gamification.badges.length}
                </span>
                <span className="text-[9px] text-indigo-800/80 uppercase font-bold tracking-wider mt-1">Badges Showcase</span>
              </div>
            </div>
          </section>
        );
      })()}

      {successMsg && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('communities')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'communities'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>My Joined Communities</span>
          </button>
          
          <button
            onClick={() => setActiveTab('events')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'events'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>My Events Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Track Join Requests</span>
          </button>

          <button
            onClick={() => setActiveTab('volunteer')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'volunteer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-rose-500" />
            <span>Volunteer Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Global Leaderboards</span>
          </button>

          <button
            onClick={() => setActiveTab('recognition')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'recognition'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Recognition Wall</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Edit Profile & Geolocation</span>
          </button>
        </div>

        {/* Main Content Workspace */}
        <div className="lg:col-span-3">

          {/* ACTIVE COMMUNITIES WORKSPACE */}
          {activeTab === 'communities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-sans">My Registered Circles</h2>
                  <p className="text-xs text-slate-500">Access and coordinate bulletins across joined circles.</p>
                </div>
              </div>

              {joinedCommunities.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <Compass className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No registered communities.</p>
                  <p className="text-xs text-slate-450 mt-1">Head back to the explorer feed to join your first community today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {joinedCommunities.map((comm) => (
                    <div key={comm.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <img src={comm.logo} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-50 border" />
                        <div className="min-w-0">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase rounded font-mono">
                            {comm.category}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1">{comm.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{comm.city}, {comm.state}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4 text-[11px]">
                        <button
                          onClick={() => onSelectCommunity(comm.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Access Portal
                        </button>
                        <button
                          onClick={() => handleLeaveTrigger(comm.id, comm.name)}
                          className="px-2.5 py-1.5 text-rose-600 hover:text-white hover:bg-rose-500 rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                        >
                          Leave Circle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EVENTS CALENDAR SCHEDULE */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-sans">My Upcoming Events Registry</h2>
                <p className="text-xs text-slate-500">Scheduled meetups you have submitted RSVP badges for.</p>
              </div>

              {myEvents.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No registered events.</p>
                  <p className="text-xs text-slate-450 mt-1">Explore individual community portals to RSVP for upcoming assemblies.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                  {myEvents.map((evt) => (
                    <div key={evt.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4 min-w-0">
                        <div className="p-3 bg-indigo-50 text-indigo-650 rounded-xl flex-shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-indigo-600 uppercase font-sans tracking-tight">
                            {evt.communityName} Meetup
                          </p>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-905 mt-0.5 truncate">
                            {evt.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            📍 {evt.location} &bull; 📅 {new Date(evt.eventDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelRSVP(evt.id)}
                        className="px-3 py-1.5 border border-rose-200 hover:border-rose-500 text-rose-605 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-semibold transition-all self-end sm:self-center cursor-pointer"
                      >
                        Cancel RSVP
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JOIN REQUEST TRACKS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-905 font-sans">Track Join Requests</h2>
                <p className="text-xs text-slate-500">Stay up to date on historical membership approvals or rejections.</p>
              </div>

              {joinRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">0 requests submitted.</p>
                  <p className="text-xs text-slate-450 mt-1">Join requests will log histories here after you apply to private communities.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <img src={req.communityLogo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-850 truncate">{req.communityName}</h4>
                          <span className="text-[10px] text-slate-450 font-mono">
                            Sent on {new Date(req.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {(req.status === 'pending' || req.status === 'Pending') ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                              Pending Admin Review
                            </span>
                            <button
                              onClick={() => handleWithdrawTrigger(req.id, req.communityName)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Withdraw
                            </button>
                          </div>
                        ) : (req.status === 'approved' || req.status === 'Approved') ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded-full font-bold text-[10px] flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Approved Access</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-220 rounded-full font-bold text-[10px]">
                            Declined
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EDIT PROFILE WORKSPACE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="border-b border-slate-50 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold font-sans text-slate-900">Personal Information Portal</h3>
                  <p className="text-xs text-slate-500">Update interests labels and home coordinates.</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Modify Information
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">YOUR DISPLAY NAME</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">AVATAR URL IDENTICON</label>
                      <input
                        type="text"
                        required
                        value={profileImage}
                        onChange={(e) => setProfileImage(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">MOCK REGION CITY</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">MOCK DISTRICT STATE</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">MY INTEREST LABELS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {INTERESTS_PRESETS.map((interest) => {
                        const active = selectedInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                              active
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-4 border-t border-slate-50">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 cursor-pointer"
                    >
                      Save Configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-50 text-slate-605 hover:bg-slate-100 border rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">User Account Email</span>
                      <span className="font-semibold text-slate-800 mt-1 block">{user?.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Account Clearance Clearance</span>
                      <span className="font-semibold text-indigo-700 mt-1 block tracking-wider uppercase">{user?.role}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Registered Region</span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        {user?.location?.city || 'San Francisco'}, {user?.location?.state || 'California'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px]">Registry Date</span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        {new Date(user?.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wide text-[10px] mb-2">My Interests</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.interests?.length === 0 ? (
                        <p className="text-slate-400 text-xs italic">No interests specified yet.</p>
                      ) : (
                        user?.interests?.map((i: string) => (
                          <span key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-750 font-bold text-xs rounded-full">
                            {i}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🏆 GLOBAL COMMUNITY LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Community Leaderboard
                  </h2>
                  <p className="text-xs text-slate-500">Compare XP points, stars, and badges across India circles.</p>
                </div>
                {/* Range selectors */}
                <div className="flex bg-slate-100 p-1 rounded-xl items-center text-xs font-semibold">
                  {(['Weekly', 'Monthly', 'All-Time'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setLeaderboardRange(r)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        leaderboardRange === r
                          ? 'bg-white text-indigo-700 shadow-sm font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce" />
                  <p className="text-sm font-semibold text-slate-700">No ranks detected.</p>
                  <p className="text-xs text-slate-450 mt-1">Attend scheduled events in active communities to start earning XP points.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-650">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b uppercase text-[9px] tracking-wider font-mono">
                        <tr>
                          <th className="p-4 w-16 text-center">Rank</th>
                          <th className="p-4">Member Info</th>
                          <th className="p-4">Level</th>
                          <th className="p-4 text-center">Participation Stars</th>
                          <th className="p-4 text-center">Current Streak</th>
                          <th className="p-4 text-center">Badges</th>
                          <th className="p-4 text-right">Points / XP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leaderboard.map((item, idx) => {
                          const isCurrentUser = item.id === user.id;
                          return (
                            <tr 
                              key={item.id} 
                              onClick={() => onViewProfile(item.id)}
                              className={`hover:bg-indigo-50/10 transition-colors cursor-pointer ${
                                isCurrentUser ? 'bg-indigo-50/25 font-semibold' : ''
                              } ${
                                idx === 0 ? 'bg-amber-50/10' :
                                idx === 1 ? 'bg-slate-50/20' :
                                idx === 2 ? 'bg-orange-50/10' : ''
                              }`}
                            >
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold ${
                                  idx === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                                  idx === 1 ? 'bg-slate-200 text-slate-700' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                                  'text-slate-550'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <img 
                                    src={item.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(item.name)}`} 
                                    alt="" 
                                    className="w-8 h-8 rounded-full border border-slate-200 object-cover" 
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-sm text-slate-900 hover:text-indigo-650 transition-colors">{item.name}</span>
                                      {isCurrentUser && (
                                        <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] uppercase tracking-wider font-bold rounded">You</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block font-medium flex items-center">
                                      <MapPin className="w-3 h-3 text-slate-350 mr-0.5" />
                                      {item.location?.city || 'Hyderabad'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-650 font-bold border border-slate-200 text-[9px] uppercase tracking-wide">
                                  {item.level || 'Level 1 Explorer'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-0.5">
                                  {item.stars > 0 ? (
                                    Array.from({ length: item.stars }).map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center space-x-1 font-mono text-[11px] font-bold text-rose-600">
                                  <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                  <span>{item.currentStreak || 0} days</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {item.badges && item.badges.length > 0 ? (
                                  <div className="flex items-center justify-center -space-x-1.5 overflow-hidden">
                                    {item.badges.slice(0, 3).map((b: any) => (
                                      <span 
                                        key={b.name} 
                                        title={b.name}
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 border border-white text-indigo-700 text-[10px]"
                                      >
                                        🏅
                                      </span>
                                    ))}
                                    {item.badges.length > 3 && (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 border border-white text-slate-500 text-[8px] font-bold">
                                        +{item.badges.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">None</span>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono text-sm font-black text-indigo-700">
                                {item.points} XP
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🌸 RECOGNITION WALL */}
          {activeTab === 'recognition' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Dynamic Recognition Wall
                </h2>
                <p className="text-xs text-slate-500">Celebrating top contributors and builders on the Indian Community Hub.</p>
              </div>

              {!recognition ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No active updates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Member of the Month Card */}
                  {recognition.memberOfTheMonth && (
                    <div className="bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 rounded-2xl border-2 border-indigo-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                        <Award className="w-8 h-8 text-indigo-500 shrink-0" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-850 text-[10px] font-bold rounded-full border border-indigo-200 tracking-wider uppercase">
                          Member of the Month
                        </span>
                        <div className="flex items-center space-x-4 mt-5">
                          <img src={recognition.memberOfTheMonth.user.profileImage} alt="" className="w-14 h-14 rounded-full border-2 border-indigo-200 object-cover" />
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">{recognition.memberOfTheMonth.user.name}</h4>
                            <p className="text-xs text-indigo-600 mt-0.5 font-semibold">📍 {recognition.memberOfTheMonth.user.location?.city || 'Hyderabad'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
                          Recognized for attending <strong className="text-slate-800 font-extrabold">{recognition.memberOfTheMonth.stats.eventsAttended} events</strong> in the last 30 days!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top Contributor Card */}
                  {recognition.topContributor && (
                    <div className="bg-gradient-to-br from-amber-50/40 via-white to-orange-50/40 rounded-2xl border-2 border-amber-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                        <Trophy className="w-8 h-8 text-amber-500 shrink-0 animate-bounce" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 tracking-wider uppercase">
                          Top Contributor
                        </span>
                        <div className="flex items-center space-x-4 mt-5">
                          <img src={recognition.topContributor.user.profileImage} alt="" className="w-14 h-14 rounded-full border-2 border-amber-200 object-cover" />
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">{recognition.topContributor.user.name}</h4>
                            <p className="text-xs text-amber-700 mt-0.5 font-semibold">📍 {recognition.topContributor.user.location?.city || 'Telangana'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
                          Leading the rankings with an astronomical cumulative total of <strong className="text-slate-800 font-extrabold">{recognition.topContributor.stats.totalPoints} XP points</strong>!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Community Champion Card */}
                  {recognition.communityChampion && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                        <Shield className="w-8 h-8 text-indigo-500 shrink-0" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200 tracking-wider uppercase font-mono">
                          Community Champion
                        </span>
                        <div className="flex items-center space-x-4 mt-5">
                          <img src={recognition.communityChampion.user.profileImage} alt="" className="w-14 h-14 rounded-full border border-slate-205 object-cover" />
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">{recognition.communityChampion.user.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">📍 {recognition.communityChampion.user.location?.city || 'Warangal'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                          Awarded for exceptional involvement, participating in <strong className="text-slate-800 font-bold">{recognition.communityChampion.stats.eventsAttended} community assemblies</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rising Star Card */}
                  {recognition.risingStar ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                        <Flame className="w-8 h-8 text-orange-500 shrink-0" />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-full border border-orange-120 tracking-wider uppercase font-mono">
                          Rising Star
                        </span>
                        <div className="flex items-center space-x-4 mt-5">
                          <img src={recognition.risingStar.user.profileImage} alt="" className="w-14 h-14 rounded-full border border-slate-200 object-cover" />
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">{recognition.risingStar.user.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">📍 {recognition.risingStar.user.location?.city || 'Hyderabad'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-semibold">
                          Recently registered within the last 30 days and has already accrued <strong className="text-slate-800 font-extrabold">{recognition.risingStar.stats.totalPoints} XP</strong>!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-5 flex flex-col justify-center items-center text-center">
                      <Star className="w-8 h-8 text-slate-350 mb-2" />
                      <p className="text-xs font-bold text-slate-650">No new Rising Star this month</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Stay active to claim this title soon!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Volunteer Dashboard */}
          {activeTab === 'volunteer' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-rose-500" />
                    Volunteer Workspace
                  </h2>
                  <p className="text-xs text-slate-505">Track and manage your applied, approved, or historical volunteering roles.</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4.5 flex items-center space-x-3.5">
                  <div className="p-3 bg-white text-amber-600 rounded-xl shadow-xs border border-amber-100 flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-405 font-mono leading-none">Applications pending</span>
                    <span className="block text-xl font-black text-slate-800 leading-none mt-1.5 font-mono">
                      {myVolunteers.filter(v => v.status === 'Pending' || v.status === 'pending').length}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-250 rounded-2xl p-4.5 flex items-center space-x-3.5">
                  <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-xs border border-emerald-150 flex-shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-405 font-mono leading-none">Approved Roster roles</span>
                    <span className="block text-xl font-black text-slate-800 leading-none mt-1.5 font-mono">
                      {myVolunteers.filter(v => v.status === 'Approved' || v.status === 'approved').length}
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4.5 flex items-center space-x-3.5">
                  <div className="p-3 bg-white text-rose-600 rounded-xl shadow-xs border border-rose-100 flex-shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-405 font-mono leading-none">Total Points Earned</span>
                    <span className="block text-xl font-black text-slate-800 leading-none mt-1.5 font-mono">
                      {myVolunteers.filter(v => v.status === 'Approved' || v.status === 'approved').length * 20} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Roster list */}
              {myVolunteers.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                  <HeartHandshake className="w-12 h-12 text-rose-300 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-700">No Volunteer records found</p>
                  <p className="text-xs text-slate-450 mt-1">You can apply for volunteer roles listed on the public event boards.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-xs text-slate-650">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b uppercase text-[9px] tracking-wider font-mono">
                        <tr>
                          <th className="p-4">Event / Task</th>
                          <th className="p-4">Motivation & Skills</th>
                          <th className="p-4">Scheduled Date</th>
                          <th className="p-4">Roster Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myVolunteers.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="font-extrabold text-slate-901">{v.eventTitle || 'Community Drive'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Circle: {v.communityName || 'IndiCircle'}</div>
                            </td>
                            <td className="p-4 max-w-sm">
                              <div className="space-y-1">
                                {v.skills && (
                                  <div>
                                    <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[10px]">
                                      Skills: {v.skills}
                                    </span>
                                  </div>
                                )}
                                {v.motivation && (
                                  <div className="text-xs text-slate-500 truncate" title={v.motivation}>
                                    "{v.motivation}"
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-slate-500">
                              {v.eventDate ? new Date(v.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Upcoming'}
                            </td>
                            <td className="p-4">
                              {(v.status === 'Pending' || v.status === 'pending') ? (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                                  Pending Review
                                </span>
                              ) : (v.status === 'Approved' || v.status === 'approved') ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded-full font-bold text-[10px] flex items-center space-x-1">
                                  Approved
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-220 rounded-full font-bold text-[10px]">
                                  Declined
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {(v.status === 'Pending' || v.status === 'pending') && (
                                <button
                                  onClick={() => handleWithdrawVolunteer(v.eventId)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-650 hover:text-white border border-rose-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  Withdraw Request
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Leave Community Custom Dialog */}
      {leaveConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-105 max-w-sm w-full overflow-hidden text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Leave "{leaveConfirmName}"?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you positive you want to leave this community circle? Your roster registrations, RSVP status and memberships will be deleted.
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setLeaveConfirmId(null)}
                className="flex-grow py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLeave}
                className="flex-grow py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Request Custom Dialog */}
      {withdrawConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-105 max-w-sm w-full overflow-hidden text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Withdraw Join Request?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to withdraw your pending membership join request for "{withdrawConfirmName}"?
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setWithdrawConfirmId(null)}
                className="flex-grow py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                No, Keep it
              </button>
              <button 
                onClick={handleConfirmWithdraw}
                className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Yes, Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
