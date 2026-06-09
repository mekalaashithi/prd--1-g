import React, { useState, useEffect } from 'react';
import { Search, MapPin, Grid, Map as MapIcon, ChevronRight, Users, Compass, Check, SlidersHorizontal, Info, Play, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface VisitorPortalProps {
  user: any;
  onSelectCommunity: (id: string) => void;
  onTriggerAuth: (tab?: 'login' | 'register') => void;
  refreshTrigger: number;
}

const CATEGORIES = ['All', 'Tech', 'College', 'Startup', 'Sports', 'NGO', 'Cultural', 'Gaming'];
const DISTANCE_THRESHOLDS = [
  { label: 'Any Distance', value: '' },
  { label: 'Within 5 km', value: '5' },
  { label: 'Within 10 km', value: '10' },
  { label: 'Within 25 km', value: '25' },
  { label: 'Within 50 km', value: '50' }
];

export const VisitorPortal: React.FC<VisitorPortalProps> = ({
  user,
  onSelectCommunity,
  onTriggerAuth,
  refreshTrigger,
}) => {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [radius, setRadius] = useState('');
  
  // Geolocation states
  const [userLat, setUserLat] = useState<number | null>(17.3850); // default Hyd Lat
  const [userLon, setUserLon] = useState<number | null>(78.4867); // default Hyd Lon
  const [geoMode, setGeoMode] = useState<'granted' | 'simulated' | 'denied' | 'locating'>('simulated');
  const [selectedSimLocation, setSelectedSimLocation] = useState('Hyderabad, Telangana');

  // Display toggles
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [errorMsg, setErrorMsg] = useState('');

  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const SIMULATED_PRES_LOCATIONS = [
    { label: 'Hyderabad (T-Hub Gachibowli)', lat: 17.3850, lon: 78.4867 },
    { label: 'Visakhapatnam (Rishikonda Tech Park)', lat: 17.7888, lon: 83.3740 },
    { label: 'Vijayawada (Benz Circle)', lat: 16.5062, lon: 80.6480 },
    { label: 'Tirupati (Smart Precincts)', lat: 13.6288, lon: 79.4192 },
    { label: 'Warangal (NIT Campus coding lane)', lat: 17.9689, lon: 79.5941 }
  ];

  useEffect(() => {
    // Attempt standard browser geolocation if allowed
    requestRealGeolocation();
  }, []);

  useEffect(() => {
    loadCommunities();
    loadNearbyEvents();
  }, [search, category, radius, userLat, userLon, refreshTrigger]);

  const requestRealGeolocation = () => {
    if (navigator.geolocation) {
      setGeoMode('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLon(pos.coords.longitude);
          setGeoMode('granted');
          setSelectedSimLocation('Real GPS Node');
        },
        (err) => {
          console.warn('Geolocation denied, swapping to secure Simulated Sandboxed Geolocation values.');
          setGeoMode('simulated');
          // Use Hyderabad coordinates
          setUserLat(17.3850);
          setUserLon(78.4867);
          setSelectedSimLocation('Hyderabad, Telangana');
        },
        { timeout: 8000 }
      );
    } else {
      setGeoMode('denied');
    }
  };

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const filters: any = { search, category };
      if (userLat !== null && userLon !== null) {
        filters.lat = userLat;
        filters.lon = userLon;
      }
      if (radius) {
        filters.radius = Number(radius);
      }

      const resp = await api.getCommunities(filters);
      setCommunities(resp.communities);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error occurred during community synchronization.');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyEvents = async () => {
    setLoadingEvents(true);
    try {
      const filters: any = {};
      if (userLat !== null && userLon !== null) {
        filters.lat = userLat;
        filters.lon = userLon;
      }
      if (radius) {
        filters.radius = Number(radius);
      }
      const resp = await api.getPublicEvents(filters);
      setNearbyEvents(resp.events || []);
    } catch (e: any) {
      console.error('Error syncing nearby meetups:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSimLocationChange = (label: string, lat: number, lon: number) => {
    setUserLat(lat);
    setUserLon(lon);
    setGeoMode('simulated');
    setSelectedSimLocation(label);
  };

  return (
    <div className="w-full text-slate-800 font-sans">
      
      {/* 🚀 LANDING HERO BANNER */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl py-12 px-6 sm:px-12 md:py-16 md:px-16 shadow-xl relative overflow-hidden mb-10 mx-4 mt-4">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold font-mono tracking-wider uppercase">
            Platform Alpha Release v1.0
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mt-4 leading-tight">
            Discover and grow with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
              your local neighborhood.
            </span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-4 leading-relaxed max-w-xl font-medium">
            Explore technology hubs, university circles, outdoor sports teams, grassroots environmental NGOs, and esports gaming leagues surrounding your location. Share events, exchange bulletins, and engage directly with community administrators.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => { const el = document.getElementById('search-panel'); el?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Explore Communities
            </button>
            {!user && (
              <button
                onClick={() => onTriggerAuth('register')}
                className="px-5 py-3 bg-white/10 hover:bg-white/15 text-slate-100 border border-white/20 font-semibold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                Create Community Account
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Vector Wave Decorations */}
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none transform translate-x-12 translate-y-12">
          <svg width="400" height="400" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="#4f46e5" strokeWidth="4" fill="none" strokeDasharray="10 5" />
            <circle cx="50" cy="50" r="30" stroke="#10b981" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="20" stroke="#f59e0b" strokeWidth="1" fill="none" />
          </svg>
        </div>
      </section>

      {/* 🧭 GEOLOCATION CONTROL PANEL & SIMULATION */}
      <section className="mx-4 mb-8 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 w-full md:w-auto">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans">Active Discovery Coordinates</h3>
              <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${
                geoMode === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {geoMode === 'granted' ? 'Live Browser GPS' : 'Sandbox Geolocation'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Currently centered: <strong className="text-slate-700 font-sans">{selectedSimLocation}</strong> ({userLat?.toFixed(4)}, {userLon?.toFixed(4)})
            </p>
          </div>
        </div>

        {/* Preset Sim Swappers */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase flex-shrink-0">Simulate Location Node:</span>
          <div className="flex flex-wrap gap-1.5 justify-start">
            {SIMULATED_PRES_LOCATIONS.map((loc) => {
              const active = selectedSimLocation === loc.label;
              return (
                <button
                  key={loc.label}
                  onClick={() => handleSimLocationChange(loc.label, loc.lat, loc.lon)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg border font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-250 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  {loc.label.split(' ')[0]}
                </button>
              );
            })}
            <button
              onClick={requestRealGeolocation}
              className="p-1 px-2 border rounded-lg bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center space-x-1"
              title="Query live device coordinates"
            >
              <RefreshCw className="w-3 h-3 text-indigo-600" />
              <span>Retry Real GPS</span>
            </button>
          </div>
        </div>
      </section>

      {/* 🔍 DIRECTORY SEARCH & BROWSE HOVERS */}
      <section id="search-panel" className="mx-4 mb-8 space-y-4 scroll-mt-24">
        
        {/* Search controls row */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Text input, Radius select */}
          <div className="w-full md:flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search any community circles (e.g. Developer, Athletics, NGO)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm font-sans"
              />
            </div>
            
            {/* Radius swapper */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs text-slate-600 font-medium"
              >
                {DISTANCE_THRESHOLDS.map((thresh) => (
                  <option key={thresh.label} value={thresh.value}>
                    {thresh.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid vs Map selection */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-250 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Grid Dashboard</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map Proximity</span>
            </button>
          </div>
        </div>

        {/* Category horizontal browse */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat === 'All' ? 'All categories' : cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* 📊 DIRECTORY GRID OF CARD LAYOUTS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs mt-3">Refining directory listing indices...</p>
        </div>
      ) : communities.length === 0 ? (
        <div className="mx-4 p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-850">0 active communities matched.</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            There are no circles fitting these category or distance constraints around your simulated coordinate position. Try increasing your distance threshold or choose another Category focus!
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <section className="mx-4 mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm) => {
            const isJoined = user && comm.members.includes(user.id);
            return (
              <div
                key={comm.id}
                onClick={() => onSelectCommunity(comm.id)}
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-transform transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Banner image layout */}
                  <div className="h-32 sm:h-36 relative overflow-hidden">
                    <img
                      src={comm.banner}
                      alt={comm.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white font-semibold text-[10px] rounded-full uppercase">
                      {comm.category}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 sm:p-5 relative">
                    {/* Logo positioning overlay */}
                    <div className="absolute -top-10 left-5">
                      <img
                        src={comm.logo}
                        alt={comm.name}
                        className="w-14 h-14 rounded-xl border-2 border-white object-cover bg-slate-50 shadow-sm"
                      />
                    </div>

                    <div className="pt-6">
                      <h3 className="font-extrabold text-slate-900 text-base font-sans line-clamp-1 group-hover:text-indigo-650 transition-colors">
                        {comm.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-2 line-clamp-2 h-9 font-light">
                        {comm.description}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center text-slate-400">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          <span className="truncate max-w-[120px]">{comm.city}, {comm.state}</span>
                        </span>
                        
                        <span className="flex items-center text-slate-450 font-medium">
                          <Users className="w-3.5 h-3.5 mr-1" />
                          {comm.members.length} members
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Join buttons CTA */}
                <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex align-middle justify-between">
                  {comm.distance !== undefined ? (
                    <span className="text-[10px] font-bold text-slate-400 font-mono self-center">
                      📏 {comm.distance} km
                    </span>
                  ) : <span />}

                  {isJoined ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">
                      <Check className="w-3 h-3" />
                      <span>Joined Member</span>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCommunity(comm.id);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Join Portal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        /* 🗺️ MAP DISCOVERY OVERLAY DISPLAY */
        <section className="mx-4 mb-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold font-sans text-slate-900">Neighborhood Circle Maps</h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualizing the relative distance vectors of communities surrounding the simulated center coordinate.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual Canvas Plot */}
            <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-4 h-[400px] border border-slate-800 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#1e1e38_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              
              {/* Radar circular lines representing km grids */}
              <div className="absolute border border-indigo-500/20 w-[100px] h-[100px] rounded-full animate-pulse" title="5 km threshold" />
              <div className="absolute border border-indigo-500/10 w-[200px] h-[200px] rounded-full" title="10 km threshold" />
              <div className="absolute border border-indigo-500/5 w-[300px] h-[300px] rounded-full" title="25 km threshold" />
              
              {/* Center User Pin */}
              <div className="absolute bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white z-10 flex flex-col items-center">
                <MapPin className="w-5 h-5 text-emerald-300 animate-bounce" />
                <span className="text-[8px] bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap mt-1 font-mono font-bold">
                  My Location Node
                </span>
              </div>

              {/* Dynamic Placer Pins for communities */}
              {communities.map((comm, index) => {
                // Determine angles and relative coordinate offsets for vector display
                const angle = (index * (360 / communities.length || 1)) * Math.PI / 180;
                // Calculate distance factor scale
                const distOffset = comm.distance !== undefined ? Math.min(140, 20 + comm.distance * 2) : 90;
                const xOffset = Math.cos(angle) * distOffset;
                const yOffset = Math.sin(angle) * distOffset;

                return (
                  <div
                    key={comm.id}
                    style={{ transform: `translate(${xOffset}px, ${yOffset}px)` }}
                    onClick={() => onSelectCommunity(comm.id)}
                    className="absolute cursor-pointer transition-all hover:scale-105 z-20 group"
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Highlighted Marker Ring */}
                      <span className="absolute -top-1 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-40" />
                      <div className="w-9 h-9 bg-white p-1 rounded-xl shadow border border-slate-300 flex items-center justify-center">
                        <img src={comm.logo} className="w-7 h-7 rounded" alt="" />
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-10 bg-slate-900/95 backdrop-blur-sm shadow border border-slate-800 text-white p-2.5 rounded-lg text-[10px] w-40 text-center transition-opacity z-50 pointer-events-none">
                        <p className="font-bold font-sans line-clamp-1">{comm.name}</p>
                        <p className="text-indigo-400 font-bold mt-0.5">{comm.city}, {comm.state}</p>
                        <p className="text-slate-450 font-mono mt-0.5">📏 {comm.distance ?? 'NA'} km away</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Legend overlay */}
              <div className="absolute right-4 bottom-4 bg-slate-900/90 text-[10px] text-slate-400 p-2.5 rounded-xl border border-slate-800 font-mono leading-relaxed pointer-events-none">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-650 rounded-full inline-block" />
                  <span>Interactive Search Radar</span>
                </div>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="w-2.5 h-2.5 bg-red-400 rounded-full inline-block" />
                  <span>Local Community Circles</span>
                </div>
              </div>
            </div>

            {/* List helper next to map */}
            <div className="space-y-3.5 h-[400px] overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans">Surrounding List ({communities.length})</h4>
              
              <div className="space-y-2">
                {communities.map((comm) => (
                  <div
                    key={comm.id}
                    onClick={() => onSelectCommunity(comm.id)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img src={comm.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">{comm.name}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{comm.city}, {comm.state}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase rounded">
                        {comm.category}
                      </span>
                      {comm.distance !== undefined && (
                        <span className="text-[9px] text-slate-500 font-semibold font-mono mt-1">
                          📏 {comm.distance} km
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 📍 MEETUPS NEAR ME (LOCATION-BASED RECOMMENDATIONS) */}
      <section className="mx-4 mb-10">
        <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg inline-block">
                  <MapPin className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 font-sans tracking-tight">Meetups Near Me</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Discover technical workshops, active running meetups, and volunteer projects around <strong className="text-indigo-700">{selectedSimLocation}</strong>.
              </p>
            </div>
            
            {/* Quick Distance indicator badge info */}
            <span className="px-3 py-1 bg-white text-slate-600 rounded-full text-[10px] font-bold shadow-sm border border-slate-150 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>Location-Based Sorting Active</span>
            </span>
          </div>

          {loadingEvents ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
              <p className="text-[10px] text-slate-400 font-medium">Scanning surrounding event timelines...</p>
            </div>
          ) : (() => {
            // Apply category filtering as well to provide a highly cohesive user experience
            const filteredMeetups = nearbyEvents.filter(evt => {
              if (category === 'All') return true;
              // Cross correlation to community category
              const hostComm = communities.find(c => c.id === evt.communityId);
              if (hostComm) {
                return hostComm.category.toLowerCase() === category.toLowerCase();
              }
              return (evt.eventType || '').toLowerCase().includes(category.toLowerCase()) || 
                     (evt.title || '').toLowerCase().includes(category.toLowerCase());
            });

            if (filteredMeetups.length === 0) {
              return (
                <div className="bg-white/80 border border-dashed rounded-xl p-8 py-10 text-center text-xs">
                  <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No active meetups nearby</p>
                  <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                    There are no scheduled meetups within this range matching "{category === 'All' ? 'any' : category}". Try editing your simulated location node or clearing distance limits!
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMeetups.map((evt) => {
                  const evDate = new Date(evt.eventDate);
                  const isFuture = evDate.getTime() > Date.now();
                  return (
                    <div 
                      key={evt.id} 
                      className="bg-white rounded-xl border border-slate-150 hover:border-indigo-250 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Date element + badge */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="flex items-center space-x-2">
                            {/* Visual calendar miniature block */}
                            <div className="bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg p-1.5 flex flex-col items-center justify-center text-center w-11 h-11 shrink-0 font-sans">
                              <span className="text-[9px] font-bold uppercase leading-none">
                                {evDate.toLocaleString('default', { month: 'short' })}
                              </span>
                              <span className="text-sm font-black leading-none mt-0.5">
                                {evDate.getDate()}
                              </span>
                            </div>
                            
                            <div>
                              <p className="text-[10px] text-slate-450 uppercase tracking-wide font-bold line-clamp-1">
                                {evt.communityName}
                              </p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-650 mt-0.5 leading-none">
                                {evt.eventType || 'Gathering'}
                              </span>
                            </div>
                          </div>

                          {/* Distance badge */}
                          {evt.distance !== undefined && (
                            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded">
                              📏 {evt.distance} km
                            </span>
                          )}
                        </div>

                        {/* Event Title */}
                        <h4 className="font-extrabold text-slate-850 text-xs sm:text-sm leading-tight hover:text-indigo-650 transition-colors line-clamp-1 mb-1">
                          {evt.title}
                        </h4>

                        {/* Location address and city */}
                        <p className="text-[11px] text-slate-500 font-semibold mb-1.5 line-clamp-1">
                          📍 {evt.location}
                        </p>

                        {/* Short Description */}
                        <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed mb-4">
                          {evt.description}
                        </p>
                      </div>

                      {/* Explore community trigger */}
                      <button
                        onClick={() => onSelectCommunity(evt.communityId)}
                        className="w-full text-center py-2 bg-slate-55 hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <span>Details & Register RSVP</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* 📊 PLATFORM GENERAL STATISTICS OR BULLETIN OVERVIEW */}
      <section className="mx-4 mb-12 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-sans tracking-tight">7+ Distinct</h4>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mt-2">Active categories of interaction</p>
        </div>
        <div className="pt-4 md:pt-0">
          <h4 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-sans tracking-tight">100% Secure</h4>
          <p className="text-slate-550 text-xs font-medium uppercase tracking-wide mt-2">Roles & Authorization Middleware Logs</p>
        </div>
        <div className="pt-4 md:pt-0">
          <h4 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-sans tracking-tight">No Boundaries</h4>
          <p className="text-slate-550 text-xs font-medium uppercase tracking-wide mt-2">Local Map Projection discovery</p>
        </div>
      </section>

    </div>
  );
};
