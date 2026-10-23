import React, { useState, useMemo, useRef } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList 
} from 'recharts';
import { Calendar, Filter, TrendingUp, RefreshCw, Activity, FileDown, LineChart } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

const ROUTE_LIST = [
    { id: "C1", label: "C1", fullName: "MATHTHAKA" },
    { id: "C2", label: "C2", fullName: "WALALLAWITA" },
    { id: "C3", label: "C3", fullName: "PELAWATHTHA" },
    { id: "C4", label: "C4", fullName: "POLGAMPALA" },
    { id: "C5", label: "C5", fullName: "MANAMPITA" },
    { id: "C7", label: "C7", fullName: "GANEGODA" },
    { id: "C8", label: "C8", fullName: "THUNDOLA" },
    { id: "FA", label: "FA", fullName: "FACTORY" },
    { id: "E", label: "E", fullName: "ESTATE" }
];


// 💡 1. එක් එක් Route එක සඳහා වෙනස් වර්ණ (Dynamic Colors)
const ROUTE_COLORS = {
    "C1": "#3b82f6", // Blue
    "C2": "#10b981", // Emerald
    "C3": "#8b5cf6", // Purple
    "C4": "#f59e0b", // Amber
    "C5": "#f43f5e", // Rose
    "C7": "#0ea5e9", // Sky
    "C8": "#84cc16", // Lime
    "FA": "#64748b", // Slate
    "E":  "#d946ef"  // Fuchsia
};

// 💡 2. Dynamic Color අදාළ වන පරිදි හැදූ Custom Label
const CustomLabel = (props) => {
    const { x, y, value, strokeColor } = props;
    if (value == null) return null;
    return (
        <g>
            <rect x={x - 14} y={y - 28} width={28} height={20} fill="#ffffff" stroke={strokeColor || "#16a34a"} strokeWidth={1.5} rx={10} className="shadow-sm" />
            <text x={x} y={y - 14} fill={strokeColor || "#14532d"} fontSize={11} fontWeight="900" textAnchor="middle">
                {value}
            </text>
        </g>
    );
};

