import React, { useState, useEffect } from 'react';
import { X, MapPin, Users, Calendar, Megaphone, ArrowLeft, Heart, Check, Trash2, Edit, CheckCircle2, ChevronRight, Share2, Compass, AlertCircle, Info } from 'lucide-react';
import { api } from '../lib/api';

interface CommunityDetailProps {
  communityId: string;
  user: any;
  onBack: () => void;
  onRefreshList: () => void;
  onTriggerAuth: () => void;
}

export const CommunityDetail: React.FC<CommunityDetailProps> = ({
  communityId,
  user,
  onBack,
  onRefreshList,
  onTriggerAuth,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'events' | 'bulletins'>('info');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  // Volunteer handling states
  const [applyingEventId, setApplyingEventId] = useState<string | null>(null);
  const [motivation, setMotivation] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [volunteers, setVolunteers] = useState<any[]>([]);

  useEffect(() => {
    loadDetails();
    if (user) {
      loadJoinRequests();
      loadMyVolunteers();
    }
  }, [communityId, user]);

  const loadMyVolunteers = async () => {
    if (!user) return;
    try {
      const resp = await api.getMyVolunteers();
      setVolunteers(resp.volunteers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawVolunteer = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to withdraw your volunteer request?')) return;
    setError('');
    setSuccess('');
    try {
      await api.withdrawVolunteerRequest(eventId);
      setSuccess('Volunteer request withdrawn successfully!');
      await loadMyVolunteers();
    } catch (e: any) {
      setError(e.message || 'Failed to withdraw volunteer request.');
    }
  };

  const handleSubmitVolunteerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivation.trim() || !skills.trim()) {
      setError('Please provide why you want to volunteer and your skills contribution.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.applyAsVolunteer(applyingEventId!, {
        motivation,
        skills,
        experience,
      });
      setSuccess('Volunteer request submitted successfully!');
      setApplyingEventId(null);
      await loadMyVolunteers();
    } catch (e: any) {
      setError(e.message || 'Failed to submit volunteer request.');
    }
  };

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await api.getCommunity(communityId);
      setData(resp);
    } catch (e: any) {
      setError(e.message || 'Failed to pull community files.');
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      const resp = await api.getJoinRequests();
      setJoinRequests(resp.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      onTriggerAuth();
      return;
    }

    setError('');
    setSuccess('');
    try {
      const resp = await api.joinCommunity(communityId);
      setSuccess(resp.message);
      loadDetails();
      loadJoinRequests();
      onRefreshList();
    } catch (e: any) {
      setError(e.message || 'Failed to join community.');
    }
  };

  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const handleLeave = async () => {
    setConfirmingLeave(true);
  };

  const confirmLeaveAction = async () => {
    setError('');
    setSuccess('');
    try {
      const resp = await api.leaveCommunity(communityId);
      setSuccess(resp.message || 'Successfully departed the community.');
      setConfirmingLeave(false);
      loadDetails();
      loadJoinRequests();
      onRefreshList();
    } catch (e: any) {
      setError(e.message || 'Failed to leave community.');
      setConfirmingLeave(false);
    }
  };

  const handleWithdraw = async () => {
    const pendingReqObj = user && joinRequests.find((r) => r.communityId === communityId && (r.status === 'pending' || r.status === 'Pending'));
    if (!pendingReqObj) return;
    setError('');
    setSuccess('');
    try {
      const resp = await api.withdrawJoinRequest(pendingReqObj.id);
      setSuccess(resp.message || 'Successfully withdrew your join request.');
      loadDetails();
      loadJoinRequests();
      onRefreshList();
    } catch (e: any) {
      setError(e.message || 'Failed to withdraw join request.');
    }
  };

  const handleRSVP = async (eventId: string, rsvped: boolean) => {
    if (!user) {
      onTriggerAuth();
      return;
    }

    setError('');
    try {
      if (rsvped) {
        await api.unrsvpEvent(eventId);
      } else {
        await api.rsvpEvent(eventId);
      }
      loadDetails();
    } catch (e: any) {
      setError(e.message || 'Failed to verify RSVP event registry.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs mt-4">Streaming community archives...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 max-w-lg mx-auto mt-10">
        <p className="text-rose-700 text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Error loading: {error}</span>
        </p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs">
          Back to directory
        </button>
      </div>
    );
  }

  const { community, events, announcements } = data;
  const isMember = user && community.members.includes(user.id);
  const pendingReq = user && joinRequests.find((r) => r.communityId === communityId && (r.status === 'pending' || r.status === 'Pending'));
  const rejectedReq = user && joinRequests.find((r) => r.communityId === communityId && (r.status === 'rejected' || r.status === 'Rejected'));

  let joinStatusText = '';
  if (isMember) joinStatusText = 'Approved Member';
  else if (pendingReq) joinStatusText = 'Pending Approval';
  else if (rejectedReq) joinStatusText = 'Join Request Denied';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-slate-800">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to communities list
      </button>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
          {success}
        </div>
      )}

      {/* Community Jumbotron Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-md bg-white border border-slate-200">
        <div className="h-48 sm:h-64 overflow-hidden relative">
          <img
            src={community.banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200'}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-950/20 to-transparent" />
        </div>

        {/* Community Info Overlay */}
        <div className="px-6 pb-6 pt-1 flex flex-col md:flex-row md:items-end justify-between gap-4 relative">
          {/* Logo positioning */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end -mt-10 sm:-mt-16 md:mb-1">
            <img
              src={community.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=comm'}
              alt={community.name}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-white bg-slate-50 object-cover shadow"
            />
            <div className="pt-2">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                {community.category}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 font-sans tracking-tight">
                {community.name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs mt-1.5 font-medium items-center">
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {community.city}, {community.state}
                </span>
                <span className="flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {community.members.length} member{community.members.length !== 1 && 's'}
                </span>
                {community.distance !== undefined && (
                  <span className="font-mono bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-semibold">
                    📏 {community.distance} km away
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            {isMember ? (
              confirmingLeave ? (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 p-2 rounded-xl text-xs">
                  <span className="font-semibold text-rose-850">Really Leave?</span>
                  <button
                    onClick={confirmLeaveAction}
                    className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[10px] cursor-pointer hover:bg-rose-700 transition-colors"
                  >
                    Yes, Leave
                  </button>
                  <button
                    onClick={() => setConfirmingLeave(false)}
                    className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer hover:bg-slate-300 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                    <Check className="w-4 h-4" />
                    <span>Approved Joined Member</span>
                  </span>
                  <button
                    onClick={handleLeave}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Leave
                  </button>
                </div>
              )
            ) : pendingReq ? (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Request Sent: Approval Pending</span>
                </span>
                <button
                  onClick={handleWithdraw}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Withdraw
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition-all cursor-pointer"
              >
                Join Community
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-t border-slate-100 bg-slate-50 font-sans text-xs font-medium">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 sm:flex-initial px-6 py-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Hub Info
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 sm:flex-initial px-6 py-3 border-b-2 font-semibold transition-all cursor-pointer relative ${
              activeTab === 'events'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Events Calendar
            {events.length > 0 && (
              <span className="ml-1.5 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                {events.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bulletins')}
            className={`flex-1 sm:flex-initial px-6 py-3 border-b-2 font-semibold transition-all cursor-pointer relative ${
              activeTab === 'bulletins'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            bulletins & Announcements
            {announcements.length > 0 && (
              <span className="ml-1.5 bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                {announcements.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB CONTENT panels */}
      <div className="mt-6">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* About description card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-3 font-sans">About this Community</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {community.description}
                </p>
              </div>

              {/* Pinpoint / Location map description */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900 font-sans">Community Location Map</h3>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${community.latitude},${community.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline font-bold"
                  >
                    Open on Google Maps &rarr;
                  </a>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Interactive proximity of {community.name} in {community.city}, {community.state}.
                </p>
                
                {/* Embedded Interactive High-Fidelity Google Maps iframe */}
                <div className="h-64 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden">
                  <iframe
                    title="Community Location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${community.latitude},${community.longitude}&z=13&output=embed`}
                    loading="lazy"
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-center">
                  <code className="text-[10px] text-slate-500 font-mono">
                    GPS Coordinates: Latitude {community.latitude.toFixed(4)}, Longitude {community.longitude.toFixed(4)}
                  </code>
                </div>
              </div>
            </div>

            {/* Sidebar Columns */}
            <div className="space-y-6">
              
              {/* Meta properties sidebar */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-950 font-sans tracking-wide uppercase">Community Metadata</h4>
                
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Owner / Creator</span>
                    <span className="font-semibold text-slate-700">{community.adminName}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Founded Time</span>
                    <span className="font-semibold text-slate-700">{new Date(community.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Focus Category</span>
                    <span className="font-semibold text-indigo-600 uppercase tracking-widest text-[10px] bg-indigo-50 px-2 py-0.5 rounded">
                      {community.category}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Total Members</span>
                    <span className="font-mono font-bold text-slate-850 px-1.5 py-0.5 bg-slate-50 border rounded">
                      {community.members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Testing Note */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-sm font-bold flex items-center space-x-1.5">
                    <Info className="w-4 h-4 text-indigo-200" />
                    <span>Dev Sandbox Tooltip</span>
                  </h4>
                  <p className="text-[11px] text-indigo-100 mt-2 leading-relaxed">
                    If this community is pending/suspended, you can instantly change permissions or approve users using the sandboxed role switcher up in the top navbar bar!
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-indigo-400 rounded-full opacity-10 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* EVENTS SCHEDULE TAB */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Scheduled Dynamic Meetups</h3>
                <p className="text-xs text-slate-500">Must be an approved member to RSVP for events.</p>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No scheduled meetups found.</p>
                <p className="text-xs text-slate-400 mt-1">Stay tuned for future schedules created by directors.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((evt) => {
                  const rsvped = user && evt.attendees.includes(user.id);
                  return (
                    <div key={evt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                      <div className="p-5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-slate-900 text-base font-sans line-clamp-1">{evt.title}</h4>
                          <span className="bg-slate-100 text-slate-600 font-mono text-[9px] font-semibold px-2 py-0.5 rounded flex-shrink-0">
                            {new Date(evt.eventDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed h-8">
                          {evt.description}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-slate-50 divide-y divide-slate-50 text-[11px] text-slate-500 space-y-2">
                          <div className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                          <div className="flex items-center pt-2">
                            <Users className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            <span>{evt.attendees.length} attending this meetup</span>
                          </div>
                          {/* Event Volunteers List */}
                          {evt.volunteers && evt.volunteers.length > 0 && (
                            <div className="flex items-start pt-2">
                              <Heart className="w-3.5 h-3.5 mr-2 mt-0.5 text-rose-500 fill-rose-500 shrink-0" />
                              <div className="text-[11px] text-slate-600">
                                <strong className="font-semibold text-slate-700">Volunteers:</strong>{' '}
                                {evt.volunteers.map((v: any) => v.userName).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Volunteer Request & Status System */}
                      {isMember && (() => {
                        const volunteerRequest = volunteers.find(v => v.eventId === evt.id);
                        return (
                          <div className="px-5 py-2.5 bg-rose-50/10 border-t border-slate-100 flex items-center justify-between text-xs">
                            {volunteerRequest ? (
                              <>
                                <div className="flex items-center space-x-1.5 font-sans">
                                  <span className="font-bold text-slate-500">Volunteer Status:</span>
                                  {volunteerRequest.status === 'Pending' && (
                                    <span className="bg-amber-100 text-amber-805 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                      Pending
                                    </span>
                                  )}
                                  {volunteerRequest.status === 'Approved' && (
                                    <span className="bg-emerald-100 text-emerald-805 px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Approved
                                    </span>
                                  )}
                                  {volunteerRequest.status === 'Rejected' && (
                                    <span className="bg-rose-100 text-rose-850 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                      Declined
                                    </span>
                                  )}
                                </div>

                                {volunteerRequest.status === 'Pending' && (
                                  <button
                                    onClick={() => handleWithdrawVolunteer(evt.id)}
                                    className="text-[10px] text-rose-600 hover:text-rose-850 font-black underline cursor-pointer"
                                  >
                                    Withdraw Volunteer Request
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-slate-450 text-[11px] font-medium">Contribute to this event</span>
                                <button
                                  onClick={() => {
                                    setApplyingEventId(evt.id);
                                    setMotivation('');
                                    setSkills('');
                                    setExperience('');
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                                >
                                  <span>Apply as Volunteer</span>
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Event RSVP Controls */}
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                        {rsvped ? (
                          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>You are RSVPed</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">RSVPs are open</span>
                        )}

                        {isMember ? (
                          <button
                            onClick={() => handleRSVP(evt.id, rsvped)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all cursor-pointer ${
                              rsvped
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
                                : 'bg-indigo-650 hover:bg-indigo-700 text-indigo-700 border border-slate-200 bg-white'
                            }`}
                          >
                            {rsvped ? 'Cancel RSVP' : 'Submit RSVP'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-1 rounded">
                            Members only access
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BULLETINS BLOCK */}
        {activeTab === 'bulletins' && (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active notices.</p>
                <p className="text-xs text-slate-450 mt-1">The board is currently clear.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`bg-white rounded-2xl p-6 border shadow-sm relative overflow-hidden ${
                      ann.isPinned ? 'border-indigo-600 ring-2 ring-indigo-50/50' : 'border-slate-200'
                    }`}
                  >
                    {ann.isPinned && (
                      <span className="absolute top-0 right-0 bg-indigo-650 text-indigo-600 text-[9px] font-extrabold uppercase px-3.5 py-1 rounded-bl-xl tracking-wider">
                        📌 PINNED NOTICE
                      </span>
                    )}

                    <h4 className="font-bold text-slate-905 text-base sm:text-lg font-sans pr-16">{ann.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Posted on {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                    
                    <p className="text-slate-650 text-sm mt-3 whitespace-pre-line leading-relaxed border-t border-slate-50 pt-3">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Volunteer Application Form modal */}
        {applyingEventId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 text-left">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Apply as Volunteer</span>
                </h3>
                <button
                  onClick={() => setApplyingEventId(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitVolunteerRequest} className="space-y-4 font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Why do you want to volunteer? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Describe your motivation..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    What skills can you contribute? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Graphic design, photography, teaching..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Previous volunteering experience <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Describe any past roles (internal or external)..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyingEventId(null)}
                    className="flex-grow py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-2 bg-rose-650 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Submit Volunteer Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
