import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
    LogOut, Code2, Wrench, Receipt, LayoutDashboard, ChevronRight, Sparkles,
    Server, Clock, Zap, ArrowRight, Activity, 
    FileWarning,
    CheckCircle2
} from 'lucide-react';

import SystemUpdates from './SystemUpdates'; 
import SystemInvoice from './SystemInvoice';
import MissingRecords from './MissingRecords';
import SystemBackup from './SystemBackup';

export default function DeveloperSection() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    // 💡 Role Validation: Developer කෙනෙක් පමණක් ඇතුළු කරගනී
    useEffect(() => {
        const currentRole = localStorage.getItem('userRole') || localStorage.getItem('role');
        if (currentRole !== 'Developer') {
            toast.error("Access Denied. Restricted to Developers only.");
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/', { replace: true });
    };

    // Sidebar Tabs List
    const tabs = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'updates', label: 'System Updates', icon: Wrench },
        { id: 'invoice', label: 'Generate Invoice', icon: Receipt },
        { id: 'audit', label: 'Data Audit (Missing)', icon: FileWarning },
        { id: 'backup', label: 'System Backup', icon: Server },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
            
            {/* --- Top Navbar (Modern Header) --- */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                        <Code2 size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight leading-none text-slate-800 dark:text-white">Developer Console</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Athukorala Group UMS</p>
                    </div>
                </div>
                
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-all font-bold text-sm border border-rose-100 dark:border-rose-500/20"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:block">Logout</span>
                </button>
            </div>

            <div className="max-w-[1500px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-6 w-full">
                
                {/* --- Left Sidebar Tabs --- */}
                <div className="w-full md:w-56 flex-shrink-0 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl font-bold transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-500' 
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={18} className={isActive ? "text-white" : "text-slate-400 dark:text-slate-500"} />
                                    <span className="text-sm">{tab.label}</span>
                                </div>
                                {isActive && <ChevronRight size={16} className="opacity-80" />}
                            </button>
                        );
                    })}
                    
                    <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700/50 rounded-2xl text-left shadow-sm">
                        <Sparkles size={18} className="text-blue-500 mb-2" />
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Developer Zone</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Manage system patches, log new features, and generate development invoices seamlessly.
                        </p>
                    </div>
                </div>

                {/* --- Right Content Area --- */}
                <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[600px]">

                    {/* 1. Overview Screen (Modern Developer Dashboard) */}
                    {activeTab === 'overview' && (
                        <div className="h-full w-full p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto custom-scrollbar">
                            
                            {/* Dashboard Header */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">System Dashboard</h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Overview of Athukorala UMS technical operations.</p>
                            </div>

                            {/* Top Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* System Status Card */}
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={80} /></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <p className="text-emerald-100 text-sm font-bold mb-1 uppercase tracking-wider">System Status</p>
                                            <h3 className="text-3xl font-black">Online</h3>
                                        </div>
                                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <CheckCircle2 size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-100 relative z-10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_8px_rgba(110,231,183,0.8)]"></span> All services operational
                                    </div>
                                </div>

                                {/* Environment Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1 uppercase tracking-wider">Active Environment</p>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Production</h3>
                                        </div>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                            <Server size={24} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Hosted securely on Vercel
                                    </div>
                                </div>

                                {/* Server Time Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1 uppercase tracking-wider">Server Time</p>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 dark:border-amber-800/50">
                                            <Clock size={24} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        Asia/Colombo (GMT+5:30)
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Grids */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Quick Actions */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-5">
                                        <Zap size={20} className="text-amber-500" /> Quick Actions
                                    </h3>
                                    <div className="space-y-3">
                                        <button onClick={() => setActiveTab('updates')} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all group shadow-sm">
                                            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-bold">
                                                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                                    <Wrench size={18} />
                                                </div>
                                                Log System Update / Bug Fix
                                            </div>
                                            <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
                                        </button>

                                        <button onClick={() => setActiveTab('invoice')} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all group shadow-sm">
                                            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-bold">
                                                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                                                    <Receipt size={18} />
                                                </div>
                                                Generate Developer Invoice
                                            </div>
                                            <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors group-hover:translate-x-1" />
                                        </button>
                                    </div>
                                </div>

                                {/* System Information */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-5">
                                        <Code2 size={20} className="text-blue-500" /> System Architecture
                                    </h3>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Frontend Stack</span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">React + Vite + Tailwind CSS</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Backend Stack</span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Node.js + Express</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Database Engine</span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">MongoDB (Mongoose)</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Security & Auth</span>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md">JWT + Role Access</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. System Updates Render */}
                    {activeTab === 'updates' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full w-full">
                            <SystemUpdates />
                        </div>
                    )}
                    
                    {/* 3. Generate Invoice Render */}
                    {activeTab === 'invoice' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full w-full">
                            <SystemInvoice />
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full w-full">
                            <MissingRecords />
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full w-full">
                            <SystemBackup />        
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}