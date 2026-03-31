import React, { useState } from 'react';

// IMPORTANT: If you created separate files for these forms, import them here like this:
// import DashboardHome from './DashboardHome';
// import GreenLeafForm from './GreenLeafForm'; 
// (For now, I have created placeholder components at the bottom of this file so it works instantly)

export default function DashboardLayout() {
    // 1. State to keep track of the currently selected tab
    const [activeTab, setActiveTab] = useState('Dashboard');

    // 2. Function to switch the content dynamically based on the active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="flex flex-col space-y-6 w-full max-w-lg">
                            <button 
                                onClick={() => setActiveTab('Production')}
                                className="w-full py-4 bg-[#1B6A31] text-[#FFFFFF] shadow-md rounded-lg hover:bg-[#4A9E46] transition-colors duration-200 text-lg font-medium flex justify-center items-center"
                            >
                                + Add New Production Record
                            </button>
                            <button 
                                onClick={() => setActiveTab('Costing')}
                                className="w-full py-4 bg-[#FFFFFF] border-2 border-[#4A9E46] text-[#4A9E46] shadow-sm rounded-lg hover:bg-[#4A9E46] hover:text-[#FFFFFF] transition-colors duration-200 text-lg font-medium flex justify-center items-center"
                            >
                                View Cost Calculations
                            </button>
                        </div>
                    </div>
                );
            case 'Green Leaf':
                return <PlaceholderPage title="Green Leaf Entry Form" color="#1B6A31" />;
            case 'Production':
                return <PlaceholderPage title="Production Record Form" color="#4A9E46" />;
            case 'Costing':
                return <PlaceholderPage title="Cost Calculation Dashboard" color="#1B6A31" />;
            case 'Sales':
                return <PlaceholderPage title="Sales & Revenue Form" color="#8CC63F" />;
            default:
                return <div>Select a tab</div>;
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
                    {/* 3. Pass the active state and onClick handler to each NavItem */}
                    <NavItem label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
                    <NavItem label="Green Leaf" active={activeTab === 'Green Leaf'} onClick={() => setActiveTab('Green Leaf')} />
                    <NavItem label="Production" active={activeTab === 'Production'} onClick={() => setActiveTab('Production')} />
                    <NavItem label="Costing" active={activeTab === 'Costing'} onClick={() => setActiveTab('Costing')} />
                    <NavItem label="Sales" active={activeTab === 'Sales'} onClick={() => setActiveTab('Sales')} />
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col overflow-hidden">
                
                {/* TOP NAVBAR - Card White */}
                <header className="h-16 bg-[#FFFFFF] border-b border-gray-200 flex items-center justify-between px-8 shadow-sm shrink-0">
                    <h1 className="text-lg font-semibold text-[#1B6A31]">{activeTab} Overview</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Welcome, Admin</span>
                        <div className="w-8 h-8 bg-[#8CC63F]/20 rounded-full border border-[#8CC63F] flex items-center justify-center">
                            <span className="text-xs font-bold text-[#1B6A31]">A</span>
                        </div>
                    </div>
                </header>

                {/* CENTRAL CONTENT - Rendered Dynamically */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderContent()}
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

// A simple placeholder component to show that the switching works
// You will replace these with the actual components (GreenLeafForm, etc.) later
function PlaceholderPage({ title, color }) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold mb-4" style={{ color: color }}>{title}</h2>
            <p className="text-gray-500">This section has loaded without refreshing the page.</p>
        </div>
    );
}