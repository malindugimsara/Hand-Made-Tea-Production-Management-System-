import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ReferenceLine } from 'recharts';
import { Bell, AlertTriangle, TrendingDown, TrendingUp, Zap, CheckCircle, Info, Leaf, Package, DollarSign, Filter, Calendar, ChevronDown } from 'lucide-react';
import api from '../../api/axiosConfig';

// -------------------------------------------------------------
// 1. EXTRACTED UI COMPONENTS (Prevents unnecessary re-renders)
// -------------------------------------------------------------
const FilterHeaderUI = React.memo(({ title, subtitle, selectedMonth, setSelectedMonth, selectedTeaType, setSelectedTeaType, dateLabel }) => (
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
            {/* Month Picker */}
            <div className="relative group w-full sm:w-auto">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#8CC63F] cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
                />
            </div>
            {/* Tea Type Filter */}
            <div className="relative group w-full sm:w-auto">
                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select 
                    value={selectedTeaType} 
                    onChange={(e) => setSelectedTeaType(e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#8CC63F] cursor-pointer appearance-none transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
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
                {dateLabel}
            </div>
        </div>
    </div>
));

// -------------------------------------------------------------
// 2. HELPER FUNCTIONS
// -------------------------------------------------------------
const groupDataByDate = (dataArray) => {
    return dataArray.reduce((acc, item) => {
        if (!item.date) return acc;
        const dateKey = item.date.substring(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {});
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

// -------------------------------------------------------------
// 3. MAIN COMPONENT
// -------------------------------------------------------------
export default function Home() {
    const navigate = useNavigate();
    const todayDateObj = new Date();

    // Raw Data States
    const [rawGlData, setRawGlData] = useState([]);
    const [rawProdData, setRawProdData] = useState([]);
    const [rawLabourData, setRawLabourData] = useState([]);
    const [rawSalesData, setRawSalesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter States
    const [selectedTeaType, setSelectedTeaType] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        return `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}`;
    });

    // -------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------
    useEffect(() => {
        const fetchDashboardStats = async () => {
            setIsLoading(true);
            try {
                const last6MonthsInfo = [...Array(6)].map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return {
                        monthStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                        name: d.toLocaleString('default', { month: 'short' })
                    };
                });

                const salesPromises = last6MonthsInfo.map(async (info) => {
                    try {
                        const response = await api.get(`/api/selling-details?month=${info.monthStr}`);
                        const records = Array.isArray(response.data) ? response.data : (response.data?.records || []);
                        return { records, ...info };
                    } catch (err) {
                        return { records: [], ...info };
                    }
                });

                const [glRes, prodRes, labRes, ...salesResults] = await Promise.all([
                    api.get('/api/green-leaf').catch(() => ({ data: [] })),
                    api.get('/api/production').catch(() => ({ data: [] })),
                    api.get('/api/labour').catch(() => ({ data: [] })), 
                    ...salesPromises 
                ]);

                setRawGlData(Array.isArray(glRes.data) ? glRes.data : []);
                setRawProdData(Array.isArray(prodRes.data) ? prodRes.data : []);
                setRawLabourData(Array.isArray(labRes.data) ? labRes.data : []);
                setRawSalesData(salesResults);

            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    // -------------------------------------------------------------
    // MEMOIZED DERIVED DATA (Calculated efficiently without re-renders)
    // -------------------------------------------------------------

    // 1. Yesterday's Stats
    const { glYesterday, mtYesterday } = useMemo(() => {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        const glSum = rawGlData.filter(i => i.date?.startsWith(yesterdayStr)).reduce((sum, item) => sum + (Number(item.selectedWeight) || 0), 0);
        const mtSum = rawProdData.filter(i => i.date?.startsWith(yesterdayStr)).reduce((sum, item) => sum + (Number(item.madeTeaWeight) || 0), 0);
        
        return { glYesterday: glSum, mtYesterday: mtSum };
    }, [rawGlData, rawProdData]);

    // 2. Sales Last Month & Sales Chart Data
    const { salesLastMonth, salesChartData } = useMemo(() => {
        if (!rawSalesData || rawSalesData.length === 0) return { salesLastMonth: 0, salesChartData: [] };
        
        // Last month sales (index 1 is previous month)
        const lastMonthData = rawSalesData[1]; 
        let sLastMonth = 0;
        if (lastMonthData?.records?.length > 0) {
            const rate = lastMonthData.records[0]?.exchangeRate || 300;
            const usd = lastMonthData.records.reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
            sLastMonth = usd * rate;
        }

        // Chart Data
        const sChartData = rawSalesData.map(saleMonth => {
            const rate = saleMonth.records?.[0]?.exchangeRate || 300;
            const usd = (saleMonth.records || []).reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
            return { name: saleMonth.name, Revenue: (usd * rate) };
        }).reverse();

        return { salesLastMonth: sLastMonth, salesChartData: sChartData };
    }, [rawSalesData]);

    // 3. Production Chart & Averages (HEAVY LIFTING OPTIMIZED)
    const { prodChartData, prevMonthMtAvg, prevMonthGlAvg, prevMonthYieldAvg } = useMemo(() => {
        if (!rawGlData.length && !rawProdData.length) {
            return { prodChartData: [], prevMonthMtAvg: 0, prevMonthGlAvg: 0, prevMonthYieldAvg: 0 };
        }

        // Pre-group data by date for O(1) lookups
        const groupedProd = groupDataByDate(rawProdData);
        const groupedGl = groupDataByDate(rawGlData);

        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const isCurrentMonth = todayDateObj.getFullYear() === year && (todayDateObj.getMonth() + 1) === month;
        const maxDay = isCurrentMonth ? todayDateObj.getDate() : new Date(year, month, 0).getDate();

        // Current Month Calculation
        const pChartData = Array.from({ length: maxDay }, (_, i) => {
            const dayStr = String(i + 1).padStart(2, '0');
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

            const prodsForDay = groupedProd[dateStr] || [];
            const glsForDay = groupedGl[dateStr] || [];

            let dayGlSum = 0;
            let dayMtSum = 0;

            prodsForDay.forEach((prod, index) => {
                if (selectedTeaType === 'All' || prod.teaType === selectedTeaType) {
                    dayMtSum += (Number(prod.madeTeaWeight) || 0);
                    if (glsForDay[index]) dayGlSum += (Number(glsForDay[index].selectedWeight) || 0);
                }
            });

            if (selectedTeaType === 'All' && glsForDay.length > prodsForDay.length) {
                for(let j = prodsForDay.length; j < glsForDay.length; j++) {
                    dayGlSum += (Number(glsForDay[j].selectedWeight) || 0);
                }
            }

            return {
                name: dayStr,
                fullDate: dateStr,
                GreenLeaf: parseFloat(dayGlSum.toFixed(2)),
                MadeTea: parseFloat(dayMtSum.toFixed(2)),
                YieldPercentage: dayGlSum > 0 ? parseFloat(((dayMtSum / dayGlSum) * 100).toFixed(2)) : 0
            };
        });

        // Previous Month Calculation
        let prevMonth = month === 1 ? 12 : month - 1;
        let prevYear = month === 1 ? year - 1 : year;
        const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        let pmTotalMt = 0, pmTotalGl = 0, pmActiveDays = 0, prevYields = [];

        Object.keys(groupedProd).forEach(dateStr => {
            if (dateStr.startsWith(prevMonthStr)) {
                const prods = groupedProd[dateStr] || [];
                const gls = groupedGl[dateStr] || [];

                let dMt = 0, dGl = 0;
                prods.forEach((prod, i) => {
                    if (selectedTeaType === 'All' || prod.teaType === selectedTeaType) {
                        dMt += (Number(prod.madeTeaWeight) || 0);
                        if(gls[i]) dGl += (Number(gls[i].selectedWeight) || 0);
                    }
                });

                if (selectedTeaType === 'All' && gls.length > prods.length) {
                    for(let i=prods.length; i<gls.length; i++) dGl += (Number(gls[i].selectedWeight) || 0);
                }

                if (dMt > 0 || dGl > 0) {
                    pmTotalMt += dMt;
                    pmTotalGl += dGl;
                    pmActiveDays += 1;
                    if(dGl > 0) prevYields.push((dMt / dGl) * 100);
                }
            }
        });

        return {
            prodChartData: pChartData,
            prevMonthMtAvg: pmActiveDays > 0 ? (pmTotalMt / pmActiveDays) : 0,
            prevMonthGlAvg: pmActiveDays > 0 ? (pmTotalGl / pmActiveDays) : 0,
            prevMonthYieldAvg: prevYields.length > 0 ? (prevYields.reduce((a,b)=>a+b,0) / prevYields.length) : 0
        };
    }, [rawGlData, rawProdData, selectedMonth, selectedTeaType]);

    // 4. Alerts 
    const alerts = useMemo(() => {
        if (!rawGlData.length && !rawLabourData.length) return [];
        const newAlerts = [];
        
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        const hasLabourYesterday = rawLabourData.some(l => l.date?.startsWith(yesterdayStr));
        if (!hasLabourYesterday) {
            newAlerts.push({
                id: 1, type: 'warning', icon: <AlertTriangle size={20}/>,
                title: 'Missing Record', message: "No Labour records found for yesterday. Please update the daily log."
            });
        }

        const last7DaysStr = [...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        const weekGLSum = rawGlData.filter(g => last7DaysStr.includes(g.date?.substring(0,10))).reduce((s, g) => s + (Number(g.selectedWeight)||0), 0);
        const weekMTSum = rawProdData.filter(p => last7DaysStr.includes(p.date?.substring(0,10))).reduce((s, p) => s + (Number(p.madeTeaWeight)||0), 0);
        
        if (weekGLSum > 0 && (weekMTSum / weekGLSum) < 0.15) {
            newAlerts.push({
                id: 2, type: 'danger', icon: <TrendingDown size={20}/>,
                title: 'Low Yield Alert', message: `Made Tea percentage is unusually low (${((weekMTSum/weekGLSum)*100).toFixed(1)}%) over the last 7 days.`
            });
        }

        const unitsPerDay = last7DaysStr.map(date => {
            return rawProdData.filter(p => p.date?.startsWith(date)).reduce((sum, p) => {
                return sum + (p.dryerDetails?.units || ((Number(p.dryerDetails?.meterEnd)||0) - (Number(p.dryerDetails?.meterStart)||0)));
            }, 0);
        });
        const avgUnits = (unitsPerDay.reduce((a,b)=>a+b,0) / 7) || 0;
        const yesterdayUnits = unitsPerDay[1]; 
        
        if (yesterdayUnits > 0 && avgUnits > 0 && yesterdayUnits > (avgUnits * 1.4)) {
            newAlerts.push({
                id: 3, type: 'electric', icon: <Zap size={20}/>,
                title: 'High Power Usage', message: `Electricity usage yesterday (${yesterdayUnits} pts) was significantly higher than the average (${avgUnits.toFixed(0)} pts).`
            });
        }

        if (newAlerts.length === 0) {
            newAlerts.push({
                id: 4, type: 'success', icon: <CheckCircle size={20}/>,
                title: 'All Systems Normal', message: "Production yields and records are up to date."
            });
        }

        return newAlerts;
    }, [rawGlData, rawProdData, rawLabourData]);

    const chartDateLabel = useMemo(() => {
        if (!selectedMonth) return "";
        const [yearStr, monthStr] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const isCurrentMonth = todayDateObj.getFullYear() === parseInt(yearStr, 10) && (todayDateObj.getMonth() + 1) === parseInt(monthStr, 10);
        const maxDay = isCurrentMonth ? todayDateObj.getDate() : new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
        return `1st - ${maxDay} ${dateObj.toLocaleString('default', { month: 'short' })}`;
    }, [selectedMonth]);


    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[1500px] mx-auto h-full flex flex-col space-y-6 md:space-y-8 bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
    {/* 1. HERO WELCOME BANNER */}
    <div className="flex flex-col gap-5 md:gap-6">
        <div className="relative rounded-2xl overflow-hidden px-5 sm:px-8 md:px-10 py-8 md:py-10 min-h-[160px] md:min-h-[200px] flex flex-col justify-center bg-gradient-to-br from-[#2e6c4c] via-[#205236] to-[#164816]">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_80%_at_85%_20%,rgba(180,210,120,0.13)_0%,transparent_70%),radial-gradient(ellipse_40%_50%_at_10%_90%,rgba(90,160,80,0.10)_0%,transparent_60%)]" />
            <div className="absolute -top-8 -right-8 w-40 h-40 md:w-56 md:h-56 rounded-full pointer-events-none border-[30px] md:border-[40px] border-white/5" />
            <div className="absolute -bottom-16 right-8 md:right-16 w-32 h-32 md:w-40 md:h-40 rounded-full pointer-events-none border-[20px] md:border-[30px] border-[#a3d977]/5" />
            
            <div className="flex items-center gap-2 w-fit mb-4 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-[#a3d977] shadow-[0_0_6px_#a3d977aa]" />
                <span className="text-[10px] md:text-xs font-medium tracking-widest uppercase text-white/70">Dashboard</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2 text-white font-serif tracking-tight">
                Welcome to <span className="text-[#c8e88a]">HandMade Tea </span> 
                <span className="text-lg md:text-xl text-yellow-200/50 tracking-wide font-sans block sm:inline mt-1 sm:mt-0">(HT0049)</span>
            </h1>
            
            <p className="text-sm md:text-base font-normal text-white/65">
                {getGreeting()}, &nbsp;🍃&nbsp; Here's your overview for today.
            </p>
        </div>

        {/* 2. HIGHLIGHTED STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-4 md:gap-5">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#8CC63F] dark:bg-green-500"></div>
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-[#8CC63F]/10 dark:bg-green-500/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#4A9E46] dark:text-green-500">
                    <Leaf className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 truncate">Yesterday's Green Leaf</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1B6A31] dark:text-green-400 truncate">
                        {isLoading ? '...' : glYesterday.toFixed(2)} <span className="text-sm md:text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-4 md:gap-5">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4A9E46] dark:bg-green-600"></div>
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-[#4A9E46]/10 dark:bg-green-600/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500">
                    <Package className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 truncate">Yesterday's Made Tea</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1B6A31] dark:text-green-400 truncate">
                        {isLoading ? '...' : mtYesterday.toFixed(3)} <span className="text-sm md:text-lg text-gray-400 dark:text-gray-500 font-semibold lowercase">kg</span>
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 relative overflow-hidden transition-all duration-300 hover:shadow-md flex items-center gap-4 md:gap-5">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31] dark:bg-green-700"></div>
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-[#1B6A31]/10 dark:bg-green-700/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#1B6A31] dark:text-green-500">
                    <DollarSign className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 truncate">Sales (Last Month)</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1B6A31] dark:text-green-400 truncate flex items-baseline gap-1">
                        <span className="text-sm sm:text-base md:text-xl font-bold text-gray-400 dark:text-gray-500 mb-1">Rs.</span> 
                        {isLoading ? '...' : salesLastMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>
        </div>
    </div>

    {/* 3. HIGHLIGHTED CHARTS & ALERTS SECTION */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* --- Left Column: Charts --- */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
            
            {/* CHART 1: Daily Production Overview */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200 overflow-hidden">
                <FilterHeaderUI 
                    title="Daily Production Overview" subtitle="Daily comparison overview" 
                    selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
                    selectedTeaType={selectedTeaType} setSelectedTeaType={setSelectedTeaType}
                    dateLabel={chartDateLabel}
                />
                <div className="h-[280px] sm:h-[320px] w-full mt-4 -ml-2 sm:ml-0">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                            <BarChart data={prodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{fontSize: 10, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    labelFormatter={(label) => `Date: ${selectedMonth}-${label}`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                    cursor={{fill: 'currentColor', opacity: 0.05}}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                {selectedTeaType === 'All' && <Bar dataKey="GreenLeaf" name="Total Green Leaf (kg)" fill="#8CC63F" radius={[4, 4, 0, 0]} />}
                                <Bar dataKey="MadeTea" name={`Made Tea (${selectedTeaType}) (kg)`} fill="#1B6A31" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 2A: Yield Percentage */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200 overflow-hidden">
                <FilterHeaderUI 
                    title="Yield Percentage Trend" subtitle="Made tea ÷ green leaf · compared to last month" 
                    selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
                    selectedTeaType={selectedTeaType} setSelectedTeaType={setSelectedTeaType}
                    dateLabel={chartDateLabel}
                />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="text-2xl sm:text-3xl font-black text-[#1B6A31] dark:text-green-400">
                            {prodChartData.filter(d=>d.YieldPercentage>0).length > 0
                                ? (prodChartData.filter(d=>d.YieldPercentage>0).reduce((s,d)=>s+d.YieldPercentage,0) / prodChartData.filter(d=>d.YieldPercentage>0).length).toFixed(1)
                                : '—'}%
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Month average</p>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800/30 w-fit">
                        Made Tea ÷ Green Leaf
                    </span>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-5 mb-4 text-[10px] sm:text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/>Yield %</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-red-400 inline-block"/>Prev month avg</span>
                </div>

                <div className="h-[180px] sm:h-[200px] w-full -ml-2 sm:ml-0">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                            <LineChart data={prodChartData} margin={{ top: 24, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5}/>
                                <XAxis dataKey="name" tick={{fontSize:10, fill:'#6b7280'}} axisLine={false} tickLine={false} dy={8}/>
                                <YAxis tick={{fontSize:10, fill:'#6b7280'}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false} domain={['auto','auto']}/>
                                <Tooltip
                                    labelFormatter={l => `Day ${l}`}
                                    formatter={v => [`${v}%`, 'Yield']}
                                    contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)', color:'black' }}
                                />
                                {prevMonthYieldAvg > 0 && (
                                    <ReferenceLine y={prevMonthYieldAvg} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                                        label={{ position:'insideTopLeft', value:`Prev avg ${prevMonthYieldAvg.toFixed(1)}%`, fill:'#ef4444', fontSize:10, fontWeight:'bold' }}/>
                                )}
                                <Line isAnimationActive={false} type="monotone" dataKey="YieldPercentage" name="Yield %" stroke="#3b82f6" strokeWidth={2.5}
                                    dot={{ r:3, strokeWidth:2, fill:'white' }} activeDot={{ r:6, strokeWidth:0 }} connectNulls={false}/>
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 2B: Daily KG Output */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200 overflow-hidden">
                <FilterHeaderUI 
                    title="Daily kg Output" subtitle="Green leaf received vs made tea produced" 
                    selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
                    selectedTeaType={selectedTeaType} setSelectedTeaType={setSelectedTeaType}
                    dateLabel={chartDateLabel}
                />

                <div className="flex flex-wrap gap-3 sm:gap-5 mb-4 text-[10px] sm:text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#7c3aed] inline-block"/>Made Tea</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#8CC63F] inline-block"/>Green Leaf</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-purple-400 inline-block"/>Prev MT avg</span>
                    {selectedTeaType === 'All' && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#8CC63F] inline-block"/>Prev GL avg</span>}
                </div>

                <div className="h-[200px] sm:h-[240px] w-full -ml-2 sm:ml-0">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                            <BarChart data={prodChartData} margin={{ top: 24, right: 10, left: -20, bottom: 0 }} barSize={10}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5}/>
                                <XAxis dataKey="name" tick={{fontSize:10, fill:'#6b7280'}} axisLine={false} tickLine={false} dy={8}/>
                                <YAxis tick={{fontSize:10, fill:'#6b7280'}} tickFormatter={v=>`${v}kg`} axisLine={false} tickLine={false}/>
                                <Tooltip
                                    labelFormatter={l => `Day ${l}`}
                                    formatter={(v,n) => [`${v} kg`, n]}
                                    contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)', color:'black' }}
                                />
                                {prevMonthMtAvg > 0 && (
                                    <ReferenceLine y={prevMonthMtAvg} stroke="#a855f7" strokeDasharray="5 4" strokeWidth={1.5}
                                        label={{ position:'insideTopRight', value:`Avg ${prevMonthMtAvg.toFixed(0)}kg`, fill:'#a855f7', fontSize:9, fontWeight:'bold' }}/>
                                )}
                                {selectedTeaType === 'All' && prevMonthGlAvg > 0 && (
                                    <ReferenceLine y={prevMonthGlAvg} stroke="#8CC63F" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ position:'insideBottomLeft', value:`Avg ${prevMonthGlAvg.toFixed(0)}kg`, fill:'#639922', fontSize:9, fontWeight:'bold' }}/>
                                )}
                                {selectedTeaType === 'All' && (
                                    <Line isAnimationActive={false} type="monotone" dataKey="GreenLeaf" name="Green Leaf (kg)" stroke="#8CC63F" strokeWidth={2}
                                        dot={{ r:2.5, strokeWidth:1.5, fill:'white' }} activeDot={{ r:5 }}/>
                                )}
                                <Bar isAnimationActive={false} dataKey="MadeTea" name={`Made Tea (${selectedTeaType}) (kg)`} fill="#7c3aed" radius={[4,4,0,0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* CHART 3: Sales Revenue */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-all duration-300 text-gray-800 dark:text-gray-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div>
                        <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                            <TrendingUp className="text-[#1B6A31] dark:text-green-500 w-5 sm:w-6 h-5 sm:h-6"/> Sales Revenue
                        </h3>
                        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Estimated LKR Revenue trend</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold border border-blue-100 dark:border-blue-800/50 w-fit">
                        Last 6 Months
                    </div>
                </div>

                <div className="h-[220px] sm:h-[280px] w-full mt-4 -ml-2 sm:ml-0">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                            <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1B6A31" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#1B6A31" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{fontSize: 10, fontWeight: 500, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs ${val/1000}k`} />
                                <Tooltip 
                                    formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'black' }}
                                />
                                <Area isAnimationActive={false} type="monotone" dataKey="Revenue" stroke="#1B6A31" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>

        {/* --- Right Column: System Alerts --- */}
        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-zinc-800 h-full transition-colors duration-300 flex flex-col">
                <div className="flex items-center gap-3 mb-5 sm:mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4 sm:pb-5">
                    <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Bell className="w-5 sm:w-6 h-5 sm:h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">System generated notifications</p>
                    </div>
                </div>

                <div className="space-y-3 sm:space-y-4 flex-1">
                    {isLoading ? (
                        <div className="text-center text-sm text-gray-400 py-10">Checking system status...</div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.id} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex gap-3 sm:gap-4 transition-all hover:-translate-y-0.5 ${
                                alert.type === 'warning' ? 'bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400' :
                                alert.type === 'danger' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400' :
                                alert.type === 'electric' ? 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400' :
                                'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
                            }`}>
                                <div className="mt-0.5 opacity-80 shrink-0">
                                    {alert.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs sm:text-sm mb-1">{alert.title}</h4>
                                    <p className="text-[10px] sm:text-xs opacity-90 leading-relaxed font-medium">{alert.message}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {!isLoading && alerts.length > 0 && (
                     <div className="mt-6 sm:mt-8 bg-gray-50 dark:bg-zinc-800/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex gap-2 sm:gap-3 items-start border border-gray-200 dark:border-zinc-700">
                         <Info className="w-4 sm:w-[18px] h-4 sm:h-[18px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5"/>
                         <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
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