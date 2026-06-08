import React, { useState, useEffect } from 'react';
import { User, MapPin, Tag, Compass, Calendar, Check, Clock, AlertCircle, Edit, Map, Bookmark, CheckSquare } from 'lucide-react';
import { api } from '../lib/api';

interface MemberDashboardProps {
  user: any;
  onRefreshUser: () => void;
  onSelectCommunity: (id: string) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'communities' | 'events' | 'requests'>('communities');
  
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
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, activeTab]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [commsResp, reqsResp, evtsResp] = await Promise.all([
        api.getCommunities(),
        api.getJoinRequests(),
        api.getEvents(true) // Pull active events context
      ]);

      // Filter communities user is a member of
      const joined = commsResp.communities.filter((c) => c.members.includes(user.id));
      setJoinedCommunities(joined);
      
      setJoinRequests(reqsResp.requests);
      
      // Filter events user RSVPed for
      const rsvps = evtsResp.events.filter((e) => e.isRSVPed);
      setMyEvents(rsvps);

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

  const handleLeave = async (commId: string) => {
    if (window.confirm('Are you positive you want to leave this community?')) {
      try {
        await api.leaveCommunity(commId);
        setSuccessMsg('Successfully left the community circle.');
        loadUserData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-slate-800 font-sans">
      
      {/* 👤 PORTAL SUMMARY HEADER */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <img
            src={user?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
            alt="My Profile Picture"
            className="w-16 h-16 rounded-full border-2 border-indigo-200 bg-slate-50 object-cover"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{user?.name}</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {user?.location?.city || 'Simulated Center'}, {user?.location?.state || 'California'}
            </p>
          </div>
        </div>

        {/* Mini tabs quick statistics */}
        <div className="flex gap-4 text-xs font-sans">
          <div className="bg-slate-50 px-4 py-2 border rounded-xl text-center">
            <span className="block font-mono text-lg font-bold text-indigo-700">{joinedCommunities.length}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Circles Joined</span>
          </div>
          <div className="bg-slate-50 px-4 py-2 border rounded-xl text-center">
            <span className="block font-mono text-lg font-bold text-indigo-700">{myEvents.length}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">My RSVPs</span>
          </div>
          <div className="bg-slate-50 px-4 py-2 border rounded-xl text-center">
            <span className="block font-mono text-lg font-bold text-indigo-700">
              {joinRequests.filter((r) => r.status === 'pending').length}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending Requests</span>
          </div>
        </div>
      </section>

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
                          onClick={() => handleLeave(comm.id)}
                          className="px-2.5 py-1.5 text-rose-600 hover:text-white hover:bg-rose-500 rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                        >
                          Withdraw
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

                      <div>
                        {req.status === 'pending' ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                            Pending Admin Review
                          </span>
                        ) : req.status === 'approved' ? (
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

        </div>
      </div>
    </div>
  );
};
