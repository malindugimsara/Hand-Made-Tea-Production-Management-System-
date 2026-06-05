import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, AlertTriangle, Layers, Calendar, Filter, CheckCircle, Info, TrendingUp, Sparkles, X, Droplet, PackagePlus, Box, Truck, ArrowRightCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axiosConfig';

// Combined tea types
const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags(100)", 
    "Pitigala tea bags(50)", "T/B 25", "T/B 100", "Pitigala tea 400g", 
    "Awuru pack", "Labour drinking tea"
];

export default function PackingDashboard() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    // UI & Filter States
    const [isLoading, setIsLoading] = useState(true);
    const [showCharts, setShowCharts] = useState(false); 
    const [selectedTeaType, setSelectedTeaType] = useState('All'); 
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Modals State
    const [showLowStockModal, setShowLowStockModal] = useState(false);
    const [showTeaStockModal, setShowTeaStockModal] = useState(false); 

    // Raw Data State
    const [allRecords, setAllRecords] = useState([]);
    const [currentStockData, setCurrentStockData] = useState([]);
    const [rawMaterialStock, setRawMaterialStock] = useState([]); 
    
    // Pending Handmade Transfers State
    const [pendingHandmadeCount, setPendingHandmadeCount] = useState(0); 

    // Dates Setup
    const todayDateObj = new Date();
    const todayStr = todayDateObj.toISOString().split('T')[0];

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

    // Fetch Data
    // Fetch Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                // api.get භාවිතය (Token අවශ්‍ය නැත, Cookie හරහා යයි)
                const [resLocal, resTeaCenter, resStock, resRawMats, resPendingHandmade] = await Promise.all([
                    api.get('/api/local-sales').catch(() => ({ data: [] })),
                    api.get('/api/tea-center-issues').catch(() => ({ data: [] })),
                    api.get('/api/packing-stock').catch(() => ({ data: [] })),
                    api.get('/api/raw-materials-in/stock').catch(() => ({ data: [] })),
                    api.get('/api/packing/transfers/pending').catch(() => ({ data: [] }))
                ]);

                const localData = resLocal.data || [];
                const teaCenterData = resTeaCenter.data || [];
                const stockData = resStock.data || [];
                const rawMatData = resRawMats.data || [];
                const pendingHandmadeData = resPendingHandmade.data || [];

                // Combine Outward Issues for Charts
                const combinedRecords = [
                    ...(Array.isArray(localData) ? localData.map(d => ({ ...d, items: d.salesItems })) : []),
                    ...(Array.isArray(teaCenterData) ? teaCenterData.map(d => ({ ...d, items: d.issueItems })) : [])
                ];

                setAllRecords(combinedRecords);
                setCurrentStockData(Array.isArray(stockData) ? stockData : []);
                
                // rawMatData.data (සමහර විට ඔබේ API එකේ data key එක තුළ දත්ත ඇත)
                setRawMaterialStock(Array.isArray(rawMatData.data || rawMatData) ? (rawMatData.data || rawMatData) : []);
                
                setPendingHandmadeCount(Array.isArray(pendingHandmadeData) ? pendingHandmadeData.length : 0);

            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
                toast.error("Failed to load live dashboard data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [todayStr]);

    // Process Data efficiently using useMemo
    const dashboardData = useMemo(() => {
        if (!allRecords && currentStockData.length === 0) {
            return {
                totalCurrentStock: 0,
                purpleTeaStock: 0,
                lowStockList: [], 
                packingChartData: [],
                dispatchChartData: [],
                alerts: []
            };
        }

        // --- Calculate Bulk Tea Stock ---
        // Changed bulkStockKg to totalBulkStockKg to fix the NaN issue
        const totalStockKg = currentStockData.reduce((sum, item) => sum + (Number(item.totalBulkStockKg) || 0), 0);
        
        // Find Purple Tea Stock specifically
        const purpleTeaObj = currentStockData.find(tea => (tea.productName || '').toLowerCase().includes('purple'));
        const purpleTeaStock = purpleTeaObj ? (Number(purpleTeaObj.totalBulkStockKg) || 0) : 0;

        // --- Sort Tea Stock for Modal (Purple Tea at the top) ---
        const sortedCurrentStock = [...currentStockData].sort((a, b) => {
            const isAPurple = (a.productName || '').toLowerCase().includes('purple');
            const isBPurple = (b.productName || '').toLowerCase().includes('purple');
            if (isAPurple && !isBPurple) return -1;
            if (!isAPurple && isBPurple) return 1;
            return (a.productName || '').localeCompare(b.productName || '');
        });

        // --- Packing Output Trend ---
        const [yearStr, monthStr] = selectedMonth.split('-');
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        
        const packingChartData = Array.from({ length: daysInMonth }, (_, i) => ({
            name: String(i + 1).padStart(2, '0'),
            Pouches: 0,
            Boxes: 0
        }));

        allRecords.forEach(rec => {
            if (rec.date?.startsWith(selectedMonth)) {
                const dayStr = rec.date.split('-')[2]?.substring(0, 2);
                const dataRow = packingChartData.find(d => d.name === dayStr);
                
                if (dataRow) {
                    rec.items?.forEach(item => {
                        if (selectedTeaType !== 'All') {
                            if (!item.product || !item.product.toLowerCase().includes(selectedTeaType.toLowerCase())) {
                                return; 
                            }
                        }

                        if (Number(item.packSizeKg) <= 0.25) {
                            dataRow.Pouches += Number(item.numberOfBoxes) || 0;
                        } else {
                            dataRow.Boxes += Number(item.numberOfBoxes) || 0;
                        }
                    });
                }
            }
        });

        // --- Dispatch Volume ---
        const monthMap = {};
        for(let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const shortName = d.toLocaleString('default', { month: 'short' });
            monthMap[yyyyMm] = { name: shortName, DispatchedKG: 0 };
        }

        allRecords.forEach(rec => {
            const yyyyMm = rec.date?.substring(0, 7);
            if (yyyyMm && monthMap[yyyyMm]) {
                monthMap[yyyyMm].DispatchedKG += Number(rec.totalQtyKg) || 0;
            }
        });

        // ============================================
        // --- SMART ALERTS & LOW STOCK FILTERING ---
        // ============================================
        const generatedAlerts = [];
        const lowStockItems = []; 

        // Pending Transfers Alert එක විතරක් Smart Alerts වලට දානවා
        if (pendingHandmadeCount > 0) {
            generatedAlerts.push({
                id: 'trans-in', type: 'warning', icon: <PackagePlus size={20}/>,
                title: 'Pending Handmade Transfers',
                message: `You have ${pendingHandmadeCount} pending stock transfer(s) from Handmade waiting for approval.`
            });
        }
        
        // 1. Check Bulk Tea Stock (Limit: <= 100kg) - Card එකට විතරයි
        if (currentStockData && currentStockData.length > 0) {
            currentStockData.forEach(tea => {
                const qty = Number(tea.totalBulkStockKg) || 0;
                if (qty <= 100) {
                    lowStockItems.push({ name: tea.productName, current: qty.toFixed(2), unit: 'kg' });
                }
            });
        }

        // 2. Check Raw Materials Stock (Flavor Limit: <= 5kg | Other Limit: <= 500pcs) - Card එකට විතරයි
        if (rawMaterialStock && rawMaterialStock.length > 0) {
            rawMaterialStock.forEach((rm) => {
                const qty = Number(rm.totalQuantity) || 0;
                
                const isFlavor = (rm.category || '').toLowerCase() === 'flavor';
                const threshold = isFlavor ? 5 : 500; 
                
                if (qty <= threshold) {
                    lowStockItems.push({ 
                        name: rm.materialName || 'Unknown Material', 
                        current: qty % 1 !== 0 ? qty.toFixed(2) : qty, 
                        unit: rm.unit || (isFlavor ? 'kg' : 'pcs') 
                    });
                }
            });
        }

        // Alert එකක්වත් නැත්නම් විතරක් "System Optimal" කියලා පෙන්නන්න
        if (generatedAlerts.length === 0) {
             generatedAlerts.push({
                id: 'optimal', type: 'info', icon: <Sparkles size={20}/>,
                title: 'System Optimal',
                message: "No pending actions required. Operations are running smoothly."
            });
        }

        return {
            totalCurrentStock: totalStockKg,
            purpleTeaStock: purpleTeaStock,
            sortedCurrentStock, 
            lowStockList: lowStockItems, 
            packingChartData: packingChartData, 
            dispatchChartData: Object.values(monthMap).map(m => ({
                name: m.name,
                DispatchedKG: Number(m.DispatchedKG.toFixed(2))
            })),
            alerts: generatedAlerts
        };
    }, [allRecords, currentStockData, rawMaterialStock, selectedMonth, todayStr, selectedTeaType, pendingHandmadeCount]); 

    const getChartDateLabel = () => {
        if (!selectedMonth) return "";
        const [yearStr, monthStr] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const monthNameShort = dateObj.toLocaleString('default', { month: 'short' });
        const maxDay = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        return `1st - ${maxDay} ${monthNameShort}`;
    };

    const { 
        totalCurrentStock, purpleTeaStock, sortedCurrentStock, lowStockList, 
        packingChartData, dispatchChartData, alerts 
    } = dashboardData;

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col space-y-8 bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER */}
            <div className="relative rounded-3xl overflow-hidden px-8 py-10 md:py-12 min-h-[220px] flex flex-col justify-center shadow-lg border border-teal-700/20"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #115e59 100%)' }}>

                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 w-fit mb-5 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.8)] animate-pulse" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-teal-50">
                            Live Operations
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3 text-white tracking-tight">
                        Welcome to <span className="text-teal-200">Packing Section</span>
                    </h1>

                    <p className="text-sm md:text-base font-medium text-teal-50/80 max-w-xl">
                        {getGreeting()}, here is your real-time overview of daily production, dispatches, and inventory levels.
                    </p>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Card: Total Tea Stock (CLICKABLE) */}
                <div 
                    onClick={() => setShowTeaStockModal(true)}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Layers size={24} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg uppercase animate-pulse">View Stock</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Tea Stock</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : totalCurrentStock.toFixed(2)} <span className="text-sm text-gray-400 font-semibold lowercase">kg</span>
                        </h3>
                        <div className="mt-3 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 px-2 py-1 rounded-md inline-flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                            Purple Tea: {purpleTeaStock.toFixed(2)} kg
                        </div>
                    </div>
                </div>

                {/* 2. Card: Pending Handmade Trans-In */}
                <div 
                    onClick={() => pendingHandmadeCount > 0 && navigate('/packing/trans-in-entry')}
                    className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all group ${pendingHandmadeCount > 0 ? 'cursor-pointer hover:shadow-md hover:border-teal-200 dark:hover:border-teal-900/50' : ''}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                            <ArrowRightCircle size={24} />
                        </div>
                        {pendingHandmadeCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg uppercase animate-pulse">Action Needed</span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg uppercase">Up to date</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pending Handmade Trans-In</p>
                        <h3 className={`text-3xl font-black ${pendingHandmadeCount > 0 ? 'text-orange-500' : 'text-teal-600 dark:text-teal-500'}`}>
                            {isLoading ? '...' : pendingHandmadeCount} <span className="text-sm text-gray-400 font-semibold lowercase">transfers</span>
                        </h3>
                    </div>
                </div>

                {/* 3. Card: Low Stock Alerts (CLICKABLE) */}
                <div 
                    onClick={() => lowStockList.length > 0 && setShowLowStockModal(true)}
                    className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all group ${lowStockList.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-red-300 dark:hover:border-red-800' : ''}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                            <AlertTriangle size={24} />
                        </div>
                        {lowStockList.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg uppercase animate-pulse">View Details</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                        <h3 className="text-3xl font-black text-red-600 dark:text-red-500">
                            {isLoading ? '...' : lowStockList.length} <span className="text-sm text-gray-400 font-semibold lowercase">items</span>
                        </h3>
                    </div>
                </div>

            </div>

            {/* 3. CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Packing Output Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="text-[#0d9488] dark:text-teal-500" size={20}/> Packing Output Trend
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">Daily packages produced comparison</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#0d9488] cursor-pointer transition-colors"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={selectedTeaType} 
                                        onChange={(e) => setSelectedTeaType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#0d9488] cursor-pointer transition-colors appearance-none max-w-[140px]"
                                    >
                                        <option value="All">All Products</option>
                                        {TEA_TYPES.map(tea => (
                                            <option key={tea} value={tea}>{tea}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-teal-50 dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 px-4 py-2 rounded-xl text-xs font-bold border border-teal-100 dark:border-teal-800/50 whitespace-nowrap">
                                    {getChartDateLabel()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-[320px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={packingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={12}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `Date: ${selectedMonth}-${label}`}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#6b7280' }} iconType="circle" />
                                        <Bar dataKey="Pouches" name="Pouches (≤250g)" fill="#34d399" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                        <Bar dataKey="Boxes" name="Boxes (>250g)" fill="#0f766e" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Dispatch Trends */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Truck className="text-amber-500" size={20}/> Dispatch Volume
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">Total dispatched tea (KG) over last 6 months</p>
                            </div>
                            <div className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-zinc-700 uppercase tracking-widest">
                                6 Month Trend
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            {isLoading || !showCharts ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading volume data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dispatchChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDispatch" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                                        <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 11, fontWeight: 600, fill: '#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}kg`} />
                                        <Tooltip 
                                            formatter={(value) => [`${value} kg`, 'Dispatched']}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="DispatchedKG" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDispatch)" isAnimationActive={false} />
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
                                <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
                                </div>
                            </div>
                            <span className="bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full">{alerts.length}</span>
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
                                        alert.type === 'danger' ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10' :
                                        alert.type === 'success' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10' :
                                        'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10'
                                    }`}>
                                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                            alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-500' :
                                            alert.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-500' :
                                            alert.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-500' :
                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-500'
                                        }`}>
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm mb-1 ${
                                                alert.type === 'warning' ? 'text-yellow-800 dark:text-yellow-500' :
                                                alert.type === 'danger' ? 'text-red-800 dark:text-red-400' :
                                                alert.type === 'success' ? 'text-emerald-800 dark:text-emerald-400' :
                                                'text-blue-800 dark:text-blue-400'
                                            }`}>{alert.title}</h4>
                                            <p className="text-xs opacity-90 leading-relaxed font-medium text-gray-600 dark:text-gray-400">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {!isLoading && alerts.length > 0 && (
                             <div className="mt-6 bg-[#f0fdfb] dark:bg-zinc-800/50 p-4 rounded-2xl flex gap-3 items-start border border-teal-100 dark:border-zinc-700">
                                 <Info size={18} className="text-teal-600 dark:text-teal-500 shrink-0 mt-0.5"/>
                                 <p className="text-[11px] text-teal-800 dark:text-teal-400 font-medium leading-relaxed uppercase tracking-wide">
                                     Alerts are automatically generated based on real-time inventory levels and dispatch queues.
                                 </p>
                             </div>
                        )}
                    </div>
                </div>

            </div>

            {/* --- 1. TEA STOCK DETAILS MODAL --- */}
            {showTeaStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-blue-50/50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-500 flex items-center gap-2">
                                <Layers size={20}/> Available Tea Stock
                            </h3>
                            <button onClick={() => setShowTeaStockModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded-full transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {(!sortedCurrentStock || sortedCurrentStock.length === 0) ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No tea stock available.</p>
                            ) : (
                                <div className="space-y-3">
                                    {sortedCurrentStock.map((item, i) => {
                                        const isPurple = (item.productName || '').toLowerCase().includes('purple');
                                        return (
                                            <div key={i} className={`flex justify-between items-center p-3.5 border rounded-2xl transition-colors ${
                                                isPurple ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 hover:border-purple-300' 
                                                : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700/50 hover:border-blue-200 dark:hover:border-blue-900/50'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isPurple ? 'bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-blue-500'}`}></div>
                                                    <span className={`font-bold ${isPurple ? 'text-purple-800 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {item.productName}
                                                    </span>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className={`font-black text-lg ${isPurple ? 'text-purple-600 dark:text-purple-400' : 'text-[#0f766e] dark:text-teal-400'}`}>
                                                        {/* Changed to totalBulkStockKg to fix NaN */}
                                                        {(Number(item.totalBulkStockKg) || 0).toFixed(2)}
                                                    </span>
                                                    <span className="text-gray-400 text-xs font-bold ml-1">kg</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex justify-end">
                            <button onClick={() => setShowTeaStockModal(false)} className="px-6 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 2. LOW STOCK DETAILS MODAL --- */}
            {showLowStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-red-600 dark:text-red-500 flex items-center gap-2">
                                <AlertTriangle size={20}/> Low Stock Details
                            </h3>
                            <button onClick={() => setShowLowStockModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded-full transition-colors">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {lowStockList.length === 0 ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">All stock levels are currently normal.</p>
                            ) : (
                                <div className="space-y-3">
                                    {lowStockList.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{item.name}</span>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <span className="text-red-600 dark:text-red-400 font-black text-lg">{item.current}</span>
                                                <span className="text-red-500/70 text-xs font-bold ml-1">{item.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex justify-end">
                            <button onClick={() => setShowLowStockModal(false)} className="px-6 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}