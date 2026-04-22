import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, AlertTriangle, Package, Truck, Layers, BarChart2, CheckCircle, Info, Box, Calendar, Filter } from 'lucide-react';

export default function PackingDashboard() {
    const navigate = useNavigate();
    
    // Basic Stats States
    const [packedYesterday, setPackedYesterday] = useState(0);
    const [pendingDispatch, setPendingDispatch] = useState(0);
    const [lowStockMaterials, setLowStockMaterials] = useState(0);
    
    // Charts & Alerts States
    const [packingChartData, setPackingChartData] = useState([]);
    const [dispatchChartData, setDispatchChartData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [selectedProductType, setSelectedProductType] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

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
        // Simulating an API fetch with Mock Data
        const loadDashboardData = () => {
            setTimeout(() => {
                // 1. Mock Stats
                setPackedYesterday(145.5);
                setPendingDispatch(42);
                setLowStockMaterials(3);

                // 2. Mock Bar Chart Data (Packing Output)
                const mockPackingData = [...Array(15)].map((_, i) => {
                    return {
                        name: String(i + 1).padStart(2, '0'),
                        Pouches: Math.floor(Math.random() * 50) + 20,
                        Boxes: Math.floor(Math.random() * 30) + 10,
                    };
                });
                setPackingChartData(mockPackingData);

                // 3. Mock Area Chart Data (Dispatch Trends)
                const mockDispatchData = [...Array(6)].map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - (5 - i));
                    return {
                        name: d.toLocaleString('default', { month: 'short' }),
                        DispatchedKG: Math.floor(Math.random() * 500) + 200,
                    };
                });
                setDispatchChartData(mockDispatchData);

                // 4. Mock Alerts
                setAlerts([
                    {
                        id: 1, type: 'danger', icon: <AlertTriangle size={20}/>,
                        title: 'Low Material Stock',
                        message: "50g Silver Pouches are running critically low (Under 100 units remaining)."
                    },
                    {
                        id: 2, type: 'warning', icon: <Truck size={20}/>,
                        title: 'Pending Dispatch Delay',
                        message: "Shipment #1042 to Colombo has been pending for over 48 hours."
                    },
                    {
                        id: 3, type: 'success', icon: <CheckCircle size={20}/>,
                        title: 'Target Met',
                        message: "Yesterday's packing target of 120kg was successfully exceeded."
                    }
                ]);

                setIsLoading(false);
            }, 800); // 800ms loading simulation
        };

        loadDashboardData();
    }, [selectedMonth, selectedProductType]); // Re-fetch or re-calculate when filters change

    // Label generation for Chart badge (e.g., "1st - 15th Apr")
    const getChartDateLabel = () => {
        if (!selectedMonth) return "";
        const [yearStr, monthStr] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const monthNameShort = dateObj.toLocaleString('default', { month: 'short' });
        
        const isCurrentMonth = todayDateObj.getFullYear() === parseInt(yearStr, 10) && (todayDateObj.getMonth() + 1) === parseInt(monthStr, 10);
        const maxDay = isCurrentMonth ? todayDateObj.getDate() : new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        
        return `1st - ${maxDay} ${monthNameShort}`;
    };

    return (
        <div className="p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-8 bg-[#f0fdfb] dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER (Packing Theme) */}
            <div className="relative rounded-2xl overflow-hidden px-10 py-10 min-h-[200px] flex flex-col justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #134e4a 100%)' }}>

                {/* Glow layers */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                    background: `
                        radial-gradient(ellipse 60% 80% at 85% 20%, rgba(94,234,212,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 40% 50% at 10% 90%, rgba(45,212,191,0.12) 0%, transparent 60%)`
                    }} />

                {/* Decorative rings */}
                <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full pointer-events-none"
                    style={{ border: '40px solid rgba(255,255,255,0.04)' }} />
                <div className="absolute -bottom-16 right-16 w-40 h-40 rounded-full pointer-events-none"
                    style={{ border: '30px solid rgba(45,212,191,0.08)' }} />

                {/* Live badge */}
                <div className="flex items-center gap-2 w-fit mb-4 px-3 py-1 rounded-full backdrop-blur-md"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.2)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#5eead4', boxShadow: '0 0 8px #5eead4aa' }} />
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Dashboard
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold leading-tight mb-2 text-white"
                    style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.5px' }}>
                    Welcome to{' '}
                    <span style={{ color: '#d5f429' }}>Packing Section</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {getGreeting()}, &nbsp;📦&nbsp; Here's your overview for today.
                </p>
            </div>

            {/* 2. HIGHLIGHTED STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat Card 1 - Packed Yesterday */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-teal-50 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d9488] dark:bg-teal-600"></div>
                    <div className="w-16 h-16 bg-[#0f766e]/10 dark:bg-teal-600/10 rounded-2xl flex items-center justify-center text-[#0f766e] dark:text-teal-500 group-hover:scale-110 transition-transform duration-300">
                        <Package size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Packed Yesterday</p>
                        <p className="text-4xl font-black text-[#0f766e] dark:text-teal-400">
                            {isLoading ? '...' : packedYesterday} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 2 - Pending Dispatch */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-teal-50 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#14b8a6] dark:bg-teal-500"></div>
                    <div className="w-16 h-16 bg-[#14b8a6]/10 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center text-[#14b8a6] dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                        <Truck size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Pending Dispatch</p>
                        <p className="text-4xl font-black text-[#14b8a6] dark:text-teal-400">
                            {isLoading ? '...' : pendingDispatch} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">Orders</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 3 - Material Alerts */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-teal-50 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 dark:bg-red-600"></div>
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform duration-300">
                        <Layers size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Material Alerts</p>
                        <p className="text-4xl font-black text-red-600 dark:text-red-500">
                            {isLoading ? '...' : lowStockMaterials} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">Items Low</span>
                        </p>
                    </div>
                </div>

            </div>

            {/* 3. HIGHLIGHTED CHARTS & ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: Charts --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Chart 1: Packing Output Trend */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-teal-50 dark:border-zinc-800 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <Box className="text-[#0d9488] dark:text-teal-500" size={26}/> Packing Output Trend
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Daily packages produced comparison</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                {/* Month Picker */}
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-[#f0fdfb] dark:bg-zinc-800 border border-teal-100 dark:border-zinc-700 rounded-xl text-sm font-bold text-teal-900 dark:text-teal-100 outline-none focus:ring-2 focus:ring-[#0d9488] cursor-pointer"
                                    />
                                </div>
                                {/* Product Type Filter */}
                                <div className="relative">
                                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={selectedProductType} 
                                        onChange={(e) => setSelectedProductType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-[#f0fdfb] dark:bg-zinc-800 border border-teal-100 dark:border-zinc-700 rounded-xl text-sm font-bold text-teal-900 dark:text-teal-100 outline-none focus:ring-2 focus:ring-[#0d9488] cursor-pointer"
                                    >
                                        <option value="All">All Products</option>
                                        <option value="Pouches">Pouches Only</option>
                                        <option value="Boxes">Boxes Only</option>
                                        <option value="Bulk">Bulk Packs</option>
                                    </select>
                                </div>
                                <div className="bg-teal-50 dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 px-4 py-2 rounded-xl text-xs font-bold border border-teal-100 dark:border-teal-800/50 whitespace-nowrap">
                                    {getChartDateLabel()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="h-[320px] w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={packingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={15}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `Date: ${selectedMonth}-${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        {(selectedProductType === 'All' || selectedProductType === 'Pouches') && (
                                            <Bar dataKey="Pouches" name="Pouches Packed" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                                        )}
                                        {(selectedProductType === 'All' || selectedProductType === 'Boxes') && (
                                            <Bar dataKey="Boxes" name="Boxes Packed" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Dispatch Trends */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-teal-50 dark:border-zinc-800 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <Truck className="text-[#0d9488] dark:text-teal-500" size={26}/> Dispatch Volume
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Total dispatched tea in KG trend</p>
                            </div>
                            <div className="bg-teal-50 dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 px-4 py-1.5 rounded-full text-xs font-bold border border-teal-100 dark:border-teal-800/50">
                                Last 6 Months
                            </div>
                        </div>

                        <div className="h-[280px] w-full">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dispatchChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDispatch" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}kg`} />
                                        <Tooltip 
                                            formatter={(value) => [`${value} kg`, 'Dispatched']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                        />
                                        <Area type="monotone" dataKey="DispatchedKG" stroke="#0f766e" strokeWidth={4} fillOpacity={1} fill="url(#colorDispatch)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Right Column: System Alerts --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg border border-teal-50 dark:border-zinc-800 h-full transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-zinc-800 pb-5">
                            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-[#0d9488] dark:text-teal-400 rounded-xl">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Packing & Inventory notifications</p>
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
                                        'bg-teal-50/80 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-400'
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
                             <div className="mt-8 bg-[#f0fdfb] dark:bg-zinc-800/50 p-4 rounded-2xl flex gap-3 items-start border border-teal-100 dark:border-zinc-700">
                                 <Info size={18} className="text-teal-600 dark:text-teal-500 shrink-0 mt-0.5"/>
                                 <p className="text-xs text-teal-800 dark:text-teal-400 font-medium leading-relaxed">
                                     Alerts are automatically generated based on the inventory levels and dispatch queues.
                                 </p>
                             </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}