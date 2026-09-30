import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
    Settings, Users, UserPlus, ShieldAlert, LogOut, LayoutGrid, 
    ChevronDown, Leaf, Package, Factory, Store, ClipboardList 
} from 'lucide-react';
import ManageUsers from './ManageUsers'; 
import CreateUserForm from './CreateUserForm'; 

export default function AdminSettings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('manage');
    
    // --- Switcher State ---
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const switcherRef = useRef(null);

    useEffect(() => {
        const currentRole = localStorage.getItem('userRole') || localStorage.getItem('role');
        if (currentRole !== 'Admin') {
            toast.error("Access Denied. Admins only.");
            navigate('/');
        }
    }, [navigate]);

    // Dropdown එකෙන් පිටත ක්ලික් කළ විට එය වැසීම
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Logout Logic ---
    const handleLogout = () => {
        localStorage.clear();
        navigate('/', { replace: true });
    };

    // --- Switcher Logic ---
    let allowedPaths = [];
    try {
        allowedPaths = JSON.parse(localStorage.getItem('allowedPaths')) || [];
    } catch (e) {
        allowedPaths = [];
    }

    const systemModules = [
        { id: 'handmade', name: 'H/T Factory', icon: Leaf, path: '/dashboard' },
        { id: 'packing', name: 'Packing Section', icon: Package, path: '/packing' },
        { id: 'factory', name: 'Main Factory', icon: Factory, path: '/factory' },
        { id: 'localSale', name: 'Local Sale', icon: Store, path: '/localsale' },
        { id: 'manufacturer', name: 'Manufacturing', icon: ClipboardList, path: '/manufacturer' },
        { id: 'admin', name: 'Admin Settings', icon: Settings, path: '/admin/settings' },
    ];

    const accessibleModules = systemModules.filter(mod => allowedPaths.includes(mod.id));
    const currentModule = systemModules.find(mod => mod.id === 'admin'); // දැනට සිටින්නේ Admin පිටුවේය

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-transparent transition-colors duration-300">
            
            {/* --- Header Section (Title + Actions) --- */}
            <div className="mb-8 border-b border-gray-200 dark:border-zinc-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-3 tracking-tight">
                        <Settings className="text-[#1B6A31] dark:text-green-500" size={32} />
                        Admin Settings & Security
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage system users, roles, and granular access permissions.</p>
                </div>

                {/* Switcher & Logout Buttons */}
                <div className="flex items-center gap-3">
                    
                    {/* Module Switcher Dropdown */}
                    {accessibleModules.length > 1 && (
                        <div className="relative" ref={switcherRef}>
                            <button
                                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all font-bold text-gray-700 dark:text-gray-200 shadow-sm"
                            >
                                <LayoutGrid size={18} className="text-[#1B6A31] dark:text-green-500" />
                                <span className="hidden sm:block text-sm">Switch Section</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSwitcherOpen && (
                                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">System Sections</p>
                                    </div>
                                    <div className="p-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {accessibleModules.map((mod) => (
                                            <button
                                                key={mod.id}
                                                onClick={() => {
                                                    if (currentModule?.id !== mod.id) navigate(mod.path);
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                                    currentModule?.id === mod.id
                                                        ? 'bg-green-50 dark:bg-green-900/20 text-[#1B6A31] dark:text-green-500 pointer-events-none'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                <mod.icon size={16} className={currentModule?.id === mod.id ? "text-[#1B6A31] dark:text-green-500" : "text-gray-400 dark:text-gray-500"} />
                                                {mod.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/50 rounded-xl transition-all font-bold shadow-sm text-sm"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:block">Logout</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Sidebar Tabs */}
                <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                            activeTab === 'manage'
                                ? 'bg-[#1B6A31] text-white shadow-md'
                                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
                        }`}
                    >
                        <Users size={18} /> Manage Users
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                            activeTab === 'create'
                                ? 'bg-[#1B6A31] text-white shadow-md'
                                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
                        }`}
                    >
                        <UserPlus size={18} /> Create New User
                    </button>

                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl text-orange-800 dark:text-orange-300 text-xs font-semibold leading-relaxed">
                        <ShieldAlert size={16} className="mb-2" />
                        Admin settings modify core system access. Assign user permissions carefully.
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-4 md:p-8 min-h-[600px]">
                    {activeTab === 'manage' && <ManageUsers />}
                    {activeTab === 'create' && <CreateUserForm onSuccess={() => setActiveTab('manage')} />}
                </div>
            </div>
        </div>
    );
}