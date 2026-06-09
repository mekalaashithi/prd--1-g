import React from 'react';
import { X, MapPin, Trophy, Star, Flame, Award, Calendar, Users, Zap, Compass } from 'lucide-react';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  profile: any;
  loading: boolean;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  profile,
  loading,
}) => {
  if (!isOpen || !userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header Ribbon Decoration */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 w-full flex-shrink-0" />

        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <Compass className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Retrieving community credentials...</p>
          </div>
        ) : !profile ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-semibold">Unable to fetch profile properties.</p>
            <p className="text-xs mt-1">Please ensure user is valid and exists.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-grow p-6 sm:p-8 space-y-6">
            
            {/* Header User Brief */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
              <img 
                src={profile.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name)}`} 
                alt="" 
                className="w-20 h-20 rounded-2xl object-cover border-4 border-indigo-50 ring-2 ring-indigo-500/10 shadow-md"
              />
              <div className="space-y-1.5 flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-2xl font-black text-slate-900 font-sans tracking-tight">{profile.name}</h3>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-200 self-center">
                    {profile.role === 'Community Admin' ? '🎓 Admin Lead' : '🌟 Community Member'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Clearance ID: {profile.roleId || 'ID NOT RECORDED'}
                </p>
                <div className="flex items-center justify-center sm:justify-start text-xs text-slate-500 select-none">
                  <MapPin className="w-4 h-4 text-emerald-500 mr-1" />
                  <span className="font-semibold">{profile.location?.city || 'Hyderabad'}, {profile.location?.state || 'Telangana'}</span>
                </div>
              </div>
            </div>

            {/* Quick Numbers Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-3 rounded-xl border border-indigo-100 text-center">
                <span className="block text-[10px] uppercase font-bold text-indigo-600 font-mono tracking-wider">XP Points</span>
                <span className="text-xl font-black text-indigo-900 font-mono">{profile.points}</span>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 rounded-xl border border-amber-100 text-center">
                <span className="block text-[10px] uppercase font-bold text-amber-600 font-mono tracking-wider">Leader Rank</span>
                <span className="text-xl font-black text-amber-900 font-mono">#{profile.rank}</span>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-3 rounded-xl border border-rose-100 text-center flex flex-col justify-center items-center">
                <span className="block text-[10px] uppercase font-bold text-rose-600 font-mono tracking-wider">Current Streak</span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span className="text-lg font-black text-rose-900 font-mono">{profile.currentStreak} days</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 rounded-xl border border-emerald-100 text-center flex flex-col justify-center items-center">
                <span className="block text-[10px] uppercase font-bold text-emerald-600 font-mono tracking-wider">Highest Streak</span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                  <span className="text-lg font-black text-emerald-900 font-mono">{profile.highestStreak} days</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Badges & Gamification Stars Info */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="flex items-center space-x-1.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span className="text-sm font-extrabold text-slate-800">Participation Stars</span>
                </div>
                <div className="flex items-center space-x-1">
                  {profile.stars > 0 ? (
                    Array.from({ length: profile.stars }).map((_, i) => (
                      <Star key={i} className="w-4.5 h-4.5 text-amber-500 fill-amber-400" />
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-xs">No stars unlocked yet.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Unlocked Badges</span>
                <div className="flex flex-wrap gap-2">
                  {profile.earnedBadges.length === 0 ? (
                    <p className="text-xs text-slate-450 italic">No community award badges unlocked yet.</p>
                  ) : (
                    profile.earnedBadges.map((b: any) => (
                      <div key={b.name} className="flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-indigo-100 shadow-xs rounded-lg text-xs font-bold text-indigo-700">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>{b.name}</span>
                      </div>
                    ))
                  )}

                  {profile.lockedBadges.map((b: any) => (
                    <div key={b.name} className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 opacity-60" title={b.description}>
                      <Award className="w-4 h-4 text-slate-400" />
                      <span>{b.name} (locked)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center space-x-3.5">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase font-mono leading-none">Joined Circles</span>
                  <span className="text-base font-extrabold text-slate-800 leading-none mt-1.5 block">{profile.communitiesJoined} Communities</span>
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center space-x-3.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase font-mono leading-none">Attended Events</span>
                  <span className="text-base font-extrabold text-slate-800 leading-none mt-1.5 block">{profile.totalEventsAttended} Sessions</span>
                </div>
              </div>
            </div>

            {/* Event History / Activities */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Community Activity Logs</h4>
              {profile.eventHistory.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  No verified historic session attendance entries found.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-150 overflow-hidden text-xs max-h-48 overflow-y-auto">
                  {profile.eventHistory.map((h: any, i: number) => (
                    <div key={i} className="p-3 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-650 rounded text-[9px] font-mono mr-1.5">
                          {h.eventType}
                        </span>
                        <span className="font-bold text-slate-850">{h.title}</span>
                        <p className="text-[10px] text-slate-450 mt-0.5">At Circle: {h.communityName}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">{h.date}</span>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded-md font-bold mt-0.5 inline-block">
                          Role: {h.contributionType || 'Attendance'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Sheet
          </button>
        </div>

      </div>
    </div>
  );
};
