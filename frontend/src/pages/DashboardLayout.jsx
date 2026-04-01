import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // Dynamically change the top header text based on the current URL
    const getHeaderTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/green-leaf-form': return 'Green Leaf';
            case '/production': return 'Production';
            case '/costing': return 'Costing';
            case '/sales': return 'Sales';
            case '/view-green-leaf': return 'Green Leaf Reports';
            default: return 'System';
        }
    };

    // Array of your sidebar navigation links
    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/green-leaf-form', label: 'Daily G/L' },
        { path: '/view-green-leaf', label: 'View G/L Reports' },
        { path: '/production', label: 'Production' },
        { path: '/costing', label: 'Costing' },
        { path: '/sales', label: 'Sales' },
        
    ];

    // Find which index is currently active to calculate the sliding animation
    const activeIndex = navItems.findIndex(item => item.path === location.pathname);
    const safeIndex = activeIndex === -1 ? 0 : activeIndex;

    return (
        <div className="flex h-screen bg-[#F8FAF8] font-sans text-gray-800 overflow-hidden">
            
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-[#EBFFF4] border-r border-gray-200 flex flex-col p-6 shadow-sm z-10 text-gray-700 shrink-0">
                {/* Brand Logo Area */}
                <div className="text-xl font-bold tracking-wider text-[#1B6A31] mb-6 pl-2">
                    TEA FACTORY
                </div>
                
                {/* CUSTOM ANIMATED SIDEBAR NAVIGATION */}
                <nav className="relative flex flex-col mt-2">
                    {/* The sliding green background indicator */}
                    <div 
                        className="absolute left-0 w-full h-12 bg-[#8CC63F]/10 border-l-4 border-[#4A9E46] rounded-md transition-transform duration-300 ease-out"
                        style={{ transform: `translateY(${safeIndex * 100}%)` }}
                    />

                    {/* The Navigation Buttons */}
                    {navItems.map((item, index) => {
                        const isActive = safeIndex === index;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`relative z-10 h-12 px-4 flex items-center text-base font-medium transition-colors duration-300 rounded-md ${
                                    isActive 
                                    ? 'text-[#4A9E46]' 
                                    : 'text-gray-600 hover:text-[#1B6A31] hover:bg-[#8CC63F]/5'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>


        
        {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* 1. TOP NAVBAR (WITH FROSTED GLASS BLUR) */}
                {/* Changed background to white/80 and added backdrop-blur-md */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0 absolute top-0 w-full z-20">
                    <h1 className="text-lg font-semibold text-[#1B6A31]">{getHeaderTitle()} Overview</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Welcome, Admin</span>
                        <div className="w-8 h-8 bg-[#8CC63F]/20 rounded-full border border-[#8CC63F] flex items-center justify-center">
                            <span className="text-xs font-bold text-[#1B6A31]">A</span>
                        </div>
                    </div>
                </header>

                {/* CENTRAL CONTENT */}
                <div className="flex-1 overflow-y-auto bg-[#F8FAF8] pt-16">
                    {/* 2. FRAMER MOTION (WITH PAGE LOAD BLUR) */}
                    {/* Added filter: 'blur(8px)' to initial, and 'blur(0px)' to animate */}
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ 
                            duration: 0.8, 
                            ease: [0.16, 1, 0.3, 1] 
                        }}
                        className="h-full"
                    >
                        <Outlet />
                    </motion.div>
                </div>
                
            </main>
        </div>
    );
}