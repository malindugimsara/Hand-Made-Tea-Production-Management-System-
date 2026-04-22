import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, User, LockKeyhole, CheckCircle2, Eye, EyeOff, Leaf, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// THEME  —  Both green, clearly different shades
// Handmade  → deep forest / olive green
// Packing   → teal / cool emerald
// ─────────────────────────────────────────────
const THEMES = {
  handmade: {
    pageBg:       '#f0faf2',
    orb1:         'rgba(27,106,49,0.28)',
    orb2:         'rgba(74,160,74,0.20)',
    orb3:         'rgba(140,198,63,0.18)',
    gridStroke:   '#1B6A31',
    textPrimary:  '#1B6A31',
    textSecondary:'#4A9E46',
    accent:       '#1B6A31',
    btnGradient:  'linear-gradient(135deg,#1B6A31 0%,#4ade80 100%)',
    tabGradient:  'linear-gradient(135deg,#1B6A31 0%,#22c55e 100%)',
    wipeGradient: 'linear-gradient(135deg,#14532d 0%,#1B6A31 40%,#4ade80 100%)',
    shimmer:      'rgba(27,106,49,0.12)',
    ringFocus:    'focus:ring-green-700/25',
    badgeBorder:  '#bbf7d0',
    badgeBg:      '#f0fdf4',
    badgeText:    '#15803d',
    particleColor:'#4ade80',
    particleType: 'leaf',
  },
  packing: {
    pageBg:       '#f0fdfb',
    orb1:         'rgba(13,148,136,0.22)',
    orb2:         'rgba(16,185,129,0.18)',
    orb3:         'rgba(52,211,153,0.15)',
    gridStroke:   '#0d9488',
    textPrimary:  '#0f766e',
    textSecondary:'#14b8a6',
    accent:       '#0d9488',
    btnGradient:  'linear-gradient(135deg,#0f766e 0%,#34d399 100%)',
    tabGradient:  'linear-gradient(135deg,#0d9488 0%,#2dd4bf 100%)',
    wipeGradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 40%,#2dd4bf 100%)',
    shimmer:      'rgba(13,148,136,0.12)',
    ringFocus:    'focus:ring-teal-400/25',
    badgeBorder:  '#99f6e4',
    badgeBg:      '#f0fdfa',
    badgeText:    '#0f766e',
    particleColor:'#2dd4bf',
    particleType: 'box',
  },
};

