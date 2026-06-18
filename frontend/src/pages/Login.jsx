import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, User, LockKeyhole, CheckCircle2, Eye, EyeOff, Leaf, Package, Factory, Settings, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// THEMES  —  Three distinct visual identities (All Green/Nature Inspired)
// H/T Factory   → deep forest / olive green
// Packing       → teal / cool emerald
// Factory       → green & yellow mix / lime (NEW)
// ─────────────────────────────────────────────
const THEMES = {
  handmade: {
    pageBg: '#f0faf2',
    orb1: 'rgba(27,106,49,0.28)',
    orb2: 'rgba(74,160,74,0.20)',
    orb3: 'rgba(140,198,63,0.18)',
    gridStroke: '#1B6A31',
    textPrimary: '#1B6A31',
    textSecondary: '#4A9E46',
    accent: '#1B6A31',
    btnGradient: 'linear-gradient(135deg,#1B6A31 0%,#4ade80 100%)',
    wipeGradient: 'linear-gradient(135deg,#14532d 0%,#1B6A31 40%,#4ade80 100%)',
    shimmer: 'rgba(27,106,49,0.12)',
    ringFocus: 'focus:ring-green-700/25',
    badgeBorder: '#bbf7d0',
    badgeBg: '#f0fdf4',
    badgeText: '#15803d',
    particleColor: '#4ade80',
    particleType: 'leaf',
  },
  packing: {
    pageBg: '#f0fdfb',
    orb1: 'rgba(13,148,136,0.22)',
    orb2: 'rgba(16,185,129,0.18)',
    orb3: 'rgba(52,211,153,0.15)',
    gridStroke: '#0d9488',
    textPrimary: '#0f766e',
    textSecondary: '#14b8a6',
    accent: '#0d9488',
    btnGradient: 'linear-gradient(135deg,#0f766e 0%,#34d399 100%)',
    wipeGradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 40%,#2dd4bf 100%)',
    shimmer: 'rgba(13,148,136,0.12)',
    ringFocus: 'focus:ring-teal-400/25',
    badgeBorder: '#99f6e4',
    badgeBg: '#f0fdfa',
    badgeText: '#0f766e',
    particleColor: '#2dd4bf',
    particleType: 'box',
  },
  factory: {
    pageBg: '#fefce8', 
    orb1: 'rgba(101,163,13,0.22)', 
    orb2: 'rgba(132,204,22,0.18)', 
    orb3: 'rgba(234,179,8,0.15)', 
    gridStroke: '#65a30d',
    textPrimary: '#4d7c0f', 
    textSecondary: '#ca8a04', 
    accent: '#65a30d', 
    btnGradient: 'linear-gradient(135deg,#4d7c0f 0%,#facc15 100%)', 
    wipeGradient: 'linear-gradient(135deg,#3f6212 0%,#65a30d 40%,#fef08a 100%)',
    shimmer: 'rgba(101,163,13,0.12)',
    ringFocus: 'focus:ring-lime-500/25',
    badgeBorder: '#d9f99d',
    badgeBg: '#f7fee7',
    badgeText: '#4d7c0f',
    particleColor: '#facc15', 
    particleType: 'gear',
  },
};

// ── Floating Tea Leaf ──
const TeaLeaf = ({ left, top, delay, size, color }) => (
  <motion.svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="absolute pointer-events-none" style={{ left, top, color }} initial={{ opacity: 0, rotate: 0, y: 0, x: 0 }} animate={{ opacity: [0, 0.55, 0.55, 0], rotate: [0, 160, 320], y: [0, -90, -130], x: [0, 12, -8, 4] }} transition={{ duration: 7 + (delay % 3), delay, repeat: Infinity, ease: 'easeInOut' }}>
    <path d="M12 2C6 2 2 8 2 14c0 4 2 7 6 8 1-4 2-8 4-10-2 4-3 8-2 12 2 0 4-1 5-3 1-2 1-5 1-8 0 3 1 6 3 8 4-2 5-6 5-9C24 6 18 2 12 2z" fill="currentColor"/>
  </motion.svg>
);

