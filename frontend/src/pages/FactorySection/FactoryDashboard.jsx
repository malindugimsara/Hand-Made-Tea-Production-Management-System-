import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, AlertTriangle, Calendar, CheckCircle, Info, TrendingUp, Sparkles, Factory, Scale, Leaf, ArrowRightLeft, Send } from 'lucide-react';import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// THEME  —  Factory Theme (Lime / Green & Yellow Mix)
// ─────────────────────────────────────────────
const THEME = {
  pageBg: '#fefce8', 
  orb1: 'rgba(101,163,13,0.22)', 
  orb2: 'rgba(132,204,22,0.18)', 
  orb3: 'rgba(234,179,8,0.15)', 
  gridStroke: '#65a30d',
  textPrimary: '#4d7c0f', 
  textSecondary: '#ca8a04', 
  accent: '#65a30d', 
  badgeBorder: '#d9f99d',
  badgeBg: '#f7fee7',
  badgeText: '#4d7c0f',
};

// ── Morphing Blobs Background ──
function MorphingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div animate={{ scale:[1,1.14,1], x:[0,40,0], y:[0,-30,0] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }} className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full" style={{ background:`radial-gradient(circle,${THEME.orb1} 0%,transparent 70%)` }} />
      <motion.div animate={{ scale:[1,1.2,1], x:[0,-30,0], y:[0,40,0] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }} className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full" style={{ background:`radial-gradient(circle,${THEME.orb2} 0%,transparent 70%)` }} />
      <motion.div animate={{ scale:[1,1.1,1], x:[0,20,0], y:[0,20,0] }} transition={{ duration:7, repeat:Infinity, ease:'easeInOut', delay:4 }} className="absolute -bottom-20 left-1/4 w-[360px] h-[360px] rounded-full" style={{ background:`radial-gradient(circle,${THEME.orb3} 0%,transparent 70%)` }} />
    </div>
  );
}