// ── Floating Tea Leaf ──
const TeaLeaf = ({ left, top, delay, size, color }) => (
  <motion.svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    className="absolute pointer-events-none"
    style={{ left, top, color }}
    initial={{ opacity: 0, rotate: 0, y: 0, x: 0 }}
    animate={{
      opacity: [0, 0.55, 0.55, 0],
      rotate:  [0, 160, 320],
      y:       [0, -90, -130],
      x:       [0, 12, -8, 4],
    }}
    transition={{ duration: 7 + (delay % 3), delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    <path d="M12 2C6 2 2 8 2 14c0 4 2 7 6 8 1-4 2-8 4-10-2 4-3 8-2 12 2 0 4-1 5-3 1-2 1-5 1-8 0 3 1 6 3 8 4-2 5-6 5-9C24 6 18 2 12 2z" fill="currentColor"/>
  </motion.svg>
);

// ── Floating Box (packing) ──
const FloatingBox = ({ left, top, delay, color }) => (
  <motion.div
    className="absolute pointer-events-none rounded-sm border-2"
    style={{ left, top, width: 14, height: 14, borderColor: color }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: [0, 0.45, 0.45, 0],
      scale:   [0, 1, 1, 0],
      rotate:  [0, 45, 90, 135],
      y:       [0, -80, -110],
    }}
    transition={{ duration: 6 + (delay % 4), delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

// ── Particle Field ──
function ParticleField({ mode }) {
  const t = THEMES[mode];
  const items = Array.from({ length: 11 }, (_, i) => ({
    id: i,
    left: `${6 + (i * 9) % 86}%`,
    top:  `${65 + (i * 11) % 28}%`,
    delay: i * 0.45,
    size: 13 + (i % 3) * 7,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map(p =>
        t.particleType === 'leaf'
          ? <TeaLeaf    key={p.id} {...p} color={t.particleColor} />
          : <FloatingBox key={p.id} {...p} color={t.particleColor} />
      )}
    </div>
  );
}

// ── Morphing Blobs + Grid ──
function MorphingBlobs({ mode }) {
  const t = THEMES[mode];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ scale:[1,1.14,1], x:[0,40,0], y:[0,-30,0] }}
        transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full"
        style={{ background:`radial-gradient(circle,${t.orb1} 0%,transparent 70%)` }}
      />
      <motion.div
        animate={{ scale:[1,1.2,1], x:[0,-30,0], y:[0,40,0] }}
        transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }}
        className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full"
        style={{ background:`radial-gradient(circle,${t.orb2} 0%,transparent 70%)` }}
      />
      <motion.div
        animate={{ scale:[1,1.1,1], x:[0,20,0], y:[0,20,0] }}
        transition={{ duration:7, repeat:Infinity, ease:'easeInOut', delay:4 }}
        className="absolute -bottom-20 left-1/4 w-[360px] h-[360px] rounded-full"
        style={{ background:`radial-gradient(circle,${t.orb3} 0%,transparent 70%)` }}
      />

      {/* Grid texture */}
      <AnimatePresence mode="wait">
        <motion.svg
          key={mode + '-grid'}
          className="absolute inset-0 w-full h-full"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.8 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {mode === 'handmade' ? (
              <pattern id="hm-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <line x1="0" y1="30" x2="60" y2="30" stroke={t.gridStroke} strokeWidth="1"   strokeOpacity="0.06"/>
                <line x1="30" y1="0" x2="30" y2="60" stroke={t.gridStroke} strokeWidth="0.5" strokeOpacity="0.04"/>
              </pattern>
            ) : (
              <pattern id="pk-grid" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="18" cy="18" r="1.5" fill={t.gridStroke} fillOpacity="0.07"/>
              </pattern>
            )}
          </defs>
          <rect width="100%" height="100%" fill={`url(#${mode === 'handmade' ? 'hm-grid' : 'pk-grid'})`}/>
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}

// ── Diagonal Wipe ──
// direction === 'packing'  → sweeps LEFT  to RIGHT
// direction === 'handmade' → sweeps RIGHT to LEFT
function WipeOverlay({ isWiping, direction }) {
  const wipe = direction ? THEMES[direction].wipeGradient : THEMES.handmade.wipeGradient;
  const toHandmade = direction === 'handmade';

  return (
    <AnimatePresence>
      {isWiping && (
        <motion.div
          key="wipe"
          initial={{ clipPath: toHandmade
            ? 'polygon(100% 0,100% 0,100% 100%,100% 100%)'   // start right edge
            : 'polygon(0 0,0 0,0 100%,0 100%)'               // start left edge
          }}
          animate={{ clipPath: toHandmade
            ? 'polygon(-10% 0,100% 0,100% 100%,-10% 100%)'   // expand leftward
            : 'polygon(0 0,110% 0,110% 100%,0 100%)'         // expand rightward
          }}
          exit={{ clipPath: toHandmade
            ? 'polygon(-10% 0,-10% 0,-10% 100%,-10% 100%)'   // leave left
            : 'polygon(110% 0,110% 0,110% 100%,110% 100%)'   // leave right
          }}
          transition={{ duration:0.52, ease:[0.76,0,0.24,1] }}
          className="absolute inset-0 z-50 pointer-events-none"
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
  const [isSuccess,  setIsSuccess]  = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('handmade');
  const [isWiping,   setIsWiping]   = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const t = THEMES[activeTab];

  const handleTabChange = (tab) => {
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
        localStorage.setItem('token',        data.token);
        localStorage.setItem('userRole',     data.role);
        localStorage.setItem('username',     data.username);
        localStorage.setItem('activeSystem', activeTab);
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => navigate(activeTab === 'handmade' ? '/dashboard' : '/packing-dashboard'), 1500);
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

  return (
    <div
      className="w-full min-h-screen flex flex-col lg:flex-row relative overflow-hidden font-sans"
      style={{ backgroundColor: t.pageBg, transition:'background-color 0.7s ease' }}
    >
      {/* BG */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + '-bg'}
          className="absolute inset-0"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.65 }}
        >
          <MorphingBlobs mode={activeTab} />
          <ParticleField mode={activeTab} />
        </motion.div>
      </AnimatePresence>

      <WipeOverlay isWiping={isWiping} direction={pendingTab} />

      {/* ════ LEFT — Branding ════ */}
      <motion.div
        initial={{ opacity:0, x:-20 }}
        animate={{ opacity:1, x:0 }}
        className="w-full lg:w-1/2 min-h-[25vh] lg:min-h-screen flex flex-col items-center justify-center gap-4 z-10 relative p-6 mt-4 lg:mt-0"
      >
        <motion.img
          src="/logo.png" alt="Logo"
          className="w-26 md:w-32 lg:w-40 drop-shadow-xl"
          animate={{
            filter:[
              'drop-shadow(0 0 0px transparent)',
              `drop-shadow(0 0 22px ${t.accent}55)`,
              'drop-shadow(0 0 0px transparent)',
            ]
          }}
          transition={{ duration:3.5, repeat:Infinity }}
        />

        <div className="text-center flex flex-col items-center">
          <h1
            className="text-3xl lg:text-4xl font-extrabold tracking-tight"
            style={{ color:t.textPrimary, transition:'color 0.6s ease' }}
          >
            ATHUKORALA GROUP
          </h1>

          <p
            className="text-xs md:text-sm font-bold tracking-[0.22em] uppercase mt-2"
            style={{ color:t.textSecondary, transition:'color 0.6s ease' }}
          >
            Unified Management System
          </p>

          {/* Active system badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + '-badge'}
              initial={{ opacity:0, scale:0.85, y:10 }}
              animate={{ opacity:1, scale:1,    y:0  }}
              exit={{   opacity:0, scale:0.85,  y:-8 }}
              transition={{ type:'spring', damping:16 }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm shadow-md backdrop-blur-md"
              style={{ borderColor:t.badgeBorder, backgroundColor:t.badgeBg, color:t.badgeText }}
            >
              {activeTab === 'handmade'
                ? <><Leaf size={16} className="animate-pulse" /> Handmade Tea System</>
                : <><Package size={16} className="animate-bounce" /> Packing Section System</>
              }
            </motion.div>
          </AnimatePresence>

          

          {/* Quick-switch pills */}
          <div className="flex gap-3 mt-3">
            {['handmade', 'packing'].map(sys => (
              <button
                key={sys}
                onClick={() => handleTabChange(sys)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all duration-300"
                style={{
                  backgroundColor: activeTab === sys ? t.accent        : 'rgba(255,255,255,0.5)',
                  color:           activeTab === sys ? '#fff'          : '#6b7280',
                  borderColor:     activeTab === sys ? t.accent        : '#e5e7eb',
                }}
              >
                {sys === 'handmade'
                  ? <><Leaf size={12}/> Handmade</>
                  : <><Package size={12}/> Packing</>
                }
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ════ RIGHT — Form ════ */}
      <div className="w-full lg:w-1/2 flex justify-center items-center px-4 py-8 lg:py-0 z-10 relative">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="login-form"
              initial={{ opacity:0, scale:0.9, y:20 }}
              animate={{ opacity:1, scale:1,   y:0  }}
              exit={{   opacity:0, scale:0.8,  filter:'blur(10px)' }}
              transition={{ type:'spring', damping:20 }}
              className="w-full max-w-[480px] flex flex-col justify-center bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 sm:p-10 border border-white/80 relative overflow-hidden"
            >
              {/* Top shimmer */}
              <motion.div
                key={activeTab + '-shimmer'}
                className="absolute inset-0 pointer-events-none rounded-[2.5rem]"
                style={{ background:`radial-gradient(ellipse at 50% 0%,${t.shimmer} 0%,transparent 60%)` }}
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                transition={{ duration:0.8 }}
              />

              {/* Loading overlay */}
              {isLoading && (
                <motion.div
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center z-50"
                >
                  <Loader2 className="w-10 h-10 animate-spin mb-2" style={{ color:t.textPrimary }} />
                  <span className="font-bold" style={{ color:t.textPrimary }}>Verifying...</span>
                </motion.div>
              )}

              {/* ── TABS ── */}
              <div className="flex bg-white/60 p-1.5 rounded-2xl mb-8 border border-white shadow-inner relative overflow-hidden">
                <motion.div
                  className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl shadow-md"
                  style={{
                    background: t.tabGradient,
                    left: activeTab === 'handmade' ? '6px' : 'calc(50%)',
                  }}
                  transition={{ type:'spring', stiffness:380, damping:30 }}
                />
                {/* Handmade */}
                <button
                  onClick={() => handleTabChange('handmade')}
                  className={`relative flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 z-10 font-bold text-sm transition-colors duration-300 ${
                    activeTab === 'handmade' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <motion.div
                    animate={activeTab === 'handmade' ? { rotate:[0,-10,10,0] } : {}}
                    transition={{ duration:0.45 }}
                  ><Leaf size={15}/></motion.div>
                  HandMade Tea
                </button>
                {/* Packing */}
                <button
                  onClick={() => handleTabChange('packing')}
                  className={`relative flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-1.5 z-10 font-bold text-sm transition-colors duration-300 ${
                    activeTab === 'packing' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <motion.div
                    animate={activeTab === 'packing' ? { scale:[1,1.25,1] } : {}}
                    transition={{ duration:0.45 }}
                  ><Package size={15}/></motion.div>
                  Packing Section
                </button>
              </div>

              {/* Heading */}
              <div className="text-center mb-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab + '-heading'}
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
                    transition={{ duration:0.3 }}
                  >
                    <h2 className="text-2xl font-extrabold text-gray-900">Welcome Back</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Sign in to the&nbsp;
                      <span className="font-semibold" style={{ color:t.textPrimary }}>
                        {activeTab === 'handmade' ? 'Handmade Tea' : 'Packing Section'}
                      </span>
                      &nbsp;portal
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Form */}
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    onChange={e => setUsername(e.target.value)}
                    type="text" value={username} placeholder="Username"
                    className={`w-full py-3.5 pl-12 pr-4 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${t.ringFocus}`}
                  />
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    value={password} placeholder="Password"
                    className={`w-full py-3.5 pl-12 pr-12 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${t.ringFocus}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale:1.02, boxShadow:`0 14px 40px -8px ${t.accent}44` }}
                  whileTap={{ scale:0.98 }}
                  type="submit" disabled={isLoading}
                  className="w-full py-3.5 mt-4 text-white font-bold rounded-2xl shadow-lg relative overflow-hidden"
                  style={{ background:t.btnGradient, transition:'background 0.65s ease' }}
                >
                  <span className="relative z-10">Sign In</span>
                </motion.button>
              </form>
            </motion.div>

          ) : (
            <motion.div
              key="success-card"
              initial={{ opacity:0, scale:0.5 }}
              animate={{ opacity:1, scale:1 }}
              className="w-full max-w-[450px] min-h-[380px] sm:h-[480px] flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] border border-white/80 relative"
            >
              <motion.div
                initial={{ scale:0 }} animate={{ scale:[0,1.2,1] }}
                transition={{ delay:0.2, duration:0.5 }}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6"
              >
                <CheckCircle2 className="w-16 h-16" style={{ color:t.textPrimary }} />
              </motion.div>

              {[1,2,3].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border-2"
                  style={{ borderColor:t.accent, width:96, height:96 }}
                  initial={{ scale:1, opacity:0.6 }}
                  animate={{ scale:1 + i*0.6, opacity:0 }}
                  transition={{ delay:0.2 + i*0.15, duration:1.1, repeat:Infinity, repeatDelay:0.4 }}
                />
              ))}

              <motion.h2
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                className="text-3xl font-black" style={{ color:t.textPrimary }}
              >
                Success!
              </motion.h2>
              <motion.p
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }}
                className="font-medium mt-2" style={{ color:t.textSecondary }}
              >
                Accessing {activeTab === 'handmade' ? 'Production' : 'Packing'} System...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}