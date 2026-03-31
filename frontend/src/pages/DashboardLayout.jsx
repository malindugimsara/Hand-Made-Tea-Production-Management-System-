import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
    // 1. Initialize navigation hooks
    const navigate = useNavigate();
    const location = useLocation(); // Gets the current URL path

    // 2. Helper function to change the Header title based on the URL
    const getHeaderTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/green-leaf': return 'Green Leaf';
            case '/production': return 'Production';
            case '/costing': return 'Costing';
            case '/sales': return 'Sales';
            default: return 'System';
        }
    };

    return (
        <div className="flex h-screen bg-[#F8FAF8] font-sans text-gray-800 overflow-hidden">
            
            {/* LEFT SIDEBAR - Card White */}
            <aside className="w-64 bg-[#EBFFF4] border-r border-gray-200 flex flex-col p-6 shadow-sm z-10 text-gray-700 shrink-0">
                {/* Dark Green for main logo text */}
                <div className="text-xl font-bold tracking-wider text-[#1B6A31] mb-6">
                    TEA FACTORY
                </div>
                
                {/* Navigation Buttons */}
                <nav className="flex flex-col space-y-3 rounded-lg mt-4">
                    {/* 3. Use navigate('/path') on click, and check location.pathname for active state */}
                    <NavItem 
                        label="Dashboard" 
                        active={location.pathname === '/'} 
                        onClick={() => navigate('/')} 
                    />
                    <NavItem 
                        label="Green Leaf" 
                        active={location.pathname === '/green-leaf-form'} 
                        onClick={() => navigate('/green-leaf-form')} 
                    />
                    <NavItem 
                        label="Production" 
                        active={location.pathname === '/production'} 
                        onClick={() => navigate('/production')} 
                    />
                    <NavItem 
                        label="Costing" 
                        active={location.pathname === '/costing'} 
                        onClick={() => navigate('/costing')} 
                    />
                    <NavItem 
                        label="Sales" 
                        active={location.pathname === '/sales'} 
                        onClick={() => navigate('/sales')} 
                    />
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col overflow-hidden">
                
                {/* TOP NAVBAR - Card White */}
                <header className="h-16 bg-[#FFFFFF] border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0">
                    <h1 className="text-lg font-semibold text-[#1B6A31]">{getHeaderTitle()} Overview</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Welcome, Admin</span>
                        <div className="w-8 h-8 bg-[#8CC63F]/20 rounded-full border border-[#8CC63F] flex items-center justify-center">
                            <span className="text-xs font-bold text-[#1B6A31]">A</span>
                        </div>
                    </div>
                </header>

                {/* CENTRAL CONTENT - Handled by React Router */}
                <div className="flex-1 overflow-y-auto bg-[#F8FAF8]">
                    {/* 4. The Outlet renders whatever page component matches the current URL */}
                    <Outlet />
                </div>
                
            </main>
        </div>
    );
}

// Reusable component for the sidebar buttons
function NavItem({ label, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`px-4 py-3 rounded-md text-left transition-colors font-medium w-full ${
                active 
                ? 'bg-[#8CC63F]/10 text-[#4A9E46] border-l-4 border-[#4A9E46]' 
                : 'text-gray-600 hover:bg-[#8CC63F]/20 hover:text-[#1B6A31] border-l-4 border-transparent'
            }`}
        >
            {label}
        </button>
    );
}