export default function FactoryDashboard() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    const [isLoading, setIsLoading] = useState(true);
    const [showCharts, setShowCharts] = useState(false); 
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [factoryRecords, setFactoryRecords] = useState([]);
    const [monthBF, setMonthBF] = useState(0);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        const timer = setTimeout(() => setShowCharts(true), 150);    
        return () => clearTimeout(timer);
    }, []);

    // API Data Fetching
    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setFactoryRecords(data.records || []);
                    setMonthBF(data.bfFromLastMonth || 0);
                } else {
                    toast.error("Failed to load factory data.");
                }
            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
                toast.error("Network error while loading data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [BACKEND_URL, selectedMonth]);

    // Data Processing for Charts & Cards
    const dashboardData = useMemo(() => {
        if (factoryRecords.length === 0) {
            return {
                currentFactoryBalance: monthBF,
                totalGreenLeafToDate: 0,
                totalMadeTeaToDate: 0,
                totalOutToDate: 0,
                mainChartData: [],
                balanceChartData: [],
                alerts: [{
                    id: 'no-data', type: 'info', icon: <Info size={20}/>,
                    title: 'No Data for Month',
                    message: `There are no factory records recorded yet for ${selectedMonth}.`
                }]
            };
        }

        const lastRecord = factoryRecords[factoryRecords.length - 1];
        const currentFactoryBalance = lastRecord.factoryBalance || 0;
        const totalGreenLeafToDate = lastRecord.greenLeaf?.toDate || 0;
        const totalMadeTeaToDate = lastRecord.madeTea?.toDate || 0;
        
        // Calculate Total Out for the month (Dispatch + Local Sale)
        const totalOutToDate = factoryRecords.reduce((sum, rec) => sum + (rec.totalOut || 0), 0);

        // Chart 1: Daily Inputs vs Outputs
        const mainChartData = factoryRecords.map(rec => ({
            name: rec.date.split('T')[0].substring(8, 10), // Day only
            GreenLeaf: rec.greenLeaf?.today || 0,
            MadeTea: rec.madeTea?.today || 0,
            TotalOut: rec.totalOut || 0
        }));

        // Chart 2: Daily Factory Balance Trend
        const balanceChartData = factoryRecords.map(rec => ({
            name: rec.date.split('T')[0].substring(8, 10),
            Balance: rec.factoryBalance || 0
        }));

        // Alerts Generation
        const generatedAlerts = [];
        if (currentFactoryBalance < 0) {
            generatedAlerts.push({
                id: 'neg-balance', type: 'danger', icon: <AlertTriangle size={20}/>,
                title: 'Negative Stock Balance',
                message: `The factory balance has dropped to ${currentFactoryBalance.toFixed(2)} kg. Please check the Dispatch and Returns records.`
            });
        }

        if (generatedAlerts.length === 0) {
             generatedAlerts.push({
                id: 'optimal', type: 'success', icon: <Sparkles size={20}/>,
                title: 'System Optimal',
                message: "No pending actions required. Factory operations are running smoothly."
            });
        }

        return {
            currentFactoryBalance,
            totalGreenLeafToDate,
            totalMadeTeaToDate,
            totalOutToDate,
            mainChartData,
            balanceChartData,
            alerts: generatedAlerts
        };
    }, [factoryRecords, monthBF, selectedMonth]); 

    const { 
        currentFactoryBalance, totalGreenLeafToDate, totalMadeTeaToDate, totalOutToDate,
        mainChartData, balanceChartData, alerts 
    } = dashboardData;

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col space-y-8 bg-[#fefce8] dark:bg-zinc-950 transition-colors duration-300 min-h-screen relative overflow-x-hidden">
            
            <MorphingBlobs />

            {/* 1. HERO WELCOME BANNER */}
            <div className="relative rounded-3xl overflow-hidden px-8 py-10 md:py-12 min-h-[200px] flex flex-col justify-center shadow-lg border border-lime-700/20 z-10">

                <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-20 left-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 w-fit mb-4 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.8)] animate-pulse" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-lime-50">Factory Analytics</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-2 text-white tracking-tight">
                            Welcome to <span className="text-lime-300">Factory Dashboard</span>
                        </h1>
                        <p className="text-sm md:text-base font-medium text-lime-50/90 max-w-xl">
                            {getGreeting()}! Real-time overview of green leaf, made tea production, and factory balance.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                        <Calendar className="text-lime-200 ml-2" size={24} />
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none font-bold text-white outline-none cursor-pointer text-lg"
                        />
                    </div>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-lime-400">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-lime-100 dark:bg-lime-900/20 rounded-xl flex items-center justify-center text-lime-700">
                            <Scale size={24} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-lime-200 text-lime-800 rounded-lg uppercase">Current Month</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Factory Balance</p>
                        <h3 className={`text-3xl font-black ${currentFactoryBalance < 0 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                            {isLoading ? '...' : currentFactoryBalance.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                        <p className="text-[11px] font-bold text-gray-400 mt-2">B/F: {monthBF.toFixed(2)} kg</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-green-400">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600">
                            <Leaf size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Green Leaf (To Date)</p>
                        <h3 className="text-3xl font-black text-green-700 dark:text-green-500">
                            {isLoading ? '...' : totalGreenLeafToDate.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-yellow-400">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center text-yellow-600">
                            <Factory size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Made Tea (To Date)</p>
                        <h3 className="text-3xl font-black text-yellow-600 dark:text-yellow-500">
                            {isLoading ? '...' : totalMadeTeaToDate.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-orange-400">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-600">
                            <Send size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Out (To Date)</p>
                        <h3 className="text-3xl font-black text-orange-600 dark:text-orange-500">
                            {isLoading ? '...' : totalOutToDate.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                    </div>
                </div>

            </div>

            {/* 3. CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Daily Production Overview */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                <TrendingUp className="text-[#65a30d]" size={20}/> Production Overview (Daily)
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Green Leaf vs Made Tea vs Dispatches</p>
                        </div>
                        
                        <div className="h-[320px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mainChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={10}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `Day: ${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} iconType="circle" />
                                        <Bar dataKey="GreenLeaf" name="Green Leaf (kg)" fill="#84cc16" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="MadeTea" name="Made Tea (kg)" fill="#4d7c0f" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="TotalOut" name="Total Out (kg)" fill="#facc15" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Balance Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                <ArrowRightLeft className="text-[#ca8a04]" size={20}/> Factory Balance Trend
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Daily ending balance monitoring</p>
                        </div>

                        <div className="h-[280px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading trend data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={balanceChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#facc15" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}kg`} />
                                        <Tooltip 
                                            formatter={(value) => [`${value} kg`, 'Factory Balance']}
                                            labelFormatter={(label) => `Day: ${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                        />
                                        <Area type="step" dataKey="Balance" stroke="#ca8a04" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Right Column: System Alerts --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-lime-50 text-lime-600 rounded-xl">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">System Alerts</h3>
                                </div>
                            </div>
                            <span className="bg-lime-100 text-lime-700 text-[10px] font-black px-2.5 py-1 rounded-full">{alerts.length}</span>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            {isLoading ? (
                                <div className="text-center text-sm text-gray-400 py-10">Syncing live alerts...</div>
                            ) : (
                                alerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:-translate-y-0.5 ${
                                        alert.type === 'danger' ? 'border-red-200 bg-red-50/50' :
                                        alert.type === 'success' ? 'border-lime-200 bg-lime-50/50' :
                                        'border-blue-200 bg-blue-50/50'
                                    }`}>
                                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                            alert.type === 'danger' ? 'bg-red-100 text-red-600' :
                                            alert.type === 'success' ? 'bg-lime-100 text-lime-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm mb-1 ${
                                                alert.type === 'danger' ? 'text-red-800' :
                                                alert.type === 'success' ? 'text-lime-800' :
                                                'text-blue-800'
                                            }`}>{alert.title}</h4>
                                            <p className="text-xs opacity-90 leading-relaxed font-medium text-gray-600">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}