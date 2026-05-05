import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ReferenceLine } from 'recharts';
import { Bell, AlertTriangle, TrendingDown, TrendingUp, BarChart2, Zap, CheckCircle, Info, Leaf, Package, DollarSign, Filter, Calendar, ChevronDown } from 'lucide-react';

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
    
    // Averages for Reference Lines
    const [prevMonthMtAvg, setPrevMonthMtAvg] = useState(0);
    const [prevMonthYieldAvg, setPrevMonthYieldAvg] = useState(0);
    const [prevMonthGlAvg, setPrevMonthGlAvg] = useState(0);

    // Filter States
    const [selectedTeaType, setSelectedTeaType] = useState('All');
    
    // New Month Filter State (Default to Current Month YYYY-MM)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Store raw data to re-calculate chart when filter changes
    const [rawGlData, setRawGlData] = useState([]);
    const [rawProdData, setRawProdData] = useState([]);

    const todayDateObj = new Date();

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
            generateProductionChartData(rawGlData, rawProdData, selectedTeaType, selectedMonth);
        }
    }, [selectedTeaType, selectedMonth, rawGlData, rawProdData]);

    const generateProductionChartData = (glData, prodData, teaTypeFilter, monthFilter) => {
        const [yearStr, monthStr] = monthFilter.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const isCurrentMonth = todayDateObj.getFullYear() === year && (todayDateObj.getMonth() + 1) === month;

        const daysInMonth = new Date(year, month, 0).getDate();
        const maxDay = isCurrentMonth ? todayDateObj.getDate() : daysInMonth;

        const currentMonthDays = [];
        for (let i = 1; i <= maxDay; i++) {
            const dayStr = String(i).padStart(2, '0');
            currentMonthDays.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
        }

        const pChartData = currentMonthDays.map(date => {
            const glSum = glData
                .filter(g => g.date && g.date.startsWith(date))
                .reduce((sum, g) => sum + (Number(g.selectedWeight) || 0), 0);

            const filteredProd = prodData.filter(p => {
                const dateMatch = p.date && p.date.startsWith(date);
                const typeMatch = teaTypeFilter === 'All' || p.teaType === teaTypeFilter;
                return dateMatch && typeMatch;
            });

            const mtSum = filteredProd.reduce((sum, p) => sum + (Number(p.madeTeaWeight) || 0), 0);
            const yieldPercentage = glSum > 0 ? (mtSum / glSum) * 100 : 0;

            return {
                name: date.slice(8, 10),
                fullDate: date,
                GreenLeaf: glSum,
                MadeTea: mtSum,
                YieldPercentage: parseFloat(yieldPercentage.toFixed(2))
            };
        });

        setProdChartData(pChartData);

        // --- Previous Month Setup ---
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }
        const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        // --- 1. Made Tea Average (active days only) ---
        const prevMonthProd = prodData.filter(p => {
            const dateMatch = p.date && p.date.startsWith(prevMonthStr);
            const typeMatch = teaTypeFilter === 'All' || p.teaType === teaTypeFilter;
            return dateMatch && typeMatch;
        });

        const prevMonthTotalMt = prevMonthProd
            .reduce((sum, p) => sum + (Number(p.madeTeaWeight) || 0), 0);

        const prevMonthActiveMtDays = new Set(
            prevMonthProd
                .filter(p => (Number(p.madeTeaWeight) || 0) > 0)
                .map(p => p.date?.substring(0, 10))
        ).size;

        setPrevMonthMtAvg(prevMonthActiveMtDays > 0 ? (prevMonthTotalMt / prevMonthActiveMtDays) : 0);

        // --- 2. Green Leaf Average (active days only) ---
        let calculatedGlAvg = 0;
        if (teaTypeFilter === 'All') {
            const prevGlRecords = glData.filter(g => g.date && g.date.startsWith(prevMonthStr));
            const prevMonthTotalGl = prevGlRecords
                .reduce((sum, g) => sum + (Number(g.selectedWeight) || 0), 0);

            const prevMonthActiveGlDays = new Set(
                prevGlRecords
                    .filter(g => (Number(g.selectedWeight) || 0) > 0)
                    .map(g => g.date?.substring(0, 10))
            ).size;

            calculatedGlAvg = prevMonthActiveGlDays > 0 ? (prevMonthTotalGl / prevMonthActiveGlDays) : 0;
        }
        setPrevMonthGlAvg(calculatedGlAvg);

        // --- 3. Yield Percentage Average (active days only, per-day yield then averaged) ---
        const prevGlByDay = {};
        glData
            .filter(g => g.date && g.date.startsWith(prevMonthStr) && (Number(g.selectedWeight) || 0) > 0)
            .forEach(g => {
                const day = g.date.substring(0, 10);
                prevGlByDay[day] = (prevGlByDay[day] || 0) + (Number(g.selectedWeight) || 0);
            });

        const prevMtByDay = {};
        prevMonthProd
            .filter(p => (Number(p.madeTeaWeight) || 0) > 0)
            .forEach(p => {
                const day = p.date?.substring(0, 10);
                if (day) prevMtByDay[day] = (prevMtByDay[day] || 0) + (Number(p.madeTeaWeight) || 0);
            });

        const prevDailyYields = Object.keys(prevMtByDay)
            .filter(day => prevGlByDay[day] > 0)
            .map(day => (prevMtByDay[day] / prevGlByDay[day]) * 100);

        const calculatedYieldAvg = prevDailyYields.length > 0
            ? prevDailyYields.reduce((a, b) => a + b, 0) / prevDailyYields.length
            : 0;

        setPrevMonthYieldAvg(calculatedYieldAvg);
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

            const currentMonthStr = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}`;
            generateProductionChartData(glData, prodData, 'All', currentMonthStr);

            const sChartData = salesResults.map(saleMonth => {
                const rate = saleMonth.exchangeRate || 300;
                const usd = (saleMonth.records || []).reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
                return {
                    name: saleMonth.name,
                    Revenue: (usd * rate)
                };
            }).reverse();
            setSalesChartData(sChartData);

            // SMART ALERTS GENERATION
            const newAlerts = [];

            const hasLabourYesterday = labourData.some(l => l.date && l.date.startsWith(yesterdayStr));
            if (!hasLabourYesterday) {
                newAlerts.push({
                    id: 1, type: 'warning', icon: <AlertTriangle size={20}/>,
                    title: 'Missing Record',
                    message: "No Labour records found for yesterday. Please update the daily log."
                });
            }

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
            const yesterdayUnits = unitsPerDay[1]; 
            
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

    const getChartDateLabel = () => {
        if (!selectedMonth) return "";
        const [yearStr, monthStr] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const monthNameShort = dateObj.toLocaleString('default', { month: 'short' });
        
        const isCurrentMonth = todayDateObj.getFullYear() === parseInt(yearStr, 10) && (todayDateObj.getMonth() + 1) === parseInt(monthStr, 10);
        const maxDay = isCurrentMonth ? todayDateObj.getDate() : new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        
        return `1st - ${maxDay} ${monthNameShort}`;
    };

    // Shared Header UI for the Charts
    const FilterHeaderUI = ({ title, subtitle }) => (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
            <div>
                <h3 className="text-2xl font-extrabold flex items-center gap-3 text-gray-900 dark:text-white">
                    <div className="flex gap-1 items-end h-6">
                        <div className="w-1.5 h-3 bg-[#a3d977] rounded-sm"></div>
                        <div className="w-1.5 h-5 bg-[#8CC63F] rounded-sm"></div>
                        <div className="w-1.5 h-4 bg-[#1B6A31] rounded-sm"></div>
                    </div>
                    {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium ml-10">{subtitle}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Month Picker UI styling */}
                <div className="relative group w-full sm:w-auto">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
                    />
                </div>
                {/* Tea Type Filter */}
                <div className="relative group w-full sm:w-auto">
                    <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <select 
                        value={selectedTeaType} 
                        onChange={(e) => setSelectedTeaType(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent cursor-pointer appearance-none transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
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
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <ChevronDown size={16} />
                    </div>
                </div>
                {/* Date Badge */}
                <div className="bg-[#eef8f2] dark:bg-green-900/30 text-[#1B6A31] dark:text-green-400 px-5 py-2.5 rounded-full text-sm font-extrabold whitespace-nowrap shadow-sm border border-[#eef8f2] dark:border-green-800/30">
                    {getChartDateLabel()}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-8 bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* 1. HERO WELCOME BANNER */}
            <div className="relative rounded-2xl overflow-hidden px-10 py-10 min-h-[200px] flex flex-col justify-center bg-gradient-to-br from-[#2e6c4c] via-[#205236] to-[#164816]">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_80%_at_85%_20%,rgba(180,210,120,0.13)_0%,transparent_70%),radial-gradient(ellipse_40%_50%_at_10%_90%,rgba(90,160,80,0.10)_0%,transparent_60%)]" />
                <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full pointer-events-none border-[40px] border-white/5" />
                <div className="absolute -bottom-16 right-16 w-40 h-40 rounded-full pointer-events-none border-[30px] border-[#a3d977]/5" />
                <div className="flex items-center gap-2 w-fit mb-4 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                    <span className="w-2 h-2 rounded-full bg-[#a3d977] shadow-[0_0_6px_#a3d977aa]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-white/70">
                        Dashboard
                    </span>
                </div>
                <h1 className="text-4xl font-bold leading-tight mb-2 text-white font-serif tracking-tight">
                    Welcome to{' '}
                    <span className="text-[#c8e88a]">HandMade Tea </span> 
                    <span className="text-xl text-yellow-200/50 tracking-wide font-sans">(HT0049)</span>
                </h1>
                <p className="text-base font-normal text-white/65">
                    {getGreeting()}, &nbsp;🍃&nbsp; Here's your overview for today.
                </p>
            </div>

            {/* 2. HIGHLIGHTED STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#8CC63F] dark:bg-green-500"></div>
                    <div className="w-16 h-16 bg-[#8CC63F]/10 dark:bg-green-500/10 rounded-2xl flex items-center justify-center text-[#4A9E46] dark:text-green-500">
                        <Leaf size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Yesterday's Green Leaf</p>
                        <p className="text-4xl font-black text-[#1B6A31] dark:text-green-400">
                            {isLoading ? '...' : glYesterday.toFixed(2)} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4A9E46] dark:bg-green-600"></div>
                    <div className="w-16 h-16 bg-[#4A9E46]/10 dark:bg-green-600/10 rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500">
                        <Package size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Yesterday's Made Tea</p>
                        <p className="text-4xl font-black text-[#1B6A31] dark:text-green-400">
                            {isLoading ? '...' : mtYesterday.toFixed(3)} <span className="text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-5">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31] dark:bg-green-700"></div>
                    <div className="w-16 h-16 bg-[#1B6A31]/10 dark:bg-green-700/10 rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500">
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
                    
                    {/* ORIGINAL CHART 1: Daily Production Overview (Bar Chart) */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200">
                        <FilterHeaderUI title="Daily Production Overview" subtitle="Daily comparison overview" />
                        <div className="h-[320px] w-full mt-4">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={prodChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }} barSize={12}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            labelFormatter={(label) => `Date: ${selectedMonth}-${label}`}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                            cursor={{fill: 'currentColor', opacity: 0.05}}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        {selectedTeaType === 'All' && (
                                            <Bar dataKey="GreenLeaf" name="Total Green Leaf (kg)" fill="#8CC63F" radius={[4, 4, 0, 0]} />
                                        )}
                                        <Bar dataKey="MadeTea" name={`Made Tea (${selectedTeaType}) (kg)`} fill="#1B6A31" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* NEW CHART 2: Percentage & KG Line Chart (Dual Axes) */}
                    {/* CHART 2A: Yield Percentage */}
<div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200">
    <FilterHeaderUI title="Yield Percentage Trend" subtitle="Made tea ÷ green leaf · compared to last month" />
    
    {/* Quick stat + badge */}
    <div className="flex items-center justify-between mb-4">
        <div>
            <p className="text-3xl font-black text-[#1B6A31] dark:text-green-400">
                {/* // Replace this block: */}
                {prodChartData.filter(d=>d.YieldPercentage>0).length > 0
                    ? (prodChartData.filter(d=>d.YieldPercentage>0).reduce((s,d)=>s+d.YieldPercentage,0) / prodChartData.filter(d=>d.YieldPercentage>0).length).toFixed(1)
                    : '—'}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Month average</p>
        </div>
        <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/30">
            Made Tea ÷ Green Leaf
        </span>
    </div>

    {/* Legend */}
    <div className="flex gap-5 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/>&nbsp;Yield %</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-red-400 inline-block"/>&nbsp;Prev month avg</span>
    </div>

    <div className="h-[200px] w-full">
        {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prodChartData} margin={{ top: 24, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5}/>
                    <XAxis dataKey="name" tick={{fontSize:11, fill:'#6b7280'}} axisLine={false} tickLine={false} dy={8}/>
                    <YAxis tick={{fontSize:11, fill:'#6b7280'}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                    <Tooltip
                        labelFormatter={l => `Day ${l}`}
                        formatter={v => [`${v}%`, 'Yield']}
                        contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)', color:'black' }}
                    />
                    {prevMonthYieldAvg > 0 && (
                        <ReferenceLine y={prevMonthYieldAvg} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                            label={{ position:'insideTopLeft', value:`Prev avg ${prevMonthYieldAvg.toFixed(1)}%`, fill:'#ef4444', fontSize:10, fontWeight:'bold' }}/>
                    )}
                    <Line type="monotone" dataKey="YieldPercentage" name="Yield %" stroke="#3b82f6" strokeWidth={2.5}
                        dot={{ r:3, strokeWidth:2, fill:'white' }} activeDot={{ r:6, strokeWidth:0 }} connectNulls={false}/>
                </LineChart>
            </ResponsiveContainer>
        )}
    </div>
</div>

{/* CHART 2B: Daily KG Output */}
<div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200">
    <FilterHeaderUI title="Daily kg Output" subtitle="Green leaf received vs made tea produced" />

    {/* Legend */}
    <div className="flex flex-wrap gap-5 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#7c3aed] inline-block"/>Made Tea (kg)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#8CC63F] inline-block"/>Green Leaf (kg)</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-purple-400 inline-block"/>Prev MT avg</span>
        {selectedTeaType === 'All' && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#8CC63F] inline-block"/>Prev GL avg</span>}
    </div>

    <div className="h-[240px] w-full">
        {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodChartData} margin={{ top: 24, right: 16, left: -20, bottom: 0 }} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5}/>
                    <XAxis dataKey="name" tick={{fontSize:11, fill:'#6b7280'}} axisLine={false} tickLine={false} dy={8}/>
                    <YAxis tick={{fontSize:11, fill:'#6b7280'}} tickFormatter={v=>`${v}kg`} axisLine={false} tickLine={false}/>
                    <Tooltip
                        labelFormatter={l => `Day ${l}`}
                        formatter={(v,n) => [`${v} kg`, n]}
                        contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)', color:'black' }}
                    />
                    {prevMonthMtAvg > 0 && (
                        <ReferenceLine y={prevMonthMtAvg} stroke="#a855f7" strokeDasharray="5 4" strokeWidth={1.5}
                            label={{ position:'insideTopRight', value:`Prev MT avg ${prevMonthMtAvg.toFixed(0)}kg`, fill:'#a855f7', fontSize:10, fontWeight:'bold' }}/>
                    )}
                    {selectedTeaType === 'All' && prevMonthGlAvg > 0 && (
                        <ReferenceLine y={prevMonthGlAvg} stroke="#8CC63F" strokeDasharray="4 3" strokeWidth={1.5}
                            label={{ position:'insideBottomLeft', value:`Prev GL avg ${prevMonthGlAvg.toFixed(0)}kg`, fill:'#639922', fontSize:10, fontWeight:'bold' }}/>
                    )}
                    {selectedTeaType === 'All' && (
                        <Line type="monotone" dataKey="GreenLeaf" name="Green Leaf (kg)" stroke="#8CC63F" strokeWidth={2}
                            dot={{ r:2.5, strokeWidth:1.5, fill:'white' }} activeDot={{ r:5 }}/>
                    )}
                    <Bar dataKey="MadeTea" name={`Made Tea (${selectedTeaType}) (kg)`} fill="#7c3aed" radius={[4,4,0,0]}/>
                </BarChart>
            </ResponsiveContainer>
        )}
    </div>
</div>

                    {/* ORIGINAL CHART 3: Sales Revenue */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold flex items-center gap-2">
                                    <TrendingUp className="text-[#1B6A31] dark:text-green-500" size={26}/> Sales Revenue
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Estimated LKR Revenue trend</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800/50">
                                Last 6 Months
                            </div>
                        </div>

                        <div className="h-[280px] w-full mt-4">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1B6A31" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#1B6A31" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} />
                                        <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{fontSize: 12, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs ${val/1000}k`} />
                                        <Tooltip 
                                            formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
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
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 h-full transition-colors duration-300">
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