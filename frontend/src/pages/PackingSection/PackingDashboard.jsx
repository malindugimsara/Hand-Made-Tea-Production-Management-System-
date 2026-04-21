import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Bell, AlertTriangle, Package, Truck, Layers, BarChart2, CheckCircle, Info, Box } from 'lucide-react';

export default function PackingDashboard() {
    // Basic Stats States
    const [packedYesterday, setPackedYesterday] = useState(0);
    const [pendingDispatch, setPendingDispatch] = useState(0);
    const [lowStockMaterials, setLowStockMaterials] = useState(0);
    
    // Charts & Alerts States
    const [packingChartData, setPackingChartData] = useState([]);
    const [dispatchChartData, setDispatchChartData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

                // 2. Mock Bar Chart Data (Last 7 Days Packing Output)
                const mockPackingData = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return {
                        name: d.getDate().toString().padStart(2, '0'),
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
    }, []);

    const currentMonthName = todayDateObj.toLocaleString('default', { month: 'long' });

    return (
        <div className="p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-8 bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER (Blue/Indigo theme for packing distinction) */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-2xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 dark:opacity-5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative">
                    <p className="text-sm font-medium text-blue-100 mb-2">{today}</p>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                        {getGreeting()}, Admin! 📦
                    </h2>
                    <p className="text-blue-100 text-base md:text-lg opacity-90 max-w-2xl leading-relaxed">
                        Here is the latest overview of the packing operations and dispatch metrics.
                    </p>
                </div>
            </div>

            {/* 2. HIGHLIGHTED STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat Card 1 - Packed Yesterday */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 dark:bg-blue-600"></div>
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                        <Package size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Packed Yesterday</p>
                        <p className="text-4xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : packedYesterday} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 2 - Pending Dispatch */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 dark:bg-indigo-500"></div>
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                        <Truck size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Pending Dispatch</p>
                        <p className="text-4xl font-black text-gray-800 dark:text-gray-100">
                            {isLoading ? '...' : pendingDispatch} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">Orders</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 3 - Material Alerts */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group flex items-center gap-5">
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
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <Box className="text-blue-500 dark:text-blue-500" size={26}/> Packing Output Trend
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Daily packages produced (Last 7 Days)</p>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800/50">
                                {currentMonthName} Overview
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
                                            labelFormatter={(label) => `${currentMonthName} ${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="Pouches" name="Pouches Packed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Boxes" name="Boxes Packed" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Dispatch Trends */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 transform hover:-translate-y-1 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <Truck className="text-indigo-500 dark:text-indigo-400" size={26}/> Dispatch Volume
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Total dispatched tea in KG (Last 6 Months)</p>
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
                                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}kg`} />
                                        <Tooltip 
                                            formatter={(value) => [`${value} kg`, 'Dispatched']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                        />
                                        <Area type="monotone" dataKey="DispatchedKG" stroke="#6366F1" strokeWidth={4} fillOpacity={1} fill="url(#colorDispatch)" />
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
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
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