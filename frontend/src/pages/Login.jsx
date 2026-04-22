import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, User, LockKeyhole, CheckCircle2, Eye, EyeOff, Leaf, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
    const location = useLocation();
    const initialUsername = location.state?.username || "";
    
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Password show/hide state
    const [showPassword, setShowPassword] = useState(false);
    
    // --- SYSTEM SELECTION STATE (Tabs) ---
    const [activeTab, setActiveTab] = useState('handmade'); // 'handmade' or 'packing'
    
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- DYNAMIC THEME CONFIGURATION ---
    const theme = {
        handmade: {
            bg: 'bg-[#f0f9f2]',
            orb1: 'bg-[#8CC63F]',
            orb2: 'bg-[#1B6A31]',
            textPrimary: 'text-[#1B6A31]',
            textSecondary: 'text-[#4A9E46]',
            btnFrom: 'from-[#1B6A31]',
            btnTo: 'to-[#208b3a]',
            btnShadow: 'shadow-[#1B6A31]/20 hover:shadow-[#1B6A31]/40',
            ringFocus: 'focus:ring-[#8CC63F]/20',
            tabBg: 'bg-[#1B6A31]'
        },
        packing: {
            bg: 'bg-orange-50/50',
            orb1: 'bg-yellow-400',
            orb2: 'bg-orange-600',
            textPrimary: 'text-orange-700',
            textSecondary: 'text-orange-500',
            btnFrom: 'from-orange-600',
            btnTo: 'to-orange-500',
            btnShadow: 'shadow-orange-600/20 hover:shadow-orange-600/40',
            ringFocus: 'focus:ring-orange-500/20',
            tabBg: 'bg-orange-600'
        }
    };

    const currentTheme = theme[activeTab];

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        if (!username || !password) {
            toast.error("Please enter both username and password.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const textResponse = await res.text();
            let data = {};
            try {
                data = textResponse ? JSON.parse(textResponse) : {};
            } catch (parseError) {
                console.warn("Non-JSON response received from server");
            }

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('username', data.username);
                
                // Store which system they logged into
                localStorage.setItem('activeSystem', activeTab);

                setIsLoading(false);
                setIsSuccess(true);
                
                // Route based on selected tab
                setTimeout(() => {
                    if (activeTab === 'handmade') {
                        navigate('/dashboard');
                    } else {
                        navigate('/packing-dashboard'); // Packing dashboard route එක මෙතනට දෙන්න
                    }
                }, 1500);
            } else {
                const errorMsg = data.message || data.error || "Incorrect username or password. Please try again.";
                toast.error(errorMsg);
                
                setPassword("");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast.error("Network error. Cannot reach the server.");
            setIsLoading(false);
        }
    };

    return (
        <div className={`w-full min-h-screen flex flex-col lg:flex-row relative overflow-hidden transition-colors duration-700 ${currentTheme.bg} font-sans selection:bg-black/10`}>
            
            {/* --- ANIMATED BACKGROUND ORBS --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <motion.div 
                    animate={{ x: [0, 30, 0], y: [0, -50, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 transition-colors duration-700 ${currentTheme.orb1}`} 
                />
                <motion.div 
                    animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className={`absolute top-[20%] right-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 transition-colors duration-700 ${currentTheme.orb2}`} 
                />
            </div>

            {/* ── LEFT SIDE - Branding ── */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full lg:w-1/2 min-h-[25vh] lg:min-h-screen flex flex-col items-center justify-center gap-6 z-10 relative p-6 mt-4 lg:mt-0"
            >
                <img src="/logo.png" alt="Logo" className="w-32 md:w-48 lg:w-56 drop-shadow-xl" />
                <div className="text-center flex flex-col items-center">
                    <h1 className={`text-4xl lg:text-6xl font-extrabold tracking-tight transition-colors duration-700 ${currentTheme.textPrimary}`}>
                        ATHUKORALA GROUP
                    </h1>
                    <p className={`text-sm md:text-base font-bold tracking-[0.25em] uppercase mt-4 transition-colors duration-700 ${currentTheme.textSecondary}`}>
                        Unified Management System
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <div className="flex items-center gap-2 bg-white/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/50 text-[#1B6A31] font-bold shadow-sm">
                            <Leaf size={18} /> Handmade Tea
                        </div>
                        <div className="flex items-center gap-2 bg-white/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/50 text-[#1B6A31] font-bold shadow-sm">
                            <Package size={18} /> Packing Section
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── RIGHT SIDE - Form & Tabs ── */}
            <div className="w-full lg:w-1/2 flex justify-center items-center px-4 py-8 lg:py-0 z-10 relative">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="login-form"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                            transition={{ type: "spring", damping: 20 }}
                            className="w-full max-w-[480px] flex flex-col justify-center bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 sm:p-10 border border-white/80 relative"
                        >
                            {/* Loading Overlay */}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center z-50"
                                >
                                    <Loader2 className={`w-10 h-10 animate-spin mb-2 transition-colors duration-700 ${currentTheme.textPrimary}`} />
                                    <span className={`font-bold transition-colors duration-700 ${currentTheme.textPrimary}`}>Verifying...</span>
                                </motion.div>
                            )}

                            {/* --- TAB SELECTOR --- */}
                            <div className="flex bg-white/60 p-1.5 rounded-2xl mb-8 border border-white shadow-inner relative">
                                {/* Tab 1: Handmade Tea */}
                                <button
                                    onClick={() => setActiveTab('handmade')}
                                    className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 z-10 transition-colors duration-300 ${
                                        activeTab === 'handmade' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {activeTab === 'handmade' && (
                                        <motion.div 
                                            layoutId="activeTabBg" 
                                            className={`absolute inset-0 rounded-xl -z-10 shadow-md ${theme.handmade.tabBg}`} 
                                        />
                                    )}
                                    <div className="flex items-center gap-1.5 font-bold text-sm">
                                        <Leaf size={16} /> HandMade Tea
                                    </div>
                                    
                                </button>

                                {/* Tab 2: Packing Section */}
                                <button
                                    onClick={() => setActiveTab('packing')}
                                    className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 z-10 transition-colors duration-300 ${
                                        activeTab === 'packing' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {activeTab === 'packing' && (
                                        <motion.div 
                                            layoutId="activeTabBg" 
                                            className={`absolute inset-0 rounded-xl -z-10 shadow-md ${theme.packing.tabBg}`} 
                                        />
                                    )}
                                    <div className="flex items-center gap-1.5 font-bold text-sm">
                                        <Package size={16} /> Packing Section
                                    </div>
                                   
                                </button>
                            </div>

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-extrabold text-gray-900">Welcome Back</h2>
                                <p className="text-gray-500 text-sm mt-1">Sign in to access your dashboard</p>
                            </div>

                            <form className="space-y-5" onSubmit={handleLogin}>
                                <div className="relative group">
                                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors duration-300 group-focus-within:${currentTheme.textPrimary}`} />
                                    <input
                                        onChange={(e) => setUsername(e.target.value)}
                                        type="text" value={username} placeholder="Username"
                                        className={`w-full h-13 py-3.5 pl-12 pr-4 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${currentTheme.ringFocus}`}
                                    />
                                </div>

                                <div className="relative group">
                                    <LockKeyhole className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors duration-300 group-focus-within:${currentTheme.textPrimary}`} />
                                    <input
                                        onChange={(e) => setPassword(e.target.value)}
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        placeholder="Password"
                                        className={`w-full h-13 py-3.5 pl-12 pr-12 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 transition-all duration-300 ${currentTheme.ringFocus}`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full h-13 py-3.5 mt-4 bg-gradient-to-r ${currentTheme.btnFrom} ${currentTheme.btnTo} text-white font-bold rounded-2xl shadow-lg transition-all duration-500 ${currentTheme.btnShadow}`}
                                >
                                    Sign In
                                </motion.button>
                            </form>
                        </motion.div>
                    ) : (
                        /* SUCCESS ANIMATION STATE */
                        <motion.div
                            key="success-card"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-[450px] h-auto min-h-[380px] sm:h-[480px] flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-[2.5rem] border border-white/80"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6"
                            >
                                <CheckCircle2 className={`w-16 h-16 transition-colors duration-700 ${currentTheme.textPrimary}`} />
                            </motion.div>
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                className={`text-3xl font-black transition-colors duration-700 ${currentTheme.textPrimary}`}
                            >
                                Success!
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                className={`font-medium mt-2 transition-colors duration-700 ${currentTheme.textSecondary}`}
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