const getDefaultDates = () => {
    const end = new Date();
    const start = new Date(end);
    const dayOfWeek = start.getDay(); 
    const diffToThu = (dayOfWeek < 4 ? dayOfWeek + 7 : dayOfWeek) - 4;
    start.setDate(start.getDate() - diffToThu);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

export default function BestLeafCountChart() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const printRef = useRef(null); 

    const defaultDates = getDefaultDates();
    const [startDate, setStartDate] = useState(defaultDates.start);
    const [endDate, setEndDate] = useState(defaultDates.end);
    
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [rawData, setRawData] = useState([]);

    const getDatesInRange = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);
        const stopDate = new Date(end);
        while (currentDate <= stopDate) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dateArray;
    };

    const fetchChartData = async () => {
        if (!startDate || !endDate) {
            toast.error("Please select both Start and End dates.");
            return;
        }

        const dateList = getDatesInRange(startDate, endDate);
        if (dateList.length > 31) {
            toast.error("Cannot select a date range longer than 31 days.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Fetching data...");

        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const promises = dateList.map(date => 
                fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?date=${date}`, { headers })
                    .then(res => res.ok ? res.json() : { data: [] })
                    .catch(() => ({ data: [] }))
            );

            const results = await Promise.all(promises);
            
            let combinedRecords = [];
            results.forEach((res, index) => {
                if (res.data && res.data.length > 0) {
                    res.data.forEach(r => combinedRecords.push({ ...r, _recordDate: dateList[index] }));
                }
            });

            setRawData(combinedRecords);
            toast.success("Data fetched successfully!", { id: toastId });

        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to fetch data.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const { summaryData, routeTrendData } = useMemo(() => {
        if (rawData.length === 0) return { summaryData: [], routeTrendData: {} };

        const tempRouteData = {};
        ROUTE_LIST.forEach(route => {
            tempRouteData[route.id] = { id: route.id, label: route.label, dailyData: [], sumBest: 0, count: 0 };
        });

        const dateList = getDatesInRange(startDate, endDate);

        dateList.forEach(date => {
            const dayLabel = new Date(date).getDate().toString(); 

            ROUTE_LIST.forEach(route => {
                const record = rawData.find(r => 
                    r._recordDate === date && 
                    (r.route.includes(route.id) || r.route.includes(route.label))
                );

                let bestVal = null;

                if (record) {
                    const sample = record.factorySample?.isEntered ? record.factorySample : (record.collectorSample?.isEntered ? record.collectorSample : null);
                    if (sample && sample.bestPct) {
                        bestVal = Math.round(Number(sample.bestPct));
                        tempRouteData[route.id].sumBest += bestVal;
                        tempRouteData[route.id].count += 1;
                    }
                }

                tempRouteData[route.id].dailyData.push({
                    day: dayLabel,
                    fullDate: date,
                    value: bestVal 
                });
            });
        });

        const summary = ROUTE_LIST.map(route => {
            const rData = tempRouteData[route.id];
            const avg = rData.count > 0 ? Math.round(rData.sumBest / rData.count) : 0;
            return {
                name: route.label, 
                value: avg
            };
        });

        return { summaryData: summary, routeTrendData: tempRouteData };

    }, [rawData, startDate, endDate]);

    const downloadChartsAsPDF = async () => {
        if (!printRef.current) return;
        
        setIsDownloading(true);
        const toastId = toast.loading("Generating High-Performance PDF...");

        try {
            const isDark = document.documentElement.classList.contains('dark');
            const bgColor = isDark ? '#030712' : '#f8fafc'; 

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgWidth = pdfWidth - (margin * 2);
            
            try {
                const res = await fetch("/logo.png");
                if (res.ok) {
                    const blob = await res.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    pdf.addImage(dataUrl, "PNG", 14, 10, 24, 24, "", "FAST");
                }
            } catch (err) {
                console.warn("Logo not found.");
            }

            pdf.setFontSize(18);
            pdf.setTextColor(27, 106, 49); 
            pdf.setFont(undefined, 'bold');
            pdf.text("ATHUKORALA GROUP (PVT) LTD", 42, 18);

            pdf.setFontSize(14);
            pdf.setTextColor(40, 40, 40); 
            pdf.setFont(undefined, 'bold');
            pdf.text("TODATE BEST LEAF COUNT PERCENTAGES", 42, 26);

            pdf.setFontSize(11);
            pdf.setTextColor(80, 80, 80); 
            pdf.setFont(undefined, 'normal');
            pdf.text(`Date Range: ${startDate} to ${endDate}`, 42, 33);

            const now = new Date();
            const generatedDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${(now.getHours() % 12 || 12)}.${String(now.getMinutes()).padStart(2, '0')}${now.getHours() >= 12 ? 'p.m.' : 'a.m.'}`;
            const uniqueCode = `BLC-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}`;

            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Doc Ref: ${uniqueCode}`, pdfWidth - 14, 20, { align: 'right' });
            pdf.text(`Generated: ${generatedDateTime}`, pdfWidth - 14, 25, { align: 'right' });

            let position = 45; 
            const blocks = document.querySelectorAll('.pdf-capture-block');

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const canvas = await html2canvas(block, { scale: 1.5, useCORS: true, backgroundColor: bgColor });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (position + imgHeight > pdfHeight - margin) {
                    pdf.addPage();
                    position = margin + 10; 
                }

                pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
                position += imgHeight + 8; 
            }

            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(128, 128, 128);
                pdf.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
            }

            pdf.save(`Best_Leaf_Count_Charts_${startDate}_to_${endDate}.pdf`);
            toast.success("Charts downloaded successfully!", { id: toastId });
            
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF.", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    // 💡 3. PDF කැපීම වැලැක්වීම සඳහා දැන් 2 ගානේ වෙනුවට 1 බැගින් (Row-by-row) Chunk කිරීම
    const activeRoutes = ROUTE_LIST.filter(route => routeTrendData[route.id]?.count > 0);
    const chunkedRoutes = [];
    for (let i = 0; i < activeRoutes.length; i += 1) { // 1 Per Block for Full Width
        chunkedRoutes.push(activeRoutes.slice(i, i + 1));
    }

    const customTooltipStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '10px 14px',
        fontWeight: 'bold',
        color: '#1e293b'
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-950">
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-900/10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
                        <LineChart size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Best Leaf Percentage Graph</h1>
                        <p className="font-semibold mt-1 tracking-wider text-sm text-gray-500 dark:text-gray-400 uppercase">Todate Leaf Count Analytics</p>
                    </div>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm mb-8 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar size={14} className="text-green-600"/> Start Date (Thu)
                    </label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:text-gray-200 transition-all" />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar size={14} className="text-green-600"/> End Date (Today)
                    </label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:text-gray-200 transition-all" />
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <button onClick={fetchChartData} disabled={loading} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all h-[42px] disabled:opacity-50 flex-1 sm:flex-auto active:scale-95">
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />} 
                        Generate Graph
                    </button>

                    <button 
                        onClick={downloadChartsAsPDF} 
                        disabled={loading || isDownloading || rawData.length === 0} 
                        className="px-6 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all h-[42px] disabled:opacity-50 flex-1 sm:flex-auto active:scale-95"
                    >
                        {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={16} />} 
                        Download PDF
                    </button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {rawData.length === 0 && !loading ? (
                <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No Data Available</h3>
                    <p className="text-sm font-medium text-gray-400 mt-2">Please click Generate Graph to view the charts.</p>
                </div>
            ) : rawData.length > 0 && (
                
                <div ref={printRef} className="space-y-6 bg-gray-50 dark:bg-gray-950 p-2 rounded-xl">
                    
                    {/* OVERALL SUMMARY CHART */}
                    <div className="pdf-capture-block bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
                        <h2 className="text-xl sm:text-2xl font-black text-center text-green-900 dark:text-green-400 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 py-3 rounded-xl mb-10 shadow-sm">
                            Todate Leaf Count ({new Date(startDate).getDate()}{['st','nd','rd'][((new Date(startDate).getDate()+90)%100-10)%10-1]||'th'} - {new Date(endDate).getDate()}{['st','nd','rd'][((new Date(endDate).getDate()+90)%100-10)%10-1]||'th'})
                        </h2>
                        
                        <div className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={summaryData} margin={{ top: 35, right: 30, left: 0, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                    <XAxis dataKey="name" tick={{fill: '#475569', fontSize: 13, fontWeight: 800}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis domain={[0, 60]} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={customTooltipStyle} itemStyle={{ color: '#16a34a' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        name="Best %"
                                        stroke="#16a34a" 
                                        strokeWidth={3.5} 
                                        fill="url(#colorTotal)" 
                                        activeDot={{ r: 7, strokeWidth: 0, fill: '#14532d' }}
                                    >
                                        <LabelList dataKey="value" content={<CustomLabel strokeColor="#16a34a" />} />
                                    </Area>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 💡 4. INDIVIDUAL ROUTE CHARTS (SPLIT LAYOUT WITH DYNAMIC COLORS) */}
                    <div className="space-y-6">
                        {chunkedRoutes.map((rowRoutes, rowIdx) => (
                            <div key={rowIdx} className="pdf-capture-block flex flex-col gap-6">
                                {rowRoutes.map(route => {
                                    const data = routeTrendData[route.id]?.dailyData || [];
                                    const routeColor = ROUTE_COLORS[route.id] || "#3b82f6";

                                    // Calculate Stats
                                    const validValues = data.map(d => d.value).filter(v => v !== null);
                                    const maxVal = validValues.length ? Math.max(...validValues) : 0;
                                    const minVal = validValues.length ? Math.min(...validValues) : 0;
                                    const avgVal = routeTrendData[route.id]?.sumBest > 0 ? Math.round(routeTrendData[route.id].sumBest / routeTrendData[route.id].count) : 0;

                                    return (
                                        <div key={route.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col lg:flex-row hover:shadow-md transition-shadow">
                                            
                                            {/* LEFT SIDE: Stats Panel */}
                                            <div className="lg:w-[25%] p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-800/20 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                                                
                                                <div className="flex items-center gap-3.5 mb-6">
                                                    <div className="w-2.5 h-16 rounded-full flex-shrink-0" style={{backgroundColor: routeColor}}></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-2xl font-black text-[#1e293b] dark:text-gray-300 leading-none mb-1">
                                                            {route.label} {route.id.startsWith('C') ? "" : ""}
                                                        </span>
                                                        <span className="text-xl sm:text-[28px] md:text-xl font-black text-[#151e2e] dark:text-white leading-none uppercase tracking-wide">
                                                            {route.fullName}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Average Best</p>
                                                        <p className="text-2xl font-black" style={{color: routeColor}}>{avgVal}%</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Highest</p>
                                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{maxVal}%</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Lowest</p>
                                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{minVal}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE: Chart Panel */}
                                            <div className="lg:w-[75%] p-6 sm:p-8 h-[280px] lg:h-auto min-h-[280px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={data} margin={{ top: 25, right: 20, left: -25, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id={`colorRoute-${route.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={routeColor} stopOpacity={0.25}/>
                                                                <stop offset="95%" stopColor={routeColor} stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="day" tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} axisLine={false} tickLine={false} dy={5} />
                                                        <YAxis domain={[0, 60]} tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={{...customTooltipStyle, fontSize: '12px'}} itemStyle={{ color: routeColor }} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                                                        <Area 
                                                            connectNulls={true} 
                                                            type="monotone" 
                                                            dataKey="value" 
                                                            name="Best %"
                                                            stroke={routeColor} 
                                                            strokeWidth={3.5} 
                                                            fill={`url(#colorRoute-${route.id})`}
                                                            activeDot={{ r: 6, strokeWidth: 0, fill: routeColor }}
                                                        >
                                                            {/* 💡 Pass the dynamic color to the Label */}
                                                            <LabelList dataKey="value" content={(props) => <CustomLabel {...props} strokeColor={routeColor} />} />
                                                        </Area>
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
}