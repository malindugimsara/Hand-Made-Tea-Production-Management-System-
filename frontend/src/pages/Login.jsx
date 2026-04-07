import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, User, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
    const location = useLocation();
    const initialUsername = location.state?.username || "";
    
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('username', data.username);

                // Start Success Animation
                setIsLoading(false);
                setIsSuccess(true);
                
                setTimeout(() => navigate('/'), 1500);
            } else {
                toast.error(data.message || "Login failed. Please try again.");
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
        <div className="w-full min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-[#f0f9f2] font-sans selection:bg-[#8CC63F]/30">
            
            {/* --- ANIMATED BACKGROUND ORBS --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <motion.div 
                    animate={{ x: [0, 30, 0], y: [0, -50, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#8CC63F] rounded-full mix-blend-multiply filter blur-[80px] opacity-40" 
                />
                <motion.div 
                    animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] right-[-5%] w-[30rem] h-[30rem] bg-[#1B6A31] rounded-full mix-blend-multiply filter blur-[100px] opacity-30" 
                />
            </div>

            {/* ── LEFT SIDE - Branding ── */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full lg:w-1/2 min-h-[30vh] lg:min-h-screen flex flex-col items-center justify-center gap-6 z-10 relative p-6"
            >
                <img src="/logo.png" alt="Logo" className="w-36 md:w-56 drop-shadow-xl" />
                <div className="text-center">
                    <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-[#1B6A31]">HAND-MADE TEA</h1>
                    <p className="text-sm md:text-base font-bold tracking-[0.25em] uppercase text-[#4A9E46] mt-2">Production System</p>
                </div>
            </motion.div>

            {/* ── RIGHT SIDE - iOS Glass Form ── */}
            <div className="w-full lg:w-1/2 flex justify-center items-center px-4 py-8 lg:py-0 z-10 relative">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="login-form"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                            transition={{ type: "spring", damping: 20 }}
                            // Updated height classes: h-auto min-h-[380px] for mobile, sm:h-[480px] for larger screens
                            className="w-full max-w-[450px] h-auto min-h-[380px] sm:h-[480px] flex flex-col justify-center bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(27,106,49,0.15)] rounded-[2.5rem] p-8 sm:p-10 border border-white/80 relative"
                        >
                            {/* Loading Overlay */}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center z-50"
                                >
                                    <Loader2 className="text-[#1B6A31] w-10 h-10 animate-spin mb-2" />
                                    <span className="text-[#1B6A31] font-bold">Verifying...</span>
                                </motion.div>
                            )}

                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-extrabold text-gray-900">Welcome Back</h2>
                                <p className="text-gray-500 text-sm mt-1">Sign in to manage your production</p>
                            </div>

                            <form className="space-y-5" onSubmit={handleLogin}>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1B6A31] w-5 h-5 transition-colors" />
                                    <input
                                        onChange={(e) => setUsername(e.target.value)}
                                        type="text" value={username} placeholder="Username"
                                        className="w-full h-12 pl-12 pr-4 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#8CC63F]/20 transition-all"
                                    />
                                </div>

                                <div className="relative group">
                                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1B6A31] w-5 h-5 transition-colors" />
                                    <input
                                        onChange={(e) => setPassword(e.target.value)}
                                        type="password" value={password} placeholder="Password"
                                        className="w-full h-12 pl-12 pr-4 bg-white/80 border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#8CC63F]/20 transition-all"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 mt-4 bg-gradient-to-r from-[#1B6A31] to-[#208b3a] text-white font-bold rounded-2xl shadow-lg shadow-[#1B6A31]/20 hover:shadow-[#1B6A31]/40 transition-all"
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
                            // Updated height classes for success container as well
                            className="w-full max-w-[450px] h-auto min-h-[380px] sm:h-[480px] flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(27,106,49,0.15)] rounded-[2.5rem] border border-white/80"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6"
                            >
                                <CheckCircle2 className="text-[#4A9E46] w-16 h-16" />
                            </motion.div>
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                className="text-3xl font-black text-[#1B6A31]"
                            >
                                Success!
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                className="text-[#4A9E46] font-medium mt-2"
                            >
                                Entering Dashboard...
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}