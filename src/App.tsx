import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { VisitorPortal } from './components/VisitorPortal';
import { CommunityDetail } from './components/CommunityDetail';
import { MemberDashboard } from './components/MemberDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicProfileModal } from './components/PublicProfileModal';
import { api } from './lib/api';
import { 
  Compass, 
  Users, 
  Shield, 
  ArrowRight, 
  Lock, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  UserPlus, 
  Key, 
  MapPin, 
  Globe, 
  AlertCircle, 
  LogOut,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'discover' | 'member' | 'admin' | 'selector'>('selector');
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Modals & triggers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Clickable public profiles
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<any | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  useEffect(() => {
    if (profileModalUserId) {
      loadProfileModalUser(profileModalUserId);
    } else {
      setProfileModalUser(null);
    }
  }, [profileModalUserId]);

  const loadProfileModalUser = async (id: string) => {
    setProfileModalLoading(true);
    try {
      const resp = await api.getUserProfile(id);
      setProfileModalUser(resp.profile);
    } catch (e) {
      console.error('Failed to load profile details client-side', e);
    } finally {
      setProfileModalLoading(false);
    }
  };

  // Inline Log In / Register Form States for full screen login gate
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineName, setInlineName] = useState('');
  const [inlineRole, setInlineRole] = useState<'Member' | 'Community Admin'>('Member');
  const [inlineError, setInlineError] = useState('');
  const [inlineSuccess, setInlineSuccess] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);

  // App startup initializations
  useEffect(() => {
    syncUserSession();
  }, []);

  const syncUserSession = async () => {
    try {
      const activeUser = await api.getCurrentUser();
      setUser(activeUser);
      if (activeUser) {
        setCurrentTab('selector');
      }
    } catch (e) {
      console.warn('Session inactive or expired. Please sign in.');
      setUser(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setSelectedCommunityId(null);
    setCurrentTab('selector');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTriggerAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleLoginSuccess = async (loggedInUser: any) => {
    setUser(loggedInUser);
    setAuthModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
    setCurrentTab('selector');
  };

  // Safe login handler for Inline forms
  const handleInlineLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');
    setInlineSuccess('');
    setInlineLoading(true);
    try {
      const data = await api.login(inlineEmail, inlinePassword);
      localStorage.setItem('communityhub_token', data.token);
      setInlineSuccess('Successfully authenticated! Synchronizing workspace... 🎉');
      setTimeout(() => {
        setUser(data.user);
        setCurrentTab('selector');
        setRefreshTrigger((prev) => prev + 1);
        setInlineLoading(false);
      }, 1000);
    } catch (err: any) {
      setInlineError(err.message || 'Verification failed. Please review your email & password.');
      setInlineLoading(false);
    }
  };

  // Safe registration handler for Inline forms
  const handleInlineRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');
    setInlineSuccess('');
    setInlineLoading(true);
    
    const payload = {
      name: inlineName,
      email: inlineEmail,
      password: inlinePassword,
      role: inlineRole,
      location: {
        latitude: 17.3850,
        longitude: 78.4867,
        city: 'Hyderabad',
        state: 'Telangana'
      },
      interests: ['TS/JS Coding', 'AI/ML Agents', 'Startup Pitching']
    };

    try {
      const data = await api.register(payload);
      localStorage.setItem('communityhub_token', data.token);
      setInlineSuccess('Account registered successfully! Loading selection hub... 🚀');
      setTimeout(() => {
        setUser(data.user);
        setCurrentTab('selector');
        setRefreshTrigger((prev) => prev + 1);
        setInlineLoading(false);
      }, 1000);
    } catch (err: any) {
      setInlineError(err.message || 'Registration failed. Try using another email.');
      setInlineLoading(false);
    }
  };

  const handleRoleChangedSandbox = async (newRole: string) => {
    if (!user) {
      // Automatic quick demonstration logins
      setInlineLoading(true);
      try {
        const emailToLogin = newRole === 'Community Admin' ? 'tech_admin@communityhub.com' : 'member1@communityhub.com';
        const data = await api.login(emailToLogin, 'password123');
        localStorage.setItem('communityhub_token', data.token);
        
        let loggedInUser = data.user;
        setUser(loggedInUser);
        setRefreshTrigger((prev) => prev + 1);

        if (newRole === 'Visitor') {
          // Switch automatically on DB store
          await api.changeUserRole(loggedInUser.id, 'Visitor');
          const refreshed = await api.getCurrentUser();
          setUser(refreshed);
          setCurrentTab('discover');
        } else if (newRole === 'Community Admin') {
          await api.changeUserRole(loggedInUser.id, 'Community Admin');
          const refreshed = await api.getCurrentUser();
          setUser(refreshed);
          setCurrentTab('admin');
        } else {
          await api.changeUserRole(loggedInUser.id, 'Member');
          const refreshed = await api.getCurrentUser();
          setUser(refreshed);
          setCurrentTab('member');
        }
      } catch (err) {
        console.error('Failed auto logging in', err);
        setInlineError('Demonstration login failed. Please write credentials manually.');
      } finally {
        setInlineLoading(false);
      }
      return;
    }

    try {
      // Synchronize role change on server database
      await api.changeUserRole(user.id, newRole);
      // Refresh user profile states
      await syncUserSession();
      setRefreshTrigger((prev) => prev + 1);
      
      // Auto-navigate to correct view
      if (newRole === 'Community Admin') {
        setCurrentTab('admin');
      } else if (newRole === 'Member') {
        setCurrentTab('member');
      } else {
        setCurrentTab('discover');
      }
    } catch (e) {
      console.error('Failed to swap roles in Sandbox.', e);
    }
  };

  const handleSelectCommunity = (id: string | null) => {
    setSelectedCommunityId(id);
    if (id !== null) {
      // Clear tab focus so we render detail instead
      setCurrentTab('discover');
    }
  };

  // Loader for checking session
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans p-6">
        <Compass className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-tight">Initializing CommunityHub...</h2>
        <p className="text-xs text-slate-400 mt-1">Acquiring cryptographic session clearance</p>
      </div>
    );
  }

  // FORCE LOGIN FIRST: If no user is authenticated, we display the login gateway directly
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
        <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-900 font-extrabold text-lg font-sans tracking-tight">
              <Compass className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
              <span>Community<span className="text-indigo-600">Hub</span></span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border">
              Distance Engine v1.0 • Live Sandbox
            </span>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left side: Premium Branding & Core role capabilities description */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white flex flex-col justify-between space-y-12">
              <div>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 mb-8">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interactive Role-Based Portal</span>
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight font-sans text-white leading-tight">
                  Welcome to CommunityHub
                </h1>
                <p className="text-sm text-indigo-200/85 mt-3 leading-relaxed">
                  Join hyper-local circles, manage neighborhood notice boards, schedule matches, and calculate GPS Haversine distances instantly.
                </p>
              </div>

              {/* Highlight capability cards */}
              <div className="space-y-6">
                <div className="flex items-start space-x-3.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4 text-indigo-300" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">🌐 Visitor Perspective</h4>
                    <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-snug">
                      Discover public maps, search near latitudes, and preview coordinates globally.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-300" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">👥 Member Space</h4>
                    <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-snug">
                      Join active local circles, set interests checklists, and schedule interactive fixtures.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-pink-300" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">🛡️ Admin Clearance Panel</h4>
                    <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-snug">
                      Approve pending request entries, launch local notice bulletins, and monitor analytics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-indigo-300 font-mono">
                Security clearance level: JWT HS256 Active
              </div>
            </div>

            {/* Right side: Login & Register Interactive Panel */}
            <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
              
              {inlineError && (
                <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inlineError}</span>
                </div>
              )}

              {inlineSuccess && (
                <div className="p-3 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center space-x-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{inlineSuccess}</span>
                </div>
              )}

              {!isRegisterMode ? (
                /* INLINE SIGN IN FORM */
                <form onSubmit={handleInlineLoginSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to begin</h2>
                    <p className="text-xs text-slate-500 mt-1">Please authenticate with your account credentials.</p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="Email address (e.g. member1@communityhub.com)"
                        value={inlineEmail}
                        onChange={(e) => setInlineEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="Secret account password"
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={inlineLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-200 flex items-center justify-center space-x-2 text-sm cursor-pointer"
                  >
                    <span>{inlineLoading ? 'Authenticating credentials...' : 'Enter Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(true); setInlineError(''); }}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Create an account free
                    </button>
                  </div>
                </form>
              ) : (
                /* INLINE SIGN UP FORM */
                <form onSubmit={handleInlineRegisterSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create your profile</h2>
                    <p className="text-xs text-slate-500 mt-1">Register dynamic location coordinates today.</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />

                    <input
                      type="email"
                      required
                      placeholder="Your email address"
                      value={inlineEmail}
                      onChange={(e) => setInlineEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />

                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={inlinePassword}
                      onChange={(e) => setInlinePassword(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Default Clearance Level
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setInlineRole('Member')}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            inlineRole === 'Member'
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Member Level
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineRole('Community Admin')}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            inlineRole === 'Community Admin'
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Community Admin
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={inlineLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm cursor-pointer"
                  >
                    <span>{inlineLoading ? 'Registering your profile...' : 'Register Profile'}</span>
                    <UserPlus className="w-4 h-4" />
                  </button>

                  <div className="text-center text-xs text-slate-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegisterMode(false); setInlineError(''); }}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Login now
                    </button>
                  </div>
                </form>
              )}

              {/* HELPFUL AUTOFILL ASSISTANT */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-[10.5px] font-extrabold text-slate-500 tracking-wider uppercase mb-3 flex items-center space-x-1.5 font-sans">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                  <span>Select Account to Autofill Login Form:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setInlineEmail('member1@communityhub.com');
                      setInlinePassword('password123');
                      setIsRegisterMode(false);
                      setInlineError('');
                    }}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex flex-col items-start cursor-pointer group text-left"
                  >
                    <span className="text-[11px] font-extrabold text-indigo-700 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Regular Member Profile</span>
                    </span>
                    <span className="text-[10px] text-slate-505 mt-1 font-mono">
                      member1@communityhub.com
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInlineEmail('tech_admin@communityhub.com');
                      setInlinePassword('password123');
                      setIsRegisterMode(false);
                      setInlineError('');
                    }}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex flex-col items-start cursor-pointer group text-left"
                  >
                    <span className="text-[11px] font-extrabold text-pink-700 flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Community Admin Profile</span>
                    </span>
                    <span className="text-[10px] text-slate-505 mt-1 font-mono">
                      tech_admin@communityhub.com
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2.5 italic text-center leading-normal">
                  Clicking either option above instantly prepares the sign-in credentials. Then, press <strong className="text-slate-650">Enter Workspace</strong>.
                </p>
              </div>

            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} CommunityHub Inc. Registered local authentication node.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      
      {/* 🧭 NAVIGATION HEADER */}
      <Navbar
        user={user}
        currentTab={selectedCommunityId ? 'detail' : currentTab}
        onChangeTab={(tab) => {
          setSelectedCommunityId(null);
          if (tab === 'discover') {
            handleRoleChangedSandbox('Visitor');
          } else if (tab === 'member') {
            handleRoleChangedSandbox('Member');
          } else if (tab === 'admin') {
            handleRoleChangedSandbox('Community Admin');
          } else if (tab === 'selector') {
            setCurrentTab('selector');
          } else {
            setCurrentTab(tab as any);
          }
        }}
        onTriggerAuth={() => handleTriggerAuth('login')}
        onLogout={handleLogout}
        onRoleChange={handleRoleChangedSandbox}
      />

      {/* 🛠️ ACTIVE PORTAL PERSPECTIVE CONTROLLER */}
      {user && (
        <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight">
                    Active Portal Workspace Selector
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                    Live Role Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Toggle perspective panels directly. Swapping roles grants respective options in the app.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto self-stretch sm:self-auto shrink-0">
              
              {/* Back to choice desk selector button */}
              {currentTab !== 'selector' && (
                <button
                  onClick={() => setCurrentTab('selector')}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-250 shrink-0"
                >
                  <span>&larr; Back to Portal Choices</span>
                </button>
              )}

              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 Grow sm:grow-0">
                {/* 🌐 VISITOR PORTAL BUTTON */}
                <button
                  id="portal-btn-visitor"
                  onClick={() => handleRoleChangedSandbox('Visitor')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    currentTab === 'discover' && (user.role === 'Visitor' || !user)
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Visitor Portal</span>
                  <span className="sm:hidden">Visitor</span>
                </button>

                {/* 👥 MEMBER PORTAL BUTTON */}
                <button
                  id="portal-btn-member"
                  onClick={() => handleRoleChangedSandbox('Member')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    currentTab === 'member' && user.role === 'Member'
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Member Space</span>
                  <span className="sm:hidden">Member</span>
                </button>

                {/* 🛠️ ADMIN PORTAL BUTTON */}
                <button
                  id="portal-btn-admin"
                  onClick={() => handleRoleChangedSandbox('Community Admin')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    currentTab === 'admin' && user.role === 'Community Admin'
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin Desk</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🚀 WORKSPACE CONTENT CANVAS */}
      <main className="flex-grow pb-16">
        {selectedCommunityId ? (
          /* SINGLE COMMUNITY SHEET VIEW */
          <CommunityDetail
            communityId={selectedCommunityId}
            user={user}
            onBack={() => handleSelectCommunity(null)}
            onTriggerAuth={() => handleTriggerAuth('login')}
            onRefreshList={() => setRefreshTrigger((prev) => prev + 1)}
            onViewProfile={(id) => setProfileModalUserId(id)}
          />
        ) : (
          /* TAB DASHBOARD SCREEN VIEWS & SELECTOR GATEWAYS */
          <>
            {currentTab === 'selector' && (
              <div className="max-w-6xl mx-auto px-4 py-8 mt-4">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Workspace Access Granted • User: {user.name}</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight font-sans">
                    Choose Your Portal Perspective
                  </h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Select a core workspace below. Each option opens custom dashboards, tools, coordination maps, and authorization grids.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* VISITOR CARD */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between hover:border-slate-300 transform hover:-translate-y-1 duration-200">
                    <div>
                      <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-5 shadow-xs">
                        <Compass className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">Visitor Portal</h3>
                      <p className="text-[10px] text-indigo-650 font-bold mt-1 uppercase tracking-wider mb-4">
                        General Public Directory Space
                      </p>

                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        By selecting this option, you acquire the visitor perspective to view general directories without local commitment.
                      </p>

                      <div className="space-y-2.5 border-t border-slate-100 pt-4 mb-6">
                        <p className="text-xs font-bold text-slate-800">Gives options to:</p>
                        <ul className="space-y-1.5 text-xs text-slate-500">
                          <li className="flex items-start space-x-2">
                            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Discover and search societies near your coordinates</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Calculate commute miles using real GPS Haversine formulas</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Filter global clusters by customizable distance radius bounds</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Preview beautiful interactive location mapping interfaces</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRoleChangedSandbox('Visitor')}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-indigo-150 flex items-center justify-center space-x-1 cursor-pointer group"
                    >
                      <span>Launch Visitor View</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* MEMBER CARD */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between hover:border-emerald-300 transform hover:-translate-y-1 duration-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                      Highly Recommended
                    </div>

                    <div>
                      <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-650 mb-5 shadow-xs">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">Member Space</h3>
                      <p className="text-[10px] text-emerald-650 font-bold mt-1 uppercase tracking-wider mb-4">
                        Private Joined Circles & Alerts
                      </p>

                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        By selecting this option, you enter as an authenticated community resident to participate in local activities and interest squads.
                      </p>

                      <div className="space-y-2.5 border-t border-slate-100 pt-4 mb-6">
                        <p className="text-xs font-bold text-slate-800">Gives options to:</p>
                        <ul className="space-y-1.5 text-xs text-slate-500">
                          <li className="flex items-start space-x-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Browse your personal current joined neighborhood circles</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Select and customize your personal interests checklist</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Receive immediate community admin alerts & bulletin notices</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>RSVP directly to schedules and submit instant join requests</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRoleChangedSandbox('Member')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-emerald-150 flex items-center justify-center space-x-1 cursor-pointer group"
                    >
                      <span>Launch Member Space</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* ADMIN DEFENDER CARD */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between hover:border-pink-300 transform hover:-translate-y-1 duration-200">
                    <div>
                      <div className="w-12 h-12 bg-pink-50 border border-pink-100 rounded-2xl flex items-center justify-center text-pink-650 mb-5 shadow-xs">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">Community Admin</h3>
                      <p className="text-[10px] text-pink-600 font-bold mt-1 uppercase tracking-wider mb-4">
                        Host Supervision Panel
                      </p>

                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        By selecting this option, you secure host clearance access to supervise rosters, dispatch alerts and inspect dashboard analytics.
                      </p>

                      <div className="space-y-2.5 border-t border-slate-100 pt-4 mb-6">
                        <p className="text-xs font-bold text-slate-800">Gives options to:</p>
                        <ul className="space-y-1.5 text-xs text-slate-500">
                          <li className="flex items-start space-x-2">
                            <span className="text-pink-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Review and authorize pending neighborhood membership applications</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-pink-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Write and publish bulletins instantly on community boards</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-pink-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Schedule, edit and manage local neighborhood events rosters</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-pink-500 font-bold shrink-0 mt-0.5">•</span>
                            <span>Inspect dynamic registrations metrics and member counts charts</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRoleChangedSandbox('Community Admin')}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1 cursor-pointer group"
                    >
                      <span>Launch Admin Desk</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'discover' && (
              <VisitorPortal
                user={user}
                onSelectCommunity={handleSelectCommunity}
                onTriggerAuth={handleTriggerAuth}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentTab === 'member' && user && (
              <MemberDashboard
                user={user}
                onRefreshUser={syncUserSession}
                onSelectCommunity={handleSelectCommunity}
                onViewProfile={(id) => setProfileModalUserId(id)}
              />
            )}

            {currentTab === 'admin' && user && (
              <AdminDashboard
                user={user}
                onRefreshUser={syncUserSession}
                onSelectCommunity={handleSelectCommunity}
                onViewProfile={(id) => setProfileModalUserId(id)}
              />
            )}
          </>
        )}
      </main>

      {/* 📊 FOOTER BRANDS DECLARATIONS */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400 font-sans font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="font-medium">
            &copy; {new Date().getFullYear()} CommunityHub Inc. All rights reserved. Registered SaaS.
          </p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-650 transition-colors font-mono">Precision RBAC Enabled</span>
            <span>&bull;</span>
            <span className="hover:text-slate-650 transition-colors font-mono">Distance Haversine Core v1.0</span>
          </div>
        </div>
      </footer>

      {/* 🔑 SIGNIN / SIGNUP MODAL OVERLAYS */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 👥 PUBLIC PROFILE VIEWER MODAL */}
      <PublicProfileModal
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        userId={profileModalUserId}
        profile={profileModalUser}
        loading={profileModalLoading}
      />

    </div>
  );
}
