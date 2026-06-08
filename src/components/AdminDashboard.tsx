import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Megaphone, Settings, TrendingUp, Check, X, ShieldAlert, Award, Star, Trash2, ArrowRight, ToggleLeft, Edit, PlusCircle, Bookmark, Eye, Layers, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { LineChart, BarChart } from './Charts';

interface AdminDashboardProps {
  user: any;
  onRefreshUser: () => void;
  onSelectCommunity: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onRefreshUser,
  onSelectCommunity,
}) => {
  // Admin-managed communities list
  const [managedComms, setManagedComms] = useState<any[]>([]);
  const [selectedCommId, setSelectedCommId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'members' | 'events' | 'announcements' | 'settings'>('analytics');

  // Sub-data inside community
  const [analytics, setAnalytics] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Helper to render role badges
  const renderRoleBadge = (role: string, roleId?: string) => {
    let letter = 'V';
    let badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    
    if (role === 'Community Admin' || role === 'Super Admin' || (roleId && roleId.startsWith('A'))) {
      letter = 'A';
      badgeStyle = 'bg-pink-50 text-pink-700 border-pink-200';
    } else if (role === 'Member' || (roleId && roleId.startsWith('M'))) {
      letter = 'M';
      badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250';
    }
    
    return (
      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide shrink-0 ${badgeStyle}`}>
        <span>{letter}</span>
        {roleId && <span className="font-mono font-medium opacity-80 text-[9px]">{roleId}</span>}
      </span>
    );
  };

  // Community Create / Edit Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isNew, setIsNew] = useState(false);
  
  // Forms
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCat, setCommCat] = useState('Tech');
  const [commCity, setCommCity] = useState('');
  const [commState, setCommState] = useState('');
  const [commLat, setCommLat] = useState('37.7749');
  const [commLon, setCommLon] = useState('-122.4194');
  const [commBanner, setCommBanner] = useState('');
  const [commLogo, setCommLogo] = useState('');

  // Event form states
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtLoc, setEvtLoc] = useState('');
  const [editingEvtId, setEditingEvtId] = useState<string | null>(null);

  // Announcement form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadManagedCommunities();
  }, [user]);

  useEffect(() => {
    if (selectedCommId) {
      loadCommunityWorkspaceData();
    }
  }, [selectedCommId, activeTab]);

  const loadManagedCommunities = async () => {
    setLoading(true);
    try {
      const resp = await api.getCommunities();
      // Filter where adminId matches user
      const list = resp.communities.filter((c) => c.adminId === user?.id);
      setManagedComms(list);
      
      if (list.length > 0) {
        setSelectedCommId(list[0].id);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to synchronize admin managed communities.');
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityWorkspaceData = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const [analResp, reqResp, memResp, detailsResp] = await Promise.all([
        api.getCommunityAnalytics(selectedCommId),
        api.getAdminRequests(selectedCommId),
        api.getAdminMembers(selectedCommId),
        api.getCommunity(selectedCommId)
      ]);

      setAnalytics(analResp.analytics);
      const rawRequests = reqResp.requests || [];
      setAllRequests(rawRequests);
      setPendingRequests(rawRequests.filter((r: any) => r.status === 'Pending' || r.status === 'pending'));
      setMembers(memResp.members);
      setEvents(detailsResp.events);
      setAnnouncements(detailsResp.announcements);

      // Populate settings form with current state
      const currentComm = detailsResp.community;
      setCommName(currentComm.name);
      setCommDesc(currentComm.description);
      setCommCat(currentComm.category);
      setCommCity(currentComm.city);
      setCommState(currentComm.state);
      setCommLat(currentComm.latitude.toString());
      setCommLon(currentComm.longitude.toString());
      setCommBanner(currentComm.banner);
      setCommLogo(currentComm.logo);

    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error pulling administrative indices for the selected community.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve Join Request (Approve/Reject)
  const handleResolveRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setSuccessMsg('');
    setErrorMsg('');
    setResolvingRequestId(requestId);
    try {
      if (status === 'approved') {
        const resp = await api.approveJoinRequest(requestId);
        setSuccessMsg(resp.message || 'Join request successfully approved!');
      } else {
        const resp = await api.rejectJoinRequest(requestId);
        setSuccessMsg(resp.message || 'Join request successfully rejected!');
      }
      await loadCommunityWorkspaceData();
      onRefreshUser(); // Sinks promoted user credentials and list data
    } catch (e: any) {
      setErrorMsg(e.message || 'Could not resolve membership join request');
    } finally {
      setResolvingRequestId(null);
    }
  };

  // Remove member from community
  const handleRemoveMember = async (userId: string) => {
    if (window.confirm('Are you positive you wish to remove this member from the community?')) {
      try {
        await api.removeMember(selectedCommId, userId);
        setSuccessMsg('Member successfully expelled from community.');
        loadCommunityWorkspaceData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  // Ban member from community
  const handleBanMember = async (userId: string) => {
    if (window.confirm('Are you positive you wish to BAN this member? This will block future requested entries.')) {
      try {
        await api.banMember(selectedCommId, userId);
        setSuccessMsg('Member successfully banned and blocked.');
        loadCommunityWorkspaceData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  // Promote Member to Moderator / Admin
  const handlePromoteMember = async (userId: string) => {
    if (window.confirm('Are you sure you want to promote this member to Community Admin? This will give them dashboard controls.')) {
      try {
        await api.assignModerator(selectedCommId, userId);
        setSuccessMsg('Member promoted successfully!');
        loadCommunityWorkspaceData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  // Create or update Community Metadata Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    const payload = {
      name: commName,
      description: commDesc,
      category: commCat,
      city: commCity,
      state: commState,
      latitude: Number(commLat),
      longitude: Number(commLon),
      banner: commBanner,
      logo: commLogo
    };

    try {
      await api.updateCommunity(selectedCommId, payload);
      setSuccessMsg('Community metadata saved successfully.');
      loadManagedCommunities();
    } catch (e: any) {
      setErrorMsg(e.message || 'Settings update failed.');
    }
  };

  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    const payload = {
      name: commName,
      description: commDesc,
      category: commCat,
      city: commCity,
      state: commState,
      latitude: Number(commLat),
      longitude: Number(commLon),
      banner: commBanner,
      logo: commLogo
    };

    try {
      const resp = await api.createCommunity(payload);
      setSuccessMsg(resp.message);
      setShowCreateModal(false);
      
      // Auto-refresh managed community rosters step
      const updatedResp = await api.getCommunities();
      const list = updatedResp.communities.filter((c) => c.adminId === user?.id);
      setManagedComms(list);
      if (list.length > 0) {
        setSelectedCommId(resp.community.id);
      }
      onRefreshUser();
    } catch (e: any) {
      setErrorMsg(e.message || 'Creation failed.');
    }
  };

  // Create Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    const payload = {
      title: evtTitle,
      description: evtDesc,
      eventDate: new Date(evtDate).toISOString(),
      location: evtLoc
    };

    try {
      if (editingEvtId) {
        await api.updateEvent(editingEvtId, payload);
        setSuccessMsg('Event rescheduled successfully.');
      } else {
        await api.createEvent(selectedCommId, payload);
        setSuccessMsg('New event scheduled successfully');
      }

      // Reset form fields
      setEvtTitle('');
      setEvtDesc('');
      setEvtDate('');
      setEvtLoc('');
      setEditingEvtId(null);
      loadCommunityWorkspaceData();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Delete this event? This action will purge all registered RSVPs.')) {
      try {
        await api.deleteEvent(eventId);
        setSuccessMsg('Event purged successfully.');
        loadCommunityWorkspaceData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  const handleEditEventClick = (evt: any) => {
    setEditingEvtId(evt.id);
    setEvtTitle(evt.title);
    setEvtDesc(evt.description);
    setEvtLoc(evt.location);
    // Format ISO string to browser datetime value
    const dateFormatted = evt.eventDate.substring(0, 16);
    setEvtDate(dateFormatted);
  };

  // Create Announcement
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    const payload = {
      title: annTitle,
      content: annContent,
      isPinned: annPinned
    };

    try {
      if (editingAnnId) {
        await api.updateAnnouncement(editingAnnId, payload);
        setSuccessMsg('Bulletin updated successfully.');
      } else {
        await api.createAnnouncement(selectedCommId, payload);
        setSuccessMsg('New bulletin announcement posted.');
      }

      setAnnTitle('');
      setAnnContent('');
      setAnnPinned(false);
      setEditingAnnId(null);
      loadCommunityWorkspaceData();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (window.confirm('Delete this announcement bulletin?')) {
      try {
        await api.deleteAnnouncement(annId);
        setSuccessMsg('Bulletin posted notice deleted successfully.');
        loadCommunityWorkspaceData();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  const handleEditAnnouncementClick = (ann: any) => {
    setEditingAnnId(ann.id);
    setAnnTitle(ann.title);
    setAnnContent(ann.content);
    setAnnPinned(!!ann.isPinned);
  };

  // Purge/Delete Community completely
  const handleDeleteCommunity = async () => {
    if (window.confirm(`⚠️ EXTREMELY CRITICAL: Are you absolutely positive you want to completely purge/delete the community "${commName}"? This registers as an irreversible transaction. All historical data, bulletins, events, and membership rosters will be deleted.`)) {
      try {
        await api.deleteCommunity(selectedCommId);
        alert('Community has been permanently deleted.');
        setManagedComms([]);
        setSelectedCommId('');
        loadManagedCommunities();
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  const handleOpenCreateModal = () => {
    // Clear default form states for new circle creation
    setCommName('');
    setCommDesc('');
    setCommCat('Tech');
    setCommCity('San Francisco');
    setCommState('California');
    setCommLat('37.7749');
    setCommLon('-122.4194');
    setCommBanner('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600');
    setCommLogo('https://api.dicebear.com/7.x/identicon/svg?seed=newCircle');
    setShowCreateModal(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-800 font-sans">
      
      {/* 👑 DASHBOARD GENERAL CONTROLLER TITLE BAR */}
      <section className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 border rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-905 tracking-tight flex items-center space-x-2">
            <span>Community Admin Workshop</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Coordinate calendars, announcements, and authorize memberships.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch New Circle</span>
        </button>
      </section>

      {successMsg && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-2.5 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Roster Empty warning if no communities managed */}
      {managedComms.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border text-center shadow-sm max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-850">You do not manage any communities yet.</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Click "Launch New Circle" at the top right to register and brand your very first CommunityHub space immediately!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Active Circle Selector / Sidebar Control */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Focus Circle</label>
                <select
                  value={selectedCommId}
                  onChange={(e) => setSelectedCommId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-750 focus:ring-1 focus:ring-indigo-500"
                >
                  {managedComms.map((comm) => (
                    <option key={comm.id} value={comm.id}>
                      {comm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sidebar Menu options */}
              <div className="divide-y divide-slate-100 font-sans text-xs pt-1">
                {[
                  { key: 'analytics', label: 'Analytics Dashboard', icon: TrendingUp },
                  { key: 'requests', label: `Pending Approvals (${pendingRequests.length})`, icon: Clock, counts: pendingRequests.length },
                  { key: 'members', label: `Authorize Members (${members.length})`, icon: Users },
                  { key: 'events', label: `Events Board (${events.length})`, icon: Calendar },
                  { key: 'announcements', label: `Notice Bulletins (${announcements.length})`, icon: Megaphone },
                  { key: 'settings', label: 'Branding & Meta Settings', icon: Settings },
                ].map((item: any) => {
                  const active = activeTab === item.key;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={`w-full text-left py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-between text-xs cursor-pointer ${
                        active
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${active ? 'text-indigo-650' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </span>
                      {item.counts !== undefined && item.counts > 0 && (
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {item.counts}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Community View Box */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <button
                onClick={() => onSelectCommunity(selectedCommId)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Open Public Portal</span>
              </button>
            </div>
          </div>

          {/* Active Workspace Console Pane */}
          <div className="lg:col-span-3">
            
            {/* 1. ANALYTICS CONSOLE SCREEN */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-6">
                {/* 5 Metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-sans">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Communities</span>
                    <h3 className="text-2xl font-black text-indigo-650 mt-1 font-mono">
                      {managedComms.length}
                    </h3>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Members</span>
                    <h3 className="text-2xl font-black text-rose-650 mt-1 font-mono">
                      {members.length}
                    </h3>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pending Requests</span>
                    <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
                      {allRequests.filter((r: any) => r.status === 'Pending' || r.status === 'pending').length}
                    </h3>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Approved Requests</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                      {allRequests.filter((r: any) => r.status === 'Approved' || r.status === 'approved').length}
                    </h3>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-250 shadow-sm flex flex-col justify-between">
                    <span className="text-slate-405 text-[10px] font-bold uppercase tracking-wider">Rejected Requests</span>
                    <h3 className="text-2xl font-black text-slate-500 mt-1 font-mono">
                      {allRequests.filter((r: any) => r.status === 'Rejected' || r.status === 'rejected').length}
                    </h3>
                  </div>
                </div>

                {/* Growth Line chart and Event RSVPs Bar graph */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-xs font-sans text-slate-400 uppercase tracking-wider mb-4">Membership Growth History</h4>
                    <LineChart data={analytics.growthStatistics} color="#4f46e5" label="Members" />
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-xs font-sans text-slate-400 uppercase tracking-wider mb-4">Event RSVP Rates</h4>
                    {analytics.eventParticipation.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-12">No event histories scheduled.</p>
                    ) : (
                      <BarChart 
                        data={analytics.eventParticipation.map((e: any) => ({ name: e.eventName, value: e.rsvps }))} 
                        color="#10b981" 
                        label="RSVPs" 
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PENDING REQUESTS CONSOLE */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-905">Review Access Requests</h3>
                    <p className="text-xs text-slate-500">Authorize or deny entry to pending platform profiles.</p>
                  </div>
                  <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    {pendingRequests.length} Requests Pending
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border text-center shadow-sm text-xs">
                    <Check className="w-10 h-10 text-emerald-500 bg-emerald-50 p-2.5 rounded-full mx-auto mb-2" />
                    <p className="font-bold text-slate-800">You are all caught up!</p>
                    <p className="text-slate-400 mt-1">There are no pending join requests active for this community.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                            <th className="py-3 px-4">Role ID</th>
                            <th className="py-3 px-4">Applicant</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Target Community</th>
                            <th className="py-3 px-4">Request Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {pendingRequests.map((req) => {
                            const matchingComm = managedComms.find(c => c.id === req.communityId);
                            const targetCommName = req.communityName || matchingComm?.name || commName;
                            const isResolvingThis = resolvingRequestId === req.id;
                            const isResolvingAny = resolvingRequestId !== null;

                            return (
                              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4">
                                  {renderRoleBadge('Visitor', req.roleId || 'V001')}
                                </td>
                                <td className="py-3.5 px-4 font-extrabold text-slate-800">
                                  {req.userName}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500">
                                  {req.userEmail}
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-700">
                                  {targetCommName}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 font-medium">
                                  {new Date(req.requestedAt || req.createdAt || new Date()).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800">
                                    Pending
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <button
                                      disabled={isResolvingAny}
                                      onClick={() => handleResolveRequest(req.id, 'approved')}
                                      className={`px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer transition-all ${
                                        isResolvingAny ? 'opacity-65 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      {isResolvingThis ? (
                                        <>
                                          <span className="animate-spin border-t-2 border-r-2 border-white rounded-full w-3 h-3 block"></span>
                                          <span>Approving...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Approve</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      disabled={isResolvingAny}
                                      onClick={() => handleResolveRequest(req.id, 'rejected')}
                                      className={`px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[10px] cursor-pointer transition-all border border-rose-100 ${
                                        isResolvingAny ? 'opacity-65 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      Reject
                                    </button>
                                  </div>
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

            {/* 3. MEMBERS DIRECTORY OVERVIEW */}
            {activeTab === 'members' && (() => {
              const filteredMembers = members.filter((m) => {
                const query = memberSearchQuery.toLowerCase().trim();
                if (!query) return true;
                return (
                  m.name?.toLowerCase().includes(query) ||
                  m.email?.toLowerCase().includes(query) ||
                  m.roleId?.toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Registered Community Directories</h3>
                      <p className="text-xs text-slate-500">Expel users, ban members, or appoint additional moderators.</p>
                    </div>
                    
                    {/* User searchable input */}
                    <div className="relative w-full sm:w-72">
                      <input
                        type="text"
                        placeholder="Search by Role ID, Name, or Email..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                      />
                      {memberSearchQuery && (
                        <button 
                          onClick={() => setMemberSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650 font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border text-center shadow-sm text-xs">
                      <p className="font-bold text-slate-800">No members found</p>
                      <p className="text-slate-450 mt-1">Try adapting your role ID, name, or email search terms.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
                      {filteredMembers.map((member) => (
                        <div key={member.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img src={member.profileImage} alt="" className="w-9 h-9 rounded-full border bg-slate-50" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 truncate">{member.name}</h4>
                                {renderRoleBadge(member.role, member.roleId)}
                                {member.isCreator && (
                                  <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[9px] rounded uppercase font-mono">
                                    Primary Creator
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-450 mt-0.5">{member.email}</p>
                            </div>
                          </div>

                          {/* Member management actions */}
                          {!member.isCreator && (
                            <div className="flex items-center space-x-1.5 self-end sm:self-center">
                              {member.role !== 'Community Admin' && (
                                <button
                                  onClick={() => handlePromoteMember(member.id)}
                                  title="Promote to admin"
                                  className="p-1.5 border hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Promote</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-500 text-[11px] font-semibold rounded-lg cursor-pointer"
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => handleBanMember(member.id)}
                                className="p-1.5 border border-rose-100 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                Ban
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. EVENTS MANAGER */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                
                {/* Event Creation Form */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 border-b pb-3 mb-4 flex items-center space-x-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>{editingEvtId ? 'Reschedule Active Meetup' : 'Schedule Community Meetup Assembly'}</span>
                  </h3>
                  
                  <form onSubmit={handleSaveEvent} className="space-y-4 text-xs font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Meetup Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SF Summer AI Hackathon"
                          value={evtTitle}
                          onChange={(e) => setEvtTitle(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Event Date & Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={evtDate}
                          onChange={(e) => setEvtDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Venue Assembly Location Detail</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Salesforce Tower, Floor 42, San Francisco, CA"
                        value={evtLoc}
                        onChange={(e) => setEvtLoc(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Detailed Assembly Summary</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Details, outline, required checklists..."
                        value={evtDesc}
                        onChange={(e) => setEvtDesc(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                      >
                        {editingEvtId ? 'Reschedule Event' : 'Schedule Event'}
                      </button>
                      {editingEvtId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvtId(null);
                            setEvtTitle('');
                            setEvtDesc('');
                            setEvtLoc('');
                            setEvtDate('');
                          }}
                          className="px-4 py-2 border rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List of active events */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-550 uppercase tracking-widest">Active Scheduled Calendars</h4>
                  
                  {events.length === 0 ? (
                    <p className="p-8 text-center bg-white border rounded-2xl text-xs text-slate-450 shadow-sm">
                      0 active events scheduled. Schedule your first meetup above!
                    </p>
                  ) : (
                    <div className="bg-white rounded-2xl border divide-y shadow-sm overflow-hidden text-xs">
                      {events.map((evt) => (
                        <div key={evt.id} className="p-4 flex items-center justify-between">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-905 truncate">{evt.title}</h4>
                            <p className="text-slate-450 tracking-wider text-[10px] font-mono mt-0.5">
                              📅 {new Date(evt.eventDate).toLocaleDateString()} &bull; 📍 {evt.location}
                            </p>
                            <p className="text-indigo-605 font-bold mt-1 text-[10px]">
                              {evt.attendees.length} RSVPs submitted
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditEventClick(evt)}
                              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg font-medium cursor-pointer"
                              title="Edit schedule details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 hover:bg-[rgba(244,63,94,0.08)] text-rose-600 rounded-lg cursor-pointer"
                              title="Cancel assembly"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. ANNOUNCEMENTS MODULE */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                
                {/* Announcement Creation Form */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-950 border-b pb-3 mb-4 flex items-center space-x-1.5 font-sans">
                    <Megaphone className="w-4 h-4 text-indigo-650" />
                    <span>{editingAnnId ? 'Edit Announcement Bulletin' : 'Draft Circle Notice Bulletin'}</span>
                  </h3>

                  <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Notice Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Welcome notice circular, schedules updates..."
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Content Block</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Draft the announcement content..."
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pin-chk"
                        checked={annPinned}
                        onChange={(e) => setAnnPinned(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="pin-chk" className="text-slate-650 font-semibold select-none cursor-pointer">
                        Pin this bulletin to the top of notice boards
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                      >
                        {editingAnnId ? 'Save Edits' : 'Publish Notice'}
                      </button>
                      {editingAnnId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnnId(null);
                            setAnnTitle('');
                            setAnnContent('');
                            setAnnPinned(false);
                          }}
                          className="px-4 py-2 border rounded-xl bg-slate-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List of Notices */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-550 uppercase tracking-widest font-sans">Bulletin Boards History</h4>
                  
                  {announcements.length === 0 ? (
                    <p className="p-8 text-center bg-white border rounded-2xl text-xs text-slate-450 shadow-sm">
                      0 active announcements. Publish your first notice circular above!
                    </p>
                  ) : (
                    <div className="bg-white rounded-2xl border divide-y shadow-sm overflow-hidden text-xs">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="p-4 flex items-center justify-between">
                          <div className="min-w-0 pr-4">
                            <div className="flex items-center space-x-1.5">
                              {ann.isPinned && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  Pinned
                                </span>
                              )}
                              <h4 className="font-extrabold text-slate-900 truncate">{ann.title}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Posted on {new Date(ann.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-slate-500 text-[11px] truncate mt-1">{ann.content}</p>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleEditAnnouncementClick(ann)}
                              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-1.5 hover:bg-[rgba(244,63,94,0.08)] text-rose-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. SETTINGS BRANDING WORKBOARD */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="border-b pb-4 mb-6">
                  <h3 className="text-base font-bold text-slate-905">Branding & Meta Configuration</h3>
                  <p className="text-xs text-slate-500">Edit graphic banners, logos, category tags, and geographic coordinates.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Community Public Name</label>
                      <input
                        type="text"
                        required
                        value={commName}
                        onChange={(e) => setCommName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Focus Category Tag</label>
                      <select
                        value={commCat}
                        onChange={(e) => setCommCat(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                      >
                        {['Tech', 'College', 'Startup', 'Sports', 'NGO', 'Cultural', 'Gaming'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Registered Region City</label>
                      <input
                        type="text"
                        required
                        value={commCity}
                        onChange={(e) => setCommCity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Registered District State</label>
                      <input
                        type="text"
                        required
                        value={commState}
                        onChange={(e) => setCommState(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">GPS Latitude Coordinate</label>
                      <input
                        type="text"
                        required
                        value={commLat}
                        onChange={(e) => setCommLat(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">GPS Longitude Coordinate</label>
                      <input
                        type="text"
                        required
                        value={commLon}
                        onChange={(e) => setCommLon(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Graphic Logo Image URL</label>
                    <input
                      type="text"
                      required
                      value={commLogo}
                      onChange={(e) => setCommLogo(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Graphic Banner Image URL</label>
                    <input
                      type="text"
                      required
                      value={commBanner}
                      onChange={(e) => setCommBanner(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Detailed Circle Description</label>
                    <textarea
                      required
                      rows={4}
                      value={commDesc}
                      onChange={(e) => setCommDesc(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="submit"
                      className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
                    >
                      Save Branding Meta
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCommunity}
                      className="px-4.5 py-2.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-650 font-bold border border-rose-100 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Purge Circle Completely
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE NEW CIRCLE MODAL POPUP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-950 text-white">
              <h3 className="font-extrabold text-sm sm:text-base font-sans flex items-center space-x-1.5">
                <Plus className="w-5 h-5 text-indigo-300" />
                <span>Initialize & Launch New Circle</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunitySubmit} className="p-6 text-xs font-sans space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Community Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bay Area Hackers"
                    value={commName}
                    onChange={(e) => setCommName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Category Focus</label>
                  <select
                    value={commCat}
                    onChange={(e) => setCommCat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border rounded-xl text-slate-700"
                  >
                    {['Tech', 'College', 'Startup', 'Sports', 'NGO', 'Cultural', 'Gaming'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Home Region City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. San Francisco"
                    value={commCity}
                    onChange={(e) => setCommCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Home District State</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. California"
                    value={commState}
                    onChange={(e) => setCommState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">GPS Latitude</label>
                  <input
                    type="text"
                    required
                    value={commLat}
                    onChange={(e) => setCommLat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">GPS Longitude</label>
                  <input
                    type="text"
                    required
                    value={commLon}
                    onChange={(e) => setCommLon(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Branded Logo Image URL (Square)</label>
                <input
                  type="text"
                  required
                  value={commLogo}
                  onChange={(e) => setCommLogo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Branded Banner Graphic URL</label>
                <input
                  type="text"
                  required
                  value={commBanner}
                  onChange={(e) => setCommBanner(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Introductory description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summary values, target cohorts, schedules details..."
                  value={commDesc}
                  onChange={(e) => setCommDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl leading-relaxed outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-xl bg-slate-50 text-slate-600 font-semibold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer text-xs"
                >
                  Confirm & Launch Circular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