// ── Floating Box (packing) ──
const FloatingBox = ({ left, top, delay, color }) => (
  <motion.div className="absolute pointer-events-none rounded-sm border-2" style={{ left, top, width: 14, height: 14, borderColor: color }} initial={{ opacity: 0, scale: 0, rotate: 0 }} animate={{ opacity: [0, 0.45, 0.45, 0], scale: [0, 1, 1, 0], rotate: [0, 45, 90, 135], y: [0, -80, -110] }} transition={{ duration: 6 + (delay % 4), delay, repeat: Infinity, ease: 'easeInOut' }} />
);

// ── Floating Gear (factory) ──
const FloatingGear = ({ left, top, delay, color, size }) => (
  <motion.div className="absolute pointer-events-none flex items-center justify-center" style={{ left, top, color }} initial={{ opacity: 0, rotate: 0, y: 0 }} animate={{ opacity: [0, 0.45, 0.45, 0], rotate: [0, 180, 360], y: [0, -70, -100] }} transition={{ duration: 8 + (delay % 4), delay, repeat: Infinity, ease: 'linear' }}>
    <Settings size={size} strokeWidth={1.5} />
  </motion.div>
);

// ── Particle Field ──
function ParticleField({ mode }) {
  const t = THEMES[mode];
  const items = Array.from({ length: 11 }, (_, i) => ({
    id: i,
    left: `${6 + (i * 9) % 86}%`,
    top: `${65 + (i * 11) % 28}%`,
    delay: i * 0.45,
    size: 13 + (i % 3) * 7,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(p => {
        if (t.particleType === 'leaf') return <TeaLeaf key={p.id} {...p} color={t.particleColor} />;
        if (t.particleType === 'box') return <FloatingBox key={p.id} {...p} color={t.particleColor} />;
        return <FloatingGear key={p.id} {...p} color={t.particleColor} />;
      })}
    </div>
  );
}

// ── Morphing Blobs + Grid ──
function MorphingBlobs({ mode }) {
  const t = THEMES[mode];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div animate={{ scale:[1,1.14,1], x:[0,40,0], y:[0,-30,0] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }} className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full" style={{ background:`radial-gradient(circle,${t.orb1} 0%,transparent 70%)` }} />
      <motion.div animate={{ scale:[1,1.2,1], x:[0,-30,0], y:[0,40,0] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }} className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full" style={{ background:`radial-gradient(circle,${t.orb2} 0%,transparent 70%)` }} />
      <motion.div animate={{ scale:[1,1.1,1], x:[0,20,0], y:[0,20,0] }} transition={{ duration:7, repeat:Infinity, ease:'easeInOut', delay:4 }} className="absolute -bottom-20 left-1/4 w-[360px] h-[360px] rounded-full" style={{ background:`radial-gradient(circle,${t.orb3} 0%,transparent 70%)` }} />

      <AnimatePresence mode="wait">
        <motion.svg key={mode + '-grid'} className="absolute inset-0 w-full h-full" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.8 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            {mode === 'handmade' ? (
              <pattern id="hm-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <line x1="0" y1="30" x2="60" y2="30" stroke={t.gridStroke} strokeWidth="1" strokeOpacity="0.06"/>
                <line x1="30" y1="0" x2="30" y2="60" stroke={t.gridStroke} strokeWidth="0.5" strokeOpacity="0.04"/>
              </pattern>
            ) : mode === 'packing' ? (
              <pattern id="pk-grid" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="18" cy="18" r="1.5" fill={t.gridStroke} fillOpacity="0.07"/>
              </pattern>
            ) : (
              <pattern id="fac-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 40 0 0" fill="none" stroke={t.gridStroke} strokeWidth="0.5" strokeOpacity="0.05"/>
              </pattern>
            )}
          </defs>
          <rect width="100%" height="100%" fill={`url(#${mode === 'handmade' ? 'hm-grid' : mode === 'packing' ? 'pk-grid' : 'fac-grid'})`}/>
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}

// ── Diagonal Wipe ──
function WipeOverlay({ isWiping, direction }) {
  const wipe = direction ? THEMES[direction].wipeGradient : THEMES.handmade.wipeGradient;
  const toRight = direction === 'packing' || direction === 'factory';

  return (
    <AnimatePresence>
      {isWiping && (
        <motion.div
          key="wipe"
          initial={{ clipPath: toRight ? 'polygon(0 0,0 0,0 100%,0 100%)' : 'polygon(100% 0,100% 0,100% 100%,100% 100%)' }}
          animate={{ clipPath: toRight ? 'polygon(0 0,110% 0,110% 100%,0 100%)' : 'polygon(-10% 0,100% 0,100% 100%,-10% 100%)' }}
          exit={{ clipPath: toRight ? 'polygon(110% 0,110% 0,110% 100%,110% 100%)' : 'polygon(-10% 0,-10% 0,-10% 100%,-10% 100%)' }}
          transition={{ duration:0.52, ease:[0.76,0,0.24,1] }}
          className="fixed inset-0 z-[100] pointer-events-none" // <-- Changed to fixed for full screen coverage during scroll
          style={{ background: wipe }}
        />
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════
export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const BACKEND  = import.meta.env.VITE_BACKEND_URL;

  const [username,   setUsername]   = useState(location.state?.username || '');
  const [password,   setPassword]   = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  
  // ── NEW STATES FOR SMART LOGIN ──
  const [loginStep, setLoginStep] = useState('login'); // 'login' | 'select' | 'success'
  const [allowedSystems, setAllowedSystems] = useState([]);
  const [activeTab,  setActiveTab]  = useState('handmade'); // default theme base
  const [isWiping,   setIsWiping]   = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const t = THEMES[activeTab];

  // System to Route map
  const routeMap = {
    handmade: '/dashboard',
    packing:  '/packing',
    factory:  '/factory'
  };

  const triggerThemeChange = (tab) => {
    if (tab === activeTab || isWiping) return;
    setPendingTab(tab);
    setIsWiping(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setIsWiping(false), 300);
    }, 270);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) { toast.error('Please enter both username and password.'); return; }
    setIsLoading(true);

    try {
      const res  = await fetch(`${BACKEND}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (res.ok) {
        // Determine allowed systems based on role
        const userRole = data.role ? data.role.toLowerCase() : '';
        let allowed = [];

        if (['admin', 'viewer', 'view'].includes(userRole)) {
            allowed = ['handmade', 'packing', 'factory'];
        } else if (userRole === 'handmade officer') {
            allowed = ['handmade'];
        } else if (userRole === 'packing officer') {
            allowed = ['packing'];
        } else if (userRole === 'factory officer') {
            allowed = ['factory'];
        }

        if (allowed.length === 0) {
            toast.error("Access Denied: Unrecognized role or permissions.");
            setIsLoading(false);
            return;
        }

        // Save base details
        localStorage.setItem('token',    data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', data.username);

        // Smart Routing
        if (allowed.length === 1) {
            const target = allowed[0];
            triggerThemeChange(target);
            localStorage.setItem('activeSystem', target);
            setLoginStep('success');
            setTimeout(() => navigate(routeMap[target]), 1500);
        } else {
            setAllowedSystems(allowed);
            setLoginStep('select');
        }
        setIsLoading(false);
      } else {
        toast.error(data.message || data.error || 'Incorrect username or password.');
        setPassword('');
        setIsLoading(false);
      }
    } catch {
      toast.error('Network error. Cannot reach the server.');
      setIsLoading(false);
    }
  };

  const handleSystemSelection = (system) => {
      triggerThemeChange(system);
      localStorage.setItem('activeSystem', system);
      setLoginStep('success');
      setTimeout(() => navigate(routeMap[system]), 1500);
  };

  const getActiveSystemText = () => {
    if (activeTab === 'handmade') return 'H/T Factory';
    if (activeTab === 'packing') return 'Packing Section';
    return 'Factory Section';
  };

  return (
    // <-- REMOVED overflow-hidden, ADDED overflow-x-hidden for mobile scrolling -->
    <div className="w-full min-h-screen flex flex-col lg:flex-row relative overflow-x-hidden font-sans" style={{ backgroundColor: t.pageBg, transition:'background-color 0.7s ease' }}>
      
      {/* BG Wrapper: Changed from absolute to fixed so it stays in place during scroll */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab + '-bg'} className="fixed inset-0 z-0" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.65 }}>
          <MorphingBlobs mode={activeTab} />
          <ParticleField mode={activeTab} />
        </motion.div>
      </AnimatePresence>

      <WipeOverlay isWiping={isWiping} direction={pendingTab} />

      {/* ════ LEFT — Branding ════ */}
      <motion.div 
        initial={{ opacity:0, x:-20 }} 
        animate={{ opacity:1, x:0 }} 
        className="w-full lg:w-1/2 min-h-[30vh] lg:min-h-screen flex flex-col items-center justify-center gap-6 z-10 relative p-6 mt-8 lg:mt-0"
      >
        <motion.img
          src="/logo.png" alt="Logo"
          className="w-32 md:w-40 lg:w-56 drop-shadow-2xl"
          animate={{ filter:[ 'drop-shadow(0 0 0px transparent)', `drop-shadow(0 0 25px ${t.accent}66)`, 'drop-shadow(0 0 0px transparent)' ] }}
          transition={{ duration:3.5, repeat:Infinity }}
        />

        <div className="text-center flex flex-col items-center w-full">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight" style={{ color:t.textPrimary, transition:'color 0.6s ease' }}>
            ATHUKORALA GROUP
          </h1>
          <p className="text-xs sm:text-sm md:text-lg font-bold tracking-[0.25em] uppercase mt-2 sm:mt-3 opacity-90" style={{ color:t.textSecondary, transition:'color 0.6s ease' }}>
            Unified Management System
          </p>

          {/* ALL 3 SECTIONS PERMANENTLY VISIBLE AS INFO LABELS */}
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-3 w-full max-w-[500px]">
            
            {/* Handmade Label */}
            <motion.div
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border font-bold text-[11px] sm:text-sm backdrop-blur-md cursor-default select-none transition-colors duration-300"
              style={{ borderColor: THEMES.handmade.badgeBorder, backgroundColor: THEMES.handmade.badgeBg, color: THEMES.handmade.badgeText }}
            >
              <Leaf size={14} className="opacity-80" /> H/T Factory System
            </motion.div>
            
            {/* Packing Label */}
            <motion.div
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border font-bold text-[11px] sm:text-sm backdrop-blur-md cursor-default select-none transition-colors duration-300"
              style={{ borderColor: THEMES.packing.badgeBorder, backgroundColor: THEMES.packing.badgeBg, color: THEMES.packing.badgeText }}
            >
              <Package size={14} className="opacity-80" /> Packing Section System
            </motion.div>

            {/* Factory Label */}
            <motion.div
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border font-bold text-[11px] sm:text-sm backdrop-blur-md cursor-default select-none transition-colors duration-300"
              style={{ borderColor: THEMES.factory.badgeBorder, backgroundColor: THEMES.factory.badgeBg, color: THEMES.factory.badgeText }}
            >
              <Factory size={14} className="opacity-80" /> Factory System
            </motion.div>
            
          </div>
        </div>
      </motion.div>

      {/* ════ RIGHT — Forms & States ════ */}
      <div className="w-full lg:w-1/2 flex justify-center items-center px-4 py-8 lg:py-0 z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: LOGIN FORM */}
          {loginStep === 'login' && (
            <motion.div
              key="login-form"
              initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.8, filter:'blur(10px)' }}
              transition={{ type:'spring', damping:20 }}
              className="w-full max-w-[480px] flex flex-col justify-center bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 sm:p-10 border border-white/80 relative overflow-hidden"
            >
              {/* Top shimmer */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-[2.5rem]"
                style={{ background:`radial-gradient(ellipse at 50% 0%,${t.shimmer} 0%,transparent 60%)` }}
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.8 }}
              />

              {/* Loading overlay */}
              {isLoading && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center z-50">
                  <Loader2 className="w-10 h-10 animate-spin mb-2" style={{ color:t.textPrimary }} />
                  <span className="font-bold" style={{ color:t.textPrimary }}>Authenticating...</span>
                </motion.div>
              )}

              {/* Heading */}
              <div className="text-center mb-8 relative z-10">
                <h2 className="text-2xl font-extrabold text-gray-900">Welcome Back</h2>
                <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
              </div>

              {/* Form */}
              <form className="space-y-5 relative z-10" onSubmit={handleLogin}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    onChange={e => setUsername(e.target.value)} type="text" value={username} placeholder="Username"
                    className={`w-full py-3.5 pl-12 pr-4 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${t.ringFocus}`}
                  />
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} value={password} placeholder="Password"
                    className={`w-full py-3.5 pl-12 pr-12 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${t.ringFocus}`}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale:1.02, boxShadow:`0 14px 40px -8px ${t.accent}44` }} whileTap={{ scale:0.98 }}
                  type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 text-white font-bold rounded-2xl shadow-lg relative overflow-hidden"
                  style={{ background:t.btnGradient, transition:'background 0.65s ease' }}
                >
                  <span className="relative z-10 text-base">Sign In</span>
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: SELECT WORKSPACE (Shown only for Admin/Viewer) */}
          {loginStep === 'select' && (
            <motion.div
              key="select-form"
              initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.8, filter:'blur(10px)' }}
              transition={{ type:'spring', damping:20 }}
              className="w-full max-w-[480px] flex flex-col justify-center bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 sm:p-10 border border-white/80 relative overflow-hidden"
            >
              <div className="text-center mb-8 relative z-10">
                <h2 className="text-2xl font-extrabold text-gray-900">Select Workspace</h2>
                <p className="text-gray-500 text-sm mt-1">Where would you like to go?</p>
              </div>

              <div className="flex flex-col gap-4 relative z-10">
                {allowedSystems.includes('handmade') && (
                  <button onClick={() => handleSystemSelection('handmade')} className="p-4 bg-white hover:bg-[#f0faf2] border-2 border-gray-100 hover:border-[#1B6A31] rounded-2xl flex items-center gap-4 transition-all duration-300 shadow-sm group">
                    <div className="p-3 bg-green-50 rounded-xl group-hover:bg-[#1B6A31] transition-colors"><Leaf className="text-[#1B6A31] group-hover:text-white" size={24} /></div>
                    <span className="font-bold text-gray-800 text-lg">H/T Factory System</span>
                  </button>
                )}
                {allowedSystems.includes('packing') && (
                  <button onClick={() => handleSystemSelection('packing')} className="p-4 bg-white hover:bg-[#f0fdfb] border-2 border-gray-100 hover:border-[#0d9488] rounded-2xl flex items-center gap-4 transition-all duration-300 shadow-sm group">
                    <div className="p-3 bg-teal-50 rounded-xl group-hover:bg-[#0d9488] transition-colors"><Package className="text-[#0d9488] group-hover:text-white" size={24} /></div>
                    <span className="font-bold text-gray-800 text-lg">Packing Section</span>
                  </button>
                )}
                {allowedSystems.includes('factory') && (
                  <button onClick={() => handleSystemSelection('factory')} className="p-4 bg-white hover:bg-[#fefce8] border-2 border-gray-100 hover:border-[#65a30d] rounded-2xl flex items-center gap-4 transition-all duration-300 shadow-sm group">
                    <div className="p-3 bg-lime-50 rounded-xl group-hover:bg-[#65a30d] transition-colors"><Factory className="text-[#65a30d] group-hover:text-white" size={24} /></div>
                    <span className="font-bold text-gray-800 text-lg">Factory System</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: SUCCESS ANIMATION */}
          {loginStep === 'success' && (
            <motion.div
              key="success-card" initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }}
              className="w-full max-w-[450px] min-h-[380px] sm:h-[480px] flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] border border-white/80 relative"
            >
              <motion.div initial={{ scale:0 }} animate={{ scale:[0,1.2,1] }} transition={{ delay:0.2, duration:0.5 }} className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
                <CheckCircle2 className="w-16 h-16" style={{ color:t.textPrimary }} />
              </motion.div>
              <motion.h2 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="text-3xl font-black" style={{ color:t.textPrimary }}>
                Success!
              </motion.h2>
              <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }} className="font-medium mt-2" style={{ color:t.textSecondary }}>
                Accessing {getActiveSystemText()}...
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}