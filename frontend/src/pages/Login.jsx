import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Leaf, Lock, User, Loader2 } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Form States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!username || !password) {
            toast.error("Please enter both username and password.");
            return;
        }

        setIsLoading(true);
        const loginToast = toast.loading("Verifying credentials...");

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                // 1. Save auth data to LocalStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('username', data.username);

                toast.success("Login successful! Redirecting...", { id: loginToast });
                
                // 2. Short delay so the user sees the success message, then redirect to Home
                setTimeout(() => {
                    navigate('/');
                }, 1000);
            } else {
                // Backend returned an error (e.g., 401 Invalid credentials)
                toast.error(data.message || "Invalid username or password.", { id: loginToast });
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast.error("Network error. Cannot reach the server.", { id: loginToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4 relative overflow-hidden">
            {/* Toaster for notifications */}
            <Toaster position="top-center" reverseOrder={false} />

            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#1B6A31]/10 to-transparent"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#8CC63F]/20 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#4A9E46]/20 rounded-full blur-3xl opacity-50"></div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative z-10">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-[#1B6A31]/10 rounded-full flex items-center justify-center mb-4 text-[#1B6A31]">
                        <Leaf size={32} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 text-center tracking-tight">
                        Hand Made Tea System
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    
                    {/* Username Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9E46] focus:border-transparent transition-all bg-gray-50"
                                placeholder="Enter your username"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A9E46] focus:border-transparent transition-all bg-gray-50"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-4 bg-[#1B6A31] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#4A9E46] hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                            isLoading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

            </div>
        </div>
    );
}