import React, { useState, useEffect } from 'react';
import { Compass, Bell, Shield, LogOut, ChevronDown, RefreshCw, UserCheck, ShieldAlert, Check } from 'lucide-react';
import { api } from '../lib/api';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onTriggerAuth: (tab?: 'login' | 'register') => void;
  onRoleChange: (newRole: 'Visitor' | 'Member' | 'Community Admin') => void;
  onChangeTab: (tab: string) => void;
  currentTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onTriggerAuth,
  onRoleChange,
  onChangeTab,
  currentTab,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Poll notifications every 15s for high fidelity
      const int = setInterval(loadNotifications, 15000);
      return () => clearInterval(int);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const resp = await api.getNotifications();
      setNotifications(resp.notifications);
    } catch (e) {
      console.error('Failed to pull background alert notifications', e);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.readNotification(id);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadAll = async () => {
    try {
      await api.readAllNotifications();
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      
      {/* 🛠️ DEVELOPER SANDBOX INJECT (Super useful for reviewing or testing) */}
      <div className="bg-slate-900 text-slate-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="font-medium text-slate-300">
            <strong>SaaS Simulation Sandbox:</strong> Test permissions by swapping user roles on-the-fly!
          </p>
        </div>
        <div className="flex items-center space-x-1">
          {(['Visitor', 'Member', 'Community Admin'] as const).map((r) => {
            const active = user?.role === r || (!user && r === 'Visitor');
            return (
              <button
                key={r}
                onClick={() => onRoleChange(r as any)}
                className={`px-2.5 py-0.5 rounded font-sans font-semibold text-[10px] sm:text-xs transition-all pointer-events-auto cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                }`}
              >
                {r === 'Visitor' ? 'Visitor' : r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        
        {/* Brand Logo and Link */}
        <div className="flex items-center space-x-8">
          <button
            onClick={() => onChangeTab('discover')}
            className="flex items-center space-x-2 bg-transparent border-0 p-0 text-slate-950 font-extrabold text-lg tracking-tight font-sans cursor-pointer outline-none"
          >
            <Compass className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <span className="bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
              Community<span className="text-blue-600 font-extrabold"> Nexus</span>
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 font-sans text-xs">
            {user && (
              <button
                onClick={() => onChangeTab('selector')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  currentTab === 'selector'
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-150 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Perspective Hub
              </button>
            )}

            <button
              onClick={() => onChangeTab('discover')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentTab === 'discover' || currentTab === 'detail'
                  ? 'bg-slate-100 text-indigo-700 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Browse communities
            </button>

            {user && (
              <>
                <button
                  onClick={() => onChangeTab('member')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentTab === 'member' 
                      ? 'bg-slate-100 text-indigo-700 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Member Space
                </button>

                <button
                  onClick={() => onChangeTab('admin')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentTab === 'admin' 
                      ? 'bg-slate-100 text-indigo-700 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Community Admin
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-4">
          
          {user ? (
            <>
              {/* Notification Bell with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all outline-none relative cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-xs">Alert Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleReadAll}
                          className="text-[10px] text-indigo-600 font-semibold hover:underline bg-transparent"
                        >
                          Clear all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-400">0 notifications in logs.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif.id)}
                            className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                              !notif.isRead ? 'bg-indigo-50/40 font-medium' : ''
                            }`}
                          >
                            <p className="text-slate-700 leading-normal">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile drop-down */}
              <div className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className="flex items-center space-x-2 p-1 rounded-xl text-slate-700 hover:bg-slate-50 transition-all cursor-pointer outline-none"
                >
                  <img
                    src={user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-indigo-200"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                    <span className="text-[9px] text-indigo-600 font-semibold tracking-wider uppercase leading-none mt-0.5 block">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 py-1.5">
                    <div className="px-4 py-2 border-b border-slate-50">
                      <p className="font-bold text-xs truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-450 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => { setProfileOpen(false); onChangeTab('member'); }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center space-x-2 text-slate-700 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-500" />
                      <span>My profile workspace</span>
                    </button>

                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 flex items-center space-x-2 text-rose-600 cursor-pointer border-t border-slate-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onTriggerAuth('login')}
                className="px-3 py-1.5 text-xs font-sans font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onTriggerAuth('register')}
                className="px-3.5 py-1.5 text-xs font-sans font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Join Community Nexus
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
