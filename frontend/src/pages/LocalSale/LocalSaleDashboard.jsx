import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, Calendar, CheckCircle, Info, TrendingUp, Sparkles, X, Store, ShoppingBag, Activity, CalendarCheck, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LocalSaleDashboard() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    
    // UI & Filter States
    const [isLoading, setIsLoading] = useState(true);
    const [showCharts, setShowCharts] = useState(false); 
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Modals State
    const [showTodaySalesModal, setShowTodaySalesModal] = useState(false);

    // Real Data States
    const [dailySummaries, setDailySummaries] = useState([]);
    const [issueSummaries, setIssueSummaries] = useState([]);

    // Dates Setup
    const todayDateObj = new Date();
    const todayStr = new Date(todayDateObj.getTime() - (todayDateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const getGreeting = () => {
        const hour = todayDateObj.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowCharts(true);
        }, 150); 
        return () => clearTimeout(timer);
    }, []);

    // Fetch All Summaries to Calculate Real Net Sales
    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("token");
                // Fetch Daily IN/OUT and Issues simultaneously
                const [dailyRes, issueRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/summary`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }),
                    fetch(`${BACKEND_URL}/api/issue-summary`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                ]);
                
                if (dailyRes.ok && issueRes.ok) {
                    const dailyData = await dailyRes.json();
                    const issueData = await issueRes.json();
                    setDailySummaries(dailyData.data || []);
                    setIssueSummaries(issueData.data || []);
                } else {
                    toast.error("Failed to load real-time sales data.");
                }

            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
                toast.error("Network error. Could not connect to server.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
        
        // Auto-refresh data every 60 seconds
        const intervalId = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(intervalId);
    }, [BACKEND_URL]);

    // Process Data efficiently using useMemo (Calculate Net Sales = OUT - Issues)
    const dashboardData = useMemo(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        
        let totalMonthKg = 0;
        let totalTodayKg = 0;
        const activeSaleDays = new Set();
        const todayItemsMap = {}; 

        // Setup Daily Chart Array
        const dailyChartData = Array.from({ length: daysInMonth }, (_, i) => ({
            name: String(i + 1).padStart(2, '0'),
            SalesKG: 0
        }));

        // Setup 6-Month Trend Array
        const monthMap = {};
        for(let i = 5; i >= 0; i--) {
            const d = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth() - i, 1);
            const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const shortName = d.toLocaleString('default', { month: 'short' });
            monthMap[yyyyMm] = { name: shortName, TotalKG: 0 };
        }

        // Map to hold calculated Net Sales per day per item
        const netSalesMap = {}; 

        // 1. Gather all OUTs from Daily Summary
        dailySummaries.forEach(record => {
            const date = record.date;
            if (!netSalesMap[date]) netSalesMap[date] = {};
            record.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                if (!netSalesMap[date][key]) {
                    netSalesMap[date][key] = { title: item.categoryTitle || item.categoryId, size: item.size, out: 0, issues: 0 };
                }
                netSalesMap[date][key].out += (Number(item.out) || 0);
            });
        });

        // 2. Gather all Deductions from Issues
        issueSummaries.forEach(record => {
            const date = record.date;
            if (!netSalesMap[date]) netSalesMap[date] = {};
            record.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                if (!netSalesMap[date][key]) {
                    netSalesMap[date][key] = { title: item.categoryTitle || item.categoryId, size: item.size, out: 0, issues: 0 };
                }
                netSalesMap[date][key].issues += (Number(item.out) || 0);
            });
        });

        // 3. Calculate Final Net Sales and Populate Dashboard Metrics
        Object.entries(netSalesMap).forEach(([date, items]) => {
            const yyyyMm = date.substring(0, 7);
            
            Object.values(items).forEach(item => {
                // Net Sale = Total OUT - All Issues
                const netKg = item.out - item.issues;
                
                if (netKg > 0) {
                    // Month Stats
                    if (yyyyMm === selectedMonth) {
                        totalMonthKg += netKg;
                        activeSaleDays.add(date);

                        const dayStr = date.split('-')[2];
                        const chartRow = dailyChartData.find(d => d.name === dayStr);
                        if (chartRow) chartRow.SalesKG += netKg;
                    }

                    // Today Stats
                    if (date === todayStr) {
                        totalTodayKg += netKg;
                        const tKey = `${item.title}_${item.size}`;
                        if (!todayItemsMap[tKey]) {
                            todayItemsMap[tKey] = { title: item.title, size: item.size, netKg: 0 };
                        }
                        todayItemsMap[tKey].netKg += netKg;
                    }

                    // 6-Month Trend Stats
                    if (monthMap[yyyyMm]) {
                        monthMap[yyyyMm].TotalKG += netKg;
                    }
                }
            });
        });

        const todayRecordsArray = Object.values(todayItemsMap).sort((a, b) => b.netKg - a.netKg);
        const monthActiveDays = activeSaleDays.size;

        // ============================================
        // --- SMART ALERTS (Green & Yellow themed) ---
        // ============================================
        const generatedAlerts = [];

        if (totalTodayKg > 0) {
            generatedAlerts.push({
                id: 'sales-active', type: 'success', icon: <TrendingUp size={20}/>,
                title: 'Sales Active Today',
                message: `You have successfully sold ${totalTodayKg.toFixed(2)}kg of tea today across ${todayRecordsArray.length} product categories.`
            });
        } else {
            generatedAlerts.push({
                id: 'no-sales', type: 'warning', icon: <Info size={20}/>,
                title: 'No Sales Yet',
                message: `No net sales have been recorded for today (${todayStr}) yet.`
            });
        }

        if (totalMonthKg > 500) {
             generatedAlerts.push({
                id: 'high-volume', type: 'success', icon: <Sparkles size={20}/>,
                title: 'High Monthly Volume',
                message: `Great performance! You have crossed ${totalMonthKg.toFixed(2)}kg in net sales this month.`
            });
        }

        return {
            totalMonthKg,
            totalTodayKg,
            monthActiveDays,
            todayRecords: todayRecordsArray, 
            dailyChartData, 
            monthlyTrendData: Object.values(monthMap).map(m => ({
                name: m.name,
                TotalKG: Number(m.TotalKG.toFixed(2))
            })),
            alerts: generatedAlerts
        };
    }, [dailySummaries, issueSummaries, selectedMonth, todayStr, todayDateObj]); 

    const getChartDateLabel = () => {
        if (!selectedMonth) return "";
        const [yearStr, monthStr] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const monthNameShort = dateObj.toLocaleString('default', { month: 'short' });
        const maxDay = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        return `1st - ${maxDay} ${monthNameShort}`;
    };

    const { 
        totalMonthKg, totalTodayKg, monthActiveDays, todayRecords, 
        dailyChartData, monthlyTrendData, alerts 
    } = dashboardData;

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col space-y-8 bg-[#fefce8] dark:bg-zinc-950 transition-colors duration-300 min-h-screen font-sans">
            
            {/* 1. HERO WELCOME BANNER (Green to Yellow Gradient) */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden px-5 py-8 sm:px-8 sm:py-10 md:py-12 min-h-[180px] md:min-h-[220px] flex flex-col justify-center shadow-lg border border-green-700/20 z-10"
                style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #eab308 100%)' }}>

                {/* Background Animations */}
                <div className="absolute -top-10 -right-10 sm:top-0 sm:right-0 w-64 h-64 md:w-96 md:h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[60px] md:blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 sm:-bottom-20 sm:left-10 w-48 h-48 md:w-72 md:h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-[50px] md:blur-[80px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="relative z-10 flex flex-col items-start text-left w-full">
                    
                    {/* Live Operations Badge */}
                    <div className="flex items-center gap-2 w-fit mb-3 sm:mb-5 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 shadow-sm">
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.8)] animate-pulse" />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-green-50">
                            Live Net Sales Sync
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-2 sm:mb-3 text-white tracking-tight drop-shadow-sm">
                        Welcome to <span className="text-yellow-200 block sm:inline">Local Sale Dashboard</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xs sm:text-sm md:text-base font-medium text-green-50/90 max-w-full sm:max-w-md md:max-w-xl drop-shadow-sm leading-relaxed">
                        {getGreeting()}, here is your real-time overview of net sales volumes and active selling days based on your daily IN/OUT records.
                    </p>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: Today's Sales (CLICKABLE) */}
                <div 
                    onClick={() => todayRecords.length > 0 && setShowTodaySalesModal(true)}
                    className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all group ${todayRecords.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-green-300 dark:hover:border-green-800' : ''}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                            <Store size={24} />
                        </div>
                        {todayRecords.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg uppercase animate-pulse">View Items</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Today's Net Sales</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : totalTodayKg.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                        <div className="mt-3 text-[11px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 px-2 py-1 rounded-md inline-flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            {todayRecords.length} Items Sold Today
                        </div>
                    </div>
                </div>

                {/* Card 2: Monthly Sales Volume */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all group hover:shadow-md hover:border-yellow-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform">
                            <ShoppingBag size={24} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-lg uppercase">This Month</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Monthly Net Sales</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : totalMonthKg.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                    </div>
                </div>

                {/* Card 3: Monthly Active Days */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all group hover:shadow-md hover:border-green-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                            <CalendarCheck size={24} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-lg uppercase">This Month</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Active Sale Days</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : monthActiveDays} <span className="text-sm text-gray-400 font-semibold lowercase">Days</span>
                        </h3>
                    </div>
                </div>

            </div>

            {/* 3. CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Daily Local Sales Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-green-800 dark:text-green-500">
                                    <Activity size={20}/> Daily Net Sales Volume
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">Kilograms sold per day</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-green-600 cursor-pointer transition-colors"
                                    />
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50 whitespace-nowrap">
                                    {getChartDateLabel()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-[320px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={16}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `Date: ${selectedMonth}-${label}`}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }} iconType="circle" />
                                        <Bar dataKey="SalesKG" name="Net Sales (Kg)" fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: 6-Month Sales Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-600">
                                    <TrendingUp size={20}/> 6-Month Performance
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">Total net sales volume (KG) over time</p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-4 py-1.5 rounded-full text-[10px] font-bold border border-yellow-200 dark:border-yellow-700/50 uppercase tracking-widest">
                                Historical Trend
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading trend data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}kg`} />
                                        <Tooltip 
                                            formatter={(value) => [`${value} kg`, 'Total Net Sold']}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="TotalKG" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Right Column: System Alerts --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col transition-colors duration-300">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-zinc-800 pb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
                                </div>
                            </div>
                            <span className="bg-green-100 text-green-800 text-[10px] font-black px-2.5 py-1 rounded-full">{alerts.length}</span>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            {isLoading ? (
                                <div className="text-center text-sm text-gray-400 py-10">Syncing live alerts...</div>
                            ) : alerts.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 py-10 flex flex-col items-center gap-2">
                                    <CheckCircle className="text-green-400 opacity-50" size={32}/>
                                    <p>All clear. No active alerts.</p>
                                </div>
                            ) : (
                                alerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:-translate-y-0.5 ${
                                        alert.type === 'warning' ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-900/10' :
                                        alert.type === 'success' ? 'border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' :
                                        'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10'
                                    }`}>
                                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                            alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500' :
                                            alert.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-500' :
                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-500'
                                        }`}>
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm mb-1 ${
                                                alert.type === 'warning' ? 'text-yellow-800 dark:text-yellow-500' :
                                                alert.type === 'success' ? 'text-green-800 dark:text-green-400' :
                                                'text-blue-800 dark:text-blue-400'
                                            }`}>{alert.title}</h4>
                                            <p className="text-xs opacity-90 leading-relaxed font-medium text-gray-600 dark:text-gray-400">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {!isLoading && alerts.length > 0 && (
                             <div className="mt-6 bg-[#fefce8] dark:bg-zinc-800/50 p-4 rounded-2xl flex gap-3 items-start border border-yellow-100 dark:border-zinc-700">
                                 <Info size={18} className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5"/>
                                 <p className="text-[11px] text-yellow-800 dark:text-yellow-400 font-medium leading-relaxed uppercase tracking-wide">
                                     Alerts are automatically generated based on daily activity and net sales milestones.
                                 </p>
                             </div>
                        )}
                    </div>
                </div>

            </div>

            {/* --- MODAL: TODAY'S SOLD ITEMS --- */}
            {showTodaySalesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-green-50/50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-green-700 dark:text-green-500 flex items-center gap-2">
                                <Package size={20}/> Today's Sold Items
                            </h3>
                            <button onClick={() => setShowTodaySalesModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded-full transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {todayRecords.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No sales recorded today.</p>
                            ) : (
                                <div className="space-y-3">
                                    {todayRecords.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3.5 border bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700/50 rounded-2xl hover:border-green-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                                    {item.title} <span className="text-gray-500 text-xs">({item.size})</span>
                                                </span>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <span className="font-black text-lg text-green-700 dark:text-green-400">
                                                    {item.netKg.toFixed(2)}
                                                </span>
                                                <span className="text-gray-400 text-xs font-bold ml-1">kg</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex justify-end">
                            <button onClick={() => setShowTodaySalesModal(false)} className="px-6 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}