import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, PieChart as PieChartIcon, BarChart3, Table as TableIcon, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// 💡 1. Grade Classification (According to Business Logic)
const MAIN_GRADES = ["OP", "OPA", "OP 1", "BOP", "BOPF", "BOPF SP", "FF", "FF SP", "FF EX SP", "FBOP", "DUST 1", "PEKOE", "PEKOE 1", "BOP1", "FF 1"];
const OFF_GRADES = ["BOP 1 A", "DUST", "BT", "BM", "BP", "FNGS"];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e', '#3b82f6', '#eab308'];

export default function DispatchDashboard() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // --- States ---
  const [activeView, setActiveView] = useState('table'); // 'table', 'bar', 'pie'
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    toDate: new Date().toISOString().split('T')[0], // Today
    broker: 'ALL',
    sellingMark: 'ALL',
    factoryName: 'ATHUKORALA TEA FACTORY'
  });

  // --- Fetch Data ---
  // --- Fetch Data ---
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // 💡 වෙනස: URL එකට startDate සහ endDate අගයන් එකතු කර ඇත
      const fetchUrl = `${BACKEND_URL}/api/factory-logs?startDate=${filters.fromDate}&endDate=${filters.toDate}`;
      
      const res = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRawData(data.records || data || []);
      } else {
        const errData = await res.json();
        toast.error(`Failed to fetch: ${errData.message || "Bad Request"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // Run once on mount. You can add filters dependency if API supports date filtering

  // --- Data Aggregation Logic ---
  const { chartData, summary, sellingMarkData } = useMemo(() => {
    let totalKg = 0;
    let mainGradeKg = 0;
    let offGradeKg = 0;
    const gradeMap = {};

    // 1. Filter by Date Range
    const filteredRecords = rawData.filter(record => {
      const rDate = record.date.split('T')[0];
      return rDate >= filters.fromDate && rDate <= filters.toDate;
    });

    // 2. Aggregate Dispatches
    filteredRecords.forEach(record => {
      if (record.dispatches && Array.isArray(record.dispatches)) {
        record.dispatches.forEach(d => {
          const weight = Number(d.weight) || 0;
          if (weight <= 0) return;

          const grade = d.teaType ? d.teaType.toUpperCase() : "UNKNOWN";
          totalKg += weight;

          if (!gradeMap[grade]) {
            gradeMap[grade] = { name: grade, weight: 0, category: 'OTHER' };
          }
          gradeMap[grade].weight += weight;

          // Classify Grade
          if (MAIN_GRADES.includes(grade)) {
            gradeMap[grade].category = 'MAIN';
            mainGradeKg += weight;
          } else if (OFF_GRADES.includes(grade)) {
            gradeMap[grade].category = 'OFF';
            offGradeKg += weight;
          }
        });
      }
    });

    // 3. Format Chart Data (Calculate Percentages)
    const formattedChartData = Object.values(gradeMap).map(item => ({
      ...item,
      percentage: totalKg > 0 ? ((item.weight / totalKg) * 100).toFixed(1) : 0
    })).sort((a, b) => b.weight - a.weight); // Sort descending

    // 4. Summaries
    const summaryData = {
      total: totalKg,
      main: mainGradeKg,
      mainPct: totalKg > 0 ? ((mainGradeKg / totalKg) * 100).toFixed(2) : 0,
      off: offGradeKg,
      offPct: totalKg > 0 ? ((offGradeKg / totalKg) * 100).toFixed(2) : 0,
    };

    // 5. Mock Selling Mark Data (For UI demonstration as requested)
    const mockSellingMarkData = [
      { mark: "ATHUKORALA GROUP", weight: mainGradeKg * 0.4, percentage: 40 },
      { mark: "ATHUKORALA SUPER", weight: mainGradeKg * 0.6, percentage: 60 }
    ];

    return { chartData: formattedChartData, summary: summaryData, sellingMarkData: mockSellingMarkData };
  }, [rawData, filters]);

  // --- Input Handlers ---
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-sans min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-950">
      
     {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 transition-colors">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-gray-100 tracking-tight">Dispatch Dashboard</h1>
            <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-gray-500 dark:text-gray-400">Visual Reporting Dashboard</p>
          </div>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
          <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 dark:text-gray-200" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
          <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 dark:text-gray-200" />
        </div>
        <button onClick={fetchDashboardData} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px]">
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAIN VISUAL AREA (Left Side) */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          
          {/* View Toggles */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <button 
              onClick={() => setActiveView('table')} 
              className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'table' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
            >
              <TableIcon size={16}/> Table
            </button>
            <button 
              onClick={() => setActiveView('bar')} 
              className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'bar' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
            >
              <BarChart3 size={16}/> Bar Graph
            </button>
            <button 
              onClick={() => setActiveView('pie')} 
              className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'pie' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
            >
              <PieChartIcon size={16}/> Pie Chart
            </button>
          </div>

          {/* Dynamic Content Area */}
          <div className="flex-1 p-6 min-h-[450px] flex flex-col relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <BarChart3 size={48} className="mb-4 opacity-20" />
                <p className="font-semibold text-lg">No dispatch records found for this period.</p>
              </div>
            ) : (
              <>
                {/* 1. TABLE VIEW */}
                {activeView === 'table' && (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 h-[450px] custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 font-black">Grade Name</th>
                          <th className="px-6 py-4 font-black text-right">Amount (Kg)</th>
                          <th className="px-6 py-4 font-black text-right">Percentage (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {chartData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-3 font-bold text-gray-800 dark:text-gray-200">{row.name}</td>
                            <td className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 text-right">{row.weight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                            <td className="px-6 py-3 font-semibold text-green-600 dark:text-green-400 text-right">{row.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. BAR GRAPH VIEW */}
                {activeView === 'bar' && (
                  <div className="h-[450px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12, fontWeight: 'bold'}} angle={-45} textAnchor="end" />
                        <YAxis tick={{fill: '#6b7280', fontSize: 12, fontWeight: 'bold'}} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="weight" name="Amount (Kg)" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 3. PIE CHART VIEW */}
                {activeView === 'pie' && (
                  <div className="h-[450px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="weight"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} Kg`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* SUMMARIES AREA (Right Side) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main/Off Grade Summaries */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-5 border-b border-gray-100 dark:border-gray-800 pb-2">Grade Summary</h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 p-4 rounded-xl flex justify-between items-center">
                <span className="font-bold text-green-800 dark:text-green-400">MAIN GRADE</span>
                <div className="text-right">
                  <p className="text-lg font-black text-green-900 dark:text-green-300">{summary.main.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-xs font-semibold">Kg</span></p>
                  <p className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/50 inline-block px-2 py-0.5 rounded mt-1">{summary.mainPct}%</p>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4 rounded-xl flex justify-between items-center">
                <span className="font-bold text-orange-800 dark:text-orange-400">OFF GRADE</span>
                <div className="text-right">
                  <p className="text-lg font-black text-orange-900 dark:text-orange-300">{summary.off.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-xs font-semibold">Kg</span></p>
                  <p className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/50 inline-block px-2 py-0.5 rounded mt-1">{summary.offPct}%</p>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex justify-between items-center mt-6">
                <span className="font-black text-gray-800 dark:text-gray-200">TOTAL</span>
                <p className="text-xl font-black text-gray-900 dark:text-white">{summary.total.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-sm font-semibold">Kg</span></p>
              </div>
            </div>
          </div>          
        </div>
      </div>
    </div>
  );
}