import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, AlertTriangle, TrendingDown, TrendingUp, BarChart2, Zap, CheckCircle, Info, Leaf, Package, DollarSign, Filter } from 'lucide-react';

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

    // Filter States
    const [selectedTeaType, setSelectedTeaType] = useState('All');

    // Store raw data to re-calculate chart when filter changes
    const [rawGlData, setRawGlData] = useState([]);
    const [rawProdData, setRawProdData] = useState([]);

    const todayDateObj = new Date();
    const today = todayDateObj.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const getGreeting = () => {
        const hour = todayDateObj.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    // Re-calculate Production Chart Data when Filter changes
    useEffect(() => {
        if (rawGlData.length > 0 || rawProdData.length > 0) {
            generateProductionChartData(rawGlData, rawProdData, selectedTeaType);
        }
    }, [selectedTeaType, rawGlData, rawProdData]);

    const generateProductionChartData = (glData, prodData, teaTypeFilter) => {
        // Generate array of dates from 1st of current month to TODAY
        const currentYear = todayDateObj.getFullYear();
        const currentMonth = todayDateObj.getMonth();
        const currentDay = todayDateObj.getDate();
        
        const currentMonthDays = [];
        for (let i = 1; i <= currentDay; i++) {
            const d = new Date(currentYear, currentMonth, i);
            currentMonthDays.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
        }

        const pChartData = currentMonthDays.map(date => {
            // Green Leaf is usually a single daily total, but if we need to filter by tea type, 
            // GL data doesn't typically have 'teaType'. If it does, we filter it. 
            // Usually, GL is total received. We will show Total GL unless you want to hide it when filtering.
            let glSum = 0;
            if (teaTypeFilter === 'All') {
                glSum = glData.filter(g => g.date && g.date.startsWith(date)).reduce((sum, g) => sum + (Number(g.selectedWeight) || 0), 0);
            }

            // Filter Production (Made Tea) by Tea Type
            const filteredProd = prodData.filter(p => {
                const dateMatch = p.date && p.date.startsWith(date);
                const typeMatch = teaTypeFilter === 'All' || p.teaType === teaTypeFilter;
                return dateMatch && typeMatch;
            });

            const mtSum = filteredProd.reduce((sum, p) => sum + (Number(p.madeTeaWeight) || 0), 0);
            
            return { 
                name: date.slice(8, 10), // Show only DD (Day) on X axis for cleaner look
                fullDate: date,
                GreenLeaf: glSum, 
                MadeTea: mtSum 
            };
        });

        setProdChartData(pChartData);
    };

    const fetchDashboardStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const last6MonthsInfo = [...Array(6)].map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                return {
                    monthStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                    name: d.toLocaleString('default', { month: 'short' })
                };
            });

            const salesPromises = last6MonthsInfo.map(info => 
                fetch(`${BACKEND_URL}/api/selling-details?month=${info.monthStr}`, { headers: authHeaders })
                    .then(res => res.ok ? res.json() : { records: [] })
                    .then(data => ({ ...data, ...info })) 
            );

            const [glRes, prodRes, labRes, ...salesResults] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders }), 
                ...salesPromises 
            ]);

            const glData = glRes.ok ? await glRes.json() : [];
            const prodData = prodRes.ok ? await prodRes.json() : [];
            const labourData = labRes.ok ? await labRes.json() : [];

            setRawGlData(glData);
            setRawProdData(prodData);

            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

            const yesterdayGL = glData.filter(item => item.date && item.date.startsWith(yesterdayStr));
            setGlYesterday(yesterdayGL.reduce((sum, item) => sum + (Number(item.selectedWeight) || 0), 0));

            const yesterdayProd = prodData.filter(item => item.date && item.date.startsWith(yesterdayStr));
            setMtYesterday(yesterdayProd.reduce((sum, item) => sum + (Number(item.madeTeaWeight) || 0), 0));

            const lastMonthData = salesResults[1]; 
            if (lastMonthData && lastMonthData.records) {
                const rate = lastMonthData.exchangeRate || 300;
                const usd = lastMonthData.records.reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
                setSalesLastMonth(usd * rate);
            } else {
                setSalesLastMonth(0);
            }

            // Generate initial chart data (All types)
            generateProductionChartData(glData, prodData, 'All');

            const sChartData = salesResults.map(saleMonth => {
                const rate = saleMonth.exchangeRate || 300;
                const usd = (saleMonth.records || []).reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
                return {
                    name: saleMonth.name,
                    Revenue: (usd * rate)
                };
            }).reverse();
            setSalesChartData(sChartData);

            // ==========================================
            // SMART ALERTS GENERATION
            // ==========================================
            const newAlerts = [];

            const hasLabourYesterday = labourData.some(l => l.date && l.date.startsWith(yesterdayStr));
            if (!hasLabourYesterday) {
                newAlerts.push({
                    id: 1, type: 'warning', icon: <AlertTriangle size={20}/>,
                    title: 'Missing Record',
                    message: "No Labour records found for yesterday. Please update the daily log."
                });
            }

            // Use last 7 days for alerts calculation
            const last7DaysStr = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            });

            const weekGLSum = glData.filter(g => last7DaysStr.includes(g.date?.substring(0,10))).reduce((s, g) => s + (Number(g.selectedWeight)||0), 0);
            const weekMTSum = prodData.filter(p => last7DaysStr.includes(p.date?.substring(0,10))).reduce((s, p) => s + (Number(p.madeTeaWeight)||0), 0);
            
            if (weekGLSum > 0 && (weekMTSum / weekGLSum) < 0.15) {
                newAlerts.push({
                    id: 2, type: 'danger', icon: <TrendingDown size={20}/>,
                    title: 'Low Yield Alert',
                    message: `Made Tea percentage is unusually low (${((weekMTSum/weekGLSum)*100).toFixed(1)}%) over the last 7 days.`
                });
            }

            const unitsPerDay = last7DaysStr.map(date => {
                return prodData.filter(p => p.date && p.date.startsWith(date))
                    .reduce((sum, p) => {
                        const pts = p.dryerDetails?.units || ((Number(p.dryerDetails?.meterEnd)||0) - (Number(p.dryerDetails?.meterStart)||0));
                        return sum + pts;
                    }, 0);
            });
            const avgUnits = (unitsPerDay.reduce((a,b)=>a+b,0) / 7) || 0;
            const yesterdayUnits = unitsPerDay[1]; // Index 1 is yesterday in reversed array
            
            if (yesterdayUnits > 0 && avgUnits > 0 && yesterdayUnits > (avgUnits * 1.4)) {
                newAlerts.push({
                    id: 3, type: 'electric', icon: <Zap size={20}/>,
                    title: 'High Power Usage',
                    message: `Electricity usage yesterday (${yesterdayUnits} pts) was significantly higher than the average (${avgUnits.toFixed(0)} pts).`
                });
            }

            if (newAlerts.length === 0) {
                newAlerts.push({
                    id: 4, type: 'success', icon: <CheckCircle size={20}/>,
                    title: 'All Systems Normal',
                    message: "Production yields and records are up to date."
                });
            }

            setAlerts(newAlerts);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentMonthName = todayDateObj.toLocaleString('default', { month: 'long' });

    return (
        <div className="p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-8 bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER */}
            <div className="bg-gradient-to-r from-[#1B6A31] to-[#4A9E46] rounded-2xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 dark:opacity-5 rounded-full blur-2xl pointer-events-none"></div>
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

            {/* 2. HIGHLIGHTED STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat Card 1 - Green Leaf */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#8CC63F] dark:bg-green-500"></div>
                    <div className="w-16 h-16 bg-[#8CC63F]/10 dark:bg-green-500/10 rounded-2xl flex items-center justify-center text-[#4A9E46] dark:text-green-500 group-hover:scale-110 transition-transform duration-300">
                        <Leaf size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Yesterday's Green Leaf</p>
                        <p className="text-4xl font-black text-[#1B6A31] dark:text-green-400">
                            {isLoading ? '...' : glYesterday.toFixed(2)} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 2 - Made Tea */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4A9E46] dark:bg-green-600"></div>
                    <div className="w-16 h-16 bg-[#4A9E46]/10 dark:bg-green-600/10 rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500 group-hover:scale-110 transition-transform duration-300">
                        <Package size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Yesterday's Made Tea</p>
                        <p className="text-4xl font-black text-[#1B6A31] dark:text-green-400">
                            {isLoading ? '...' : mtYesterday.toFixed(3)} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 3 - Sales */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31] dark:bg-green-700"></div>
                    <div className="w-16 h-16 bg-[#1B6A31]/10 dark:bg-green-700/10 rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500 group-hover:scale-110 transition-transform duration-300">
                        <DollarSign size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sales (Last Month)</p>
                        <p className="text-4xl font-black text-[#1B6A31] dark:text-green-400 flex items-baseline gap-1">
                            <span className="text-xl font-bold text-gray-400 dark:text-gray-500 mb-1">Rs.</span> 
                            {isLoading ? '...' : salesLastMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

            </div>

            {/* 3. HIGHLIGHTED CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Production Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-zinc-800 hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <BarChart2 className="text-[#8CC63F] dark:text-green-500" size={26}/> Production Trend
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Daily comparison for {currentMonthName}</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="relative">
                                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={selectedTeaType} 
                                        onChange={(e) => setSelectedTeaType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#8CC63F] cursor-pointer"
                                    >
                                        <option value="All">All Tea Types</option>
                                        <option value="Purple Tea">Purple Tea</option>
                                        <option value="Pink Tea">Pink Tea</option>
                                        <option value="White Tea">White Tea</option>
                                        <option value="Silver Tips">Silver Tips</option>
                                        <option value="Silver Green">Silver Green</option>
                                        <option value="VitaGlow Tea">VitaGlow Tea</option>
                                        <option value="Slim Beauty">Slim Beauty</option>
                                        <option value="Golden Tips">Golden Tips</option>
                                        <option value="Flower">Flower</option>
                                        <option value="Chakra">Chakra</option>
                                    </select>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50">
                                    1st - {todayDateObj.getDate()} {currentMonthName}
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-[320px] w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={prodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={15}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `${currentMonthName} ${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        {selectedTeaType === 'All' && (
                                            <Bar dataKey="GreenLeaf" name="Total Green Leaf (kg)" fill="#A3D9A5" radius={[4, 4, 0, 0]} />
                                        )}
                                        <Bar dataKey="MadeTea" name={`Made Tea (${selectedTeaType}) (kg)`} fill="#1B6A31" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Sales Revenue */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-zinc-800 hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <TrendingUp className="text-[#1B6A31] dark:text-green-500" size={26}/> Sales Revenue
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Estimated LKR Revenue trend</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800/50">
                                Last 6 Months
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4A9E46" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#4A9E46" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs ${val/1000}k`} />
                                        <Tooltip 
                                            formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                        />
                                        <Area type="monotone" dataKey="Revenue" stroke="#1B6A31" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Right Column: System Alerts --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-zinc-800 h-full transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-zinc-800 pb-5">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">System generated notifications</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center text-sm text-gray-400 py-10">Checking system status...</div>
                            ) : (
                                alerts.map((alert) => (
                                    <div key={alert.id} className={`p-4 rounded-2xl border flex gap-4 transition-all hover:-translate-y-0.5 ${
                                        alert.type === 'warning' ? 'bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400' :
                                        alert.type === 'danger' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400' :
                                        alert.type === 'electric' ? 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400' :
                                        'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
                                    }`}>
                                        <div className="mt-0.5 opacity-80">
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{alert.title}</h4>
                                            <p className="text-xs opacity-90 leading-relaxed font-medium">{alert.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {!isLoading && alerts.length > 0 && (
                             <div className="mt-8 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl flex gap-3 items-start border border-gray-200 dark:border-zinc-700">
                                 <Info size={18} className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5"/>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
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