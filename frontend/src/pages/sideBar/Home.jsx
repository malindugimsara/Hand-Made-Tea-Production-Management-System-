import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Bell, AlertTriangle, TrendingDown, Zap, CheckCircle, Info, Leaf } from 'lucide-react';

export default function Home() {
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Basic Stats States
    const [glYesterday, setGlYesterday] = useState(0);
    const [mtYesterday, setMtYesterday] = useState(0);
    const [salesLastMonth, setSalesLastMonth] = useState(0);
    
    // Charts & Alerts States
    const [prodChartData, setProdChartData] = useState([]);
    const [salesChartData, setSalesChartData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // Fetch Green Leaf, Production, Sales, AND Labour
            const [glRes, prodRes, salesRes, labRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/selling-details`, { headers: authHeaders }), 
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders }) 
            ]);

            const glData = glRes.ok ? await glRes.json() : [];
            const prodData = prodRes.ok ? await prodRes.json() : [];
            const salesData = salesRes.ok ? await salesRes.json() : [];
            const labourData = labRes.ok ? await labRes.json() : [];

            // --- Get Yesterday's Date String (YYYY-MM-DD) ---
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

            // 1. Calculate Yesterday's Stats
            const yesterdayGL = glData.filter(item => item.date && item.date.startsWith(yesterdayStr));
            setGlYesterday(yesterdayGL.reduce((sum, item) => sum + (Number(item.selectedWeight) || 0), 0));

            const yesterdayProd = prodData.filter(item => item.date && item.date.startsWith(yesterdayStr));
            setMtYesterday(yesterdayProd.reduce((sum, item) => sum + (Number(item.madeTeaWeight) || 0), 0));

            // 2. Calculate Last Month's Sales
            const now = new Date();
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const targetMonth = lastMonthDate.getMonth();
            const targetYear = lastMonthDate.getFullYear();

            let totalRevenueLkrLastMonth = 0;
            const salesArray = Array.isArray(salesData) ? salesData : (salesData.records || []);
            
            salesArray.forEach(sale => {
                if (!sale.date) return;
                const saleDateObj = new Date(sale.date);
                if (saleDateObj.getMonth() === targetMonth && saleDateObj.getFullYear() === targetYear) {
                    const records = sale.records || [];
                    const exchangeRate = sale.exchangeRate || 300;
                    const saleUsd = records.reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
                    totalRevenueLkrLastMonth += (saleUsd * exchangeRate);
                }
            });
            setSalesLastMonth(totalRevenueLkrLastMonth);

            // ==========================================
            // CHART DATA PREPARATION
            // ==========================================
            
            // A. Production Chart (Last 7 Days)
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const pChartData = last7Days.map(date => {
                const glSum = glData.filter(g => g.date && g.date.startsWith(date)).reduce((sum, g) => sum + (Number(g.selectedWeight) || 0), 0);
                const mtSum = prodData.filter(p => p.date && p.date.startsWith(date)).reduce((sum, p) => sum + (Number(p.madeTeaWeight) || 0), 0);
                return { 
                    name: date.slice(5), // Show only MM-DD
                    GreenLeaf: glSum, 
                    MadeTea: mtSum 
                };
            });
            setProdChartData(pChartData);

            // B. Sales Chart (Last 6 Months)
            const last6Months = [...Array(6)].map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                return { month: d.getMonth(), year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }) };
            }).reverse();

            const sChartData = last6Months.map(m => {
                let rev = 0;
                salesArray.forEach(sale => {
                    if(!sale.date) return;
                    const d = new Date(sale.date);
                    if(d.getMonth() === m.month && d.getFullYear() === m.year) {
                        const records = sale.records || [];
                        const rate = sale.exchangeRate || 300;
                        const usd = records.reduce((s, r) => s + (Number(r.packs||0) * Number(r.price||0)), 0);
                        rev += (usd * rate);
                    }
                });
                return { name: m.name, Revenue: rev };
            });
            setSalesChartData(sChartData);

            // ==========================================
            // SMART ALERTS GENERATION
            // ==========================================
            const newAlerts = [];

            // Alert 1: Missing Labour Record Yesterday
            const hasLabourYesterday = labourData.some(l => l.date && l.date.startsWith(yesterdayStr));
            if (!hasLabourYesterday) {
                newAlerts.push({
                    id: 1, type: 'warning', icon: <AlertTriangle size={20}/>,
                    title: 'Missing Record',
                    message: "No Labour records found for yesterday. Please update the daily log."
                });
            }

            // Alert 2: Low Made Tea Percentage (< 15%)
            const weekGL = pChartData.reduce((s, c) => s + c.GreenLeaf, 0);
            const weekMT = pChartData.reduce((s, c) => s + c.MadeTea, 0);
            if (weekGL > 0 && (weekMT / weekGL) < 0.15) {
                newAlerts.push({
                    id: 2, type: 'danger', icon: <TrendingDown size={20}/>,
                    title: 'Low Yield Alert',
                    message: `Made Tea percentage is unusually low (${((weekMT/weekGL)*100).toFixed(1)}%) over the last 7 days.`
                });
            }

            // Alert 3: High Electricity Consumption
            const unitsPerDay = last7Days.map(date => {
                return prodData.filter(p => p.date && p.date.startsWith(date))
                    .reduce((sum, p) => {
                        const pts = p.dryerDetails?.units || ((Number(p.dryerDetails?.meterEnd)||0) - (Number(p.dryerDetails?.meterStart)||0));
                        return sum + pts;
                    }, 0);
            });
            const avgUnits = (unitsPerDay.reduce((a,b)=>a+b,0) / 7) || 0;
            const yesterdayUnits = unitsPerDay[5]; // Index 5 is yesterday
            
            if (yesterdayUnits > 0 && avgUnits > 0 && yesterdayUnits > (avgUnits * 1.4)) {
                newAlerts.push({
                    id: 3, type: 'electric', icon: <Zap size={20}/>,
                    title: 'High Power Usage',
                    message: `Electricity usage yesterday (${yesterdayUnits} pts) was significantly higher than the average (${avgUnits.toFixed(0)} pts).`
                });
            }

            // If everything is good
            if (newAlerts.length === 0) {
                newAlerts.push({
                    id: 4, type: 'success', icon: <CheckCircle size={20}/>,
                    title: 'All Systems Normal',
                    message: "Production yields and records are up to date."
                });
            }

            setAlerts(newAlerts);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-6 bg-gray-50 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER */}
            <div className="bg-gradient-to-r from-[#1B6A31] to-[#4A9E46] rounded-2xl p-8 md:p-10 text-white shadow-lg relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                
                {/* Content */}
                <div className="relative">
                    <p className="text-sm font-medium text-[#EBFFF4] mb-2">{today}</p>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                        {getGreeting()}, Admin! 🍃
                    </h2>
                    <p className="text-[#EBFFF4] text-base md:text-lg opacity-90 max-w-2xl leading-relaxed">
                        Here is the latest overview of the handmade tea production and sales.
                    </p>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#8CC63F]/20 rounded-full flex items-center justify-center text-[#4A9E46]">
                        <Leaf size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Yesterday's Green Leaf</p>
                        <p className="text-3xl font-black text-[#1B6A31]">
                            {isLoading ? '...' : glYesterday.toFixed(2)} <span className="text-sm text-gray-400 font-medium">kg</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#4A9E46]/10 rounded-full flex items-center justify-center text-[#1B6A31]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Yesterday's Made Tea</p>
                        <p className="text-3xl font-black text-[#1B6A31]">
                            {isLoading ? '...' : mtYesterday.toFixed(3)} <span className="text-sm text-gray-400 font-medium">kg</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#1B6A31]/10 rounded-full flex items-center justify-center text-[#1B6A31]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Sales (Last Month)</p>
                        <p className="text-3xl font-black text-[#1B6A31]">
                            <span className="text-lg">Rs.</span> {isLoading ? '...' : salesLastMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Chart 1: Production Trend */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Production Trend (Last 7 Days)</h3>
                            <p className="text-xs text-gray-500">Comparison of Selected Green Leaf vs Made Tea</p>
                        </div>
                        <div className="h-72 w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={prodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{fill: '#f9fafb'}}
                                        />
                                        <Bar dataKey="GreenLeaf" name="Green Leaf (kg)" fill="#A3D9A5" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="MadeTea" name="Made Tea (kg)" fill="#1B6A31" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Sales Revenue */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Sales Revenue (Last 6 Months)</h3>
                            <p className="text-xs text-gray-500">Estimated LKR Revenue trend</p>
                        </div>
                        <div className="h-60 w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4A9E46" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#4A9E46" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs ${val/1000}k`} />
                                        <Tooltip 
                                            formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="Revenue" stroke="#1B6A31" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Right Column: System Alerts --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Smart Alerts</h3>
                                <p className="text-xs text-gray-500">System generated notifications</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center text-sm text-gray-400 py-10">Checking system status...</div>
                            ) : (
                                alerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 rounded-xl border flex gap-4 ${
                                        alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                        alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                                        alert.type === 'electric' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                                        'bg-green-50 border-green-200 text-green-800'
                                    }`}>
                                        <div className="mt-0.5 opacity-80">
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{alert.title}</h4>
                                            <p className="text-xs opacity-90 leading-relaxed">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {!isLoading && alerts.length > 0 && (
                             <div className="mt-8 bg-gray-50 p-4 rounded-xl flex gap-3 items-start border border-gray-100">
                                 <Info size={16} className="text-gray-400 shrink-0 mt-0.5"/>
                                 <p className="text-[11px] text-gray-500 leading-relaxed">
                                     Alerts are automatically generated based on the data entered over the last 7 days.
                                 </p>
                             </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}