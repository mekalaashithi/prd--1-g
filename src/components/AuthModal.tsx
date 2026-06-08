import React, { useState } from 'react';
import { X, Mail, Lock, User, MapPin, Tag, ArrowRight, Compass } from 'lucide-react';
import { api } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any, token: string) => void;
  onLoginSuccess?: (user: any) => void;
  defaultTab?: 'login' | 'register';
  initialTab?: 'login' | 'register';
}

const INTEREST_OPTIONS = [
  'TS/JS Coding',
  'Startup Pitching',
  'AI/ML Agents',
  'Outdoor Running',
  'Football & Soccer',
  'Tabletop Boardgames',
  'Composting & Compost',
  'Poetry & Theatre Slams'
];

const PRESET_LOCATIONS = [
  { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194, city: 'San Francisco', state: 'California' },
  { name: 'Oakland, CA', lat: 37.8044, lon: -122.2711, city: 'Oakland', state: 'California' },
  { name: 'San Jose, CA', lat: 37.3382, lon: -121.8863, city: 'San Jose', state: 'California' },
  { name: 'Berkeley, CA', lat: 37.8715, lon: -122.2730, city: 'Berkeley', state: 'California' },
  { name: 'San Rafael, CA', lat: 37.9735, lon: -122.5311, city: 'San Rafael', state: 'California' }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  defaultTab = 'login',
  initialTab,
}) => {
  const resolvedTab = initialTab || defaultTab;
  const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'reset'>(resolvedTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Member' | 'Community Admin'>('Member');
  
  // Geolocation preset
  const [locationIdx, setLocationIdx] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('communityhub_token', data.token);
      if (onSuccess) {
        onSuccess(data.user, data.token);
      } else if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed, please inspect credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const locPreset = PRESET_LOCATIONS[locationIdx];
    const payload = {
      name,
      email,
      password,
      role,
      location: {
        latitude: locPreset.lat,
        longitude: locPreset.lon,
        city: locPreset.city,
        state: locPreset.state,
      },
      interests: selectedInterests,
    };

    try {
      const data = await api.register(payload);
      localStorage.setItem('communityhub_token', data.token);
      if (onSuccess) {
        onSuccess(data.user, data.token);
      } else if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const resp = await api.forgotPassword(email);
      setSuccess(resp.message);
      // Automatically navigate to reset phase after a brief delay
      setTimeout(() => {
        setTab('reset');
        setError('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const resp = await api.resetPassword(email, password);
      setSuccess(resp.message + ' Navinating back to log in...');
      setTimeout(() => {
        setTab('login');
        setPassword('');
        setError('');
        setSuccess('');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 w-full" />

        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center space-x-2.5 mb-6 text-indigo-700 font-sans">
            <Compass className="w-7 h-7 text-indigo-600" />
            <span className="text-xl font-bold tracking-tight">CommunityHub Portal</span>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
              {success}
            </div>
          )}

          {/* LOGIN VIEW */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold font-sans text-slate-900">Sign in to your account</h3>
                <p className="text-slate-500 text-sm mt-1">Discover, build, and organize local circles.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Email address (e.g. member1@communityhub.com)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setError(''); setSuccess(''); }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Forgot your password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-200/50 flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                <span>{loading ? 'Verifying Credentials...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-xs text-slate-500 pt-2">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(''); }}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Create an account
                </button>
              </div>

              {/* Developer Tip Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                <p className="font-bold mb-1 text-indigo-700">💡 Testing tip:</p>
                <p>Login with <code className="bg-white px-1 border rounded text-rose-600 font-mono">member1@communityhub.com</code> (Member) or <code className="bg-white px-1 border rounded text-indigo-600 font-mono">tech_admin@communityhub.com</code> (Colleges & Tech Admin) with <code className="bg-white px-1 border rounded text-indigo-600 font-mono">password123</code> to test and swap roles!</p>
              </div>
            </form>
          )}

          {/* REGISTER VIEW */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <h3 className="text-xl font-bold font-sans text-slate-900">Create global profile</h3>
                <p className="text-slate-400 text-xs mt-1">Get custom local match distances immediately.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Create Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">REGISTER CLEARANCE ROLE</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('Member')}
                      className={`py-2 text-center text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        role === 'Member'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('Community Admin')}
                      className={`py-2 text-center text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        role === 'Community Admin'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Community Admin
                    </button>
                  </div>
                </div>

                {/* Location Select (for mock discovery index computations) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>CHOOSE SEARCH FOCUS CENTER (MOCK GEOLOCATION)</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs bg-white text-slate-700"
                    value={locationIdx}
                    onChange={(e) => setLocationIdx(Number(e.target.value))}
                  >
                    {PRESET_LOCATIONS.map((loc, i) => (
                      <option key={i} value={i}>
                        {loc.name} (Simulated center: {loc.lat}, {loc.lon})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interests Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>INTEREST LABELS</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_OPTIONS.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-2.5 py-1 text-[10px] sm:text-xs rounded-full border transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-200/50 flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                <span>{loading ? 'Creating Profile...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); }}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Sign in instead
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold font-sans text-slate-900">Forgot Password?</h3>
                <p className="text-slate-500 text-sm mt-1">Enter your email and we will send you matching key tokens.</p>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-200/50 text-sm cursor-pointer"
              >
                {loading ? 'Sending Recovery Code...' : 'Send Recovery Token'}
              </button>

              <div className="text-center text-xs">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Return to login
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD */}
          {tab === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold font-sans text-slate-900">Configure New Password</h3>
                <p className="text-slate-500 text-sm mt-1">Type in a new security key phrase below.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Confirm your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter New Password Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-200/50 text-sm cursor-pointer"
              >
                {loading ? 'Resetting Security Key...' : 'Reset Security Phrase'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
