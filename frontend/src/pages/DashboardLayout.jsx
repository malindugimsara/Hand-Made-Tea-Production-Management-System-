import React from 'react';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
            
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-6 space-y-4">
                <div className="text-xl font-bold tracking-wider text-green-700 mb-6">
                    TEA FACTORY
                </div>
                
                {/* 5 Navigation Buttons matching your wireframe */}
                <nav className="flex flex-col space-y-3">
                    <NavItem label="Dashboard" active={true} />
                    <NavItem label="Green Leaf" />
                    <NavItem label="Production" />
                    <NavItem label="Costing" />
                    <NavItem label="Sales" />
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col">
                
                {/* TOP NAVBAR */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <h1 className="text-lg font-semibold text-gray-700">Overview</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Welcome, Admin</span>
                        <div className="w-8 h-8 bg-green-100 rounded-full border border-green-300"></div>
                    </div>
                </header>

                {/* CENTRAL CONTENT */}
                {/* The wireframe shows two prominent horizontal boxes centered in the main area */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="flex flex-col space-y-6 w-full max-w-lg">
                        
                        <button className="w-full py-4 bg-white border border-gray-200 shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 text-lg font-medium text-gray-700 flex justify-center items-center">
                            + Add New Production Record
                        </button>
                        
                        <button className="w-full py-4 bg-white border border-gray-200 shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200 text-lg font-medium text-gray-700 flex justify-center items-center">
                            View Cost Calculations
                        </button>

                    </div>
                </div>
                
            </main>
        </div>
    );
}

// Reusable component for the sidebar buttons to keep code clean
function NavItem({ label, active }) {
    return (
        <button 
            className={`px-4 py-3 rounded-md text-left transition-colors font-medium ${
                active 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
}