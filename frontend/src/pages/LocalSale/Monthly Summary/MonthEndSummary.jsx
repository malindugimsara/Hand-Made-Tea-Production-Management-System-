import React, { useState, useEffect } from 'react';
import { Calendar, Search, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Define the exact column structure from your reference image
const teaCategories = [
  { id: 'athukorala', title: 'Athukorala', sizes: ['400g', '200g', '100g'] },
  { id: 'bopfSp', title: 'BOPF Sp.', sizes: ['400g', '200g'] },
  { id: 'bopfPremium', title: 'BOPF Premium', sizes: ['400g', '200g'] },
  { id: 'tb', title: 'T/B', sizes: ['100', '25'] },
  { id: 'pitigala', title: 'PITIGALA TEA', sizes: ['400g', '200g'] },
  { id: 'gt', title: 'G/T', sizes: ['200g', 'T/B 25'] },
  { id: 'dusts', title: 'Other Grades', sizes: ['DUST', 'DUST 1', 'BOPF'] } // Grouped for layout matching
];

export default function MonthEndSummary() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);
  
  // States for processed data
  const [datesOfMonth, setDatesOfMonth] = useState([]);
  const [dailyDataMap, setDailyDataMap] = useState({});
  const [issueTotals, setIssueTotals] = useState({ free: {}, labour: {}, staff: {} });
  const [columnTotals, setColumnTotals] = useState({ out: {}, in: {} });

  const fetchMonthEndData = async () => {
    if (!month) return;
    setIsLoading(true);

    try {
      // Fetch both endpoints simultaneously for the selected month
      const [dailyRes, issueRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/summary?month=${month}`), // Daily Summaries (IN/OUT)
        fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`) // Issue Type Summaries (Deductions)
      ]);

      const dailyJson = await dailyRes.json();
      const issueJson = await issueRes.json();

      if (!dailyRes.ok) throw new Error(dailyJson.message || "Failed to fetch daily summaries");
      if (!issueRes.ok) throw new Error(issueJson.message || "Failed to fetch issue summaries");

      processReportData(dailyJson.data || [], issueJson.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Error generating month end report.");
    } finally {
      setIsLoading(false);
    }
  };

  const processReportData = (dailyRecords, issueRecords) => {
    // 1. Generate all dates for the selected month
    const [year, monthIndex] = month.split('-');
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `${year}-${monthIndex}-${day}`;
    });
    setDatesOfMonth(dates);

    // 2. Process Daily Data (IN / OUT per day)
    const dailyMap = {};
    const colTotals = { out: {}, in: {} };

    dates.forEach(d => dailyMap[d] = {}); // Initialize empty days

    dailyRecords.forEach(record => {
      const date = record.date;
      if (!dailyMap[date]) dailyMap[date] = {};
      
      record.items?.forEach(item => {
        const key = `${item.categoryId}_${item.size}`;
        dailyMap[date][key] = {
          out: (dailyMap[date][key]?.out || 0) + (Number(item.out) || 0),
          in: (dailyMap[date][key]?.in || 0) + (Number(item.in) || 0)
        };

        colTotals.out[key] = (colTotals.out[key] || 0) + (Number(item.out) || 0);
        colTotals.in[key] = (colTotals.in[key] || 0) + (Number(item.in) || 0);
      });
    });

    // 3. Process Issue Type Data for bottom footer
    const issueMap = { 'Free issued': {}, 'Labour issued': {}, 'Staff issued': {} };
    
    issueRecords.forEach(record => {
      const type = record.issueType;
      if (issueMap[type]) {
        record.items?.forEach(item => {
          const key = `${item.categoryId}_${item.size}`;
          issueMap[type][key] = (issueMap[type][key] || 0) + (Number(item.out) || 0);
        });
      }
    });

    setDailyDataMap(dailyMap);
    setColumnTotals(colTotals);
    setIssueTotals({
      free: issueMap['Free issued'],
      labour: issueMap['Labour issued'],
      staff: issueMap['Staff issued']
    });
  };

  useEffect(() => {
    fetchMonthEndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Utility to format values (hides 0s to match your image_6fc519.png)
  const formatVal = (val) => (val && val > 0) ? val : '';

  return (
    <div className="p-4 sm:p-8 w-full max-w-[100vw] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      
      {/* Header & Controls */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-extrabold text-indigo-800 dark:text-indigo-400 flex items-center gap-3 uppercase tracking-wider">
            <FileSpreadsheet size={32} /> Month End Summary
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Consolidated view of Daily Summaries and Issue Deductions</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold" 
          />
          <button 
            onClick={fetchMonthEndData}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
            Generate
          </button>
        </div>
      </div>

      {/* Massive Table Wrapper */}
      <div className="bg-white dark:bg-zinc-900 shadow-xl border border-gray-300 dark:border-zinc-700 overflow-hidden relative rounded-lg">
        
        {datesOfMonth.length === 0 && !isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <AlertCircle size={48} className="mb-4 opacity-30" />
            <p>Select a month to generate the report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar max-h-[75vh]">
            <table className="w-full text-center border-collapse text-xs md:text-sm whitespace-nowrap min-w-[1200px]">
              
              {/* --- TABLE HEADERS --- */}
              <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-zinc-800 shadow-sm">
                
                {/* Level 1: Categories */}
                <tr className="border-b border-gray-300 dark:border-zinc-700">
                  <th rowSpan={3} className="border-r border-gray-300 dark:border-zinc-700 p-2 min-w-[100px] sticky left-0 bg-gray-200 dark:bg-zinc-700 z-30 uppercase tracking-widest font-black text-gray-700 dark:text-gray-200">
                    Date
                  </th>
                  {teaCategories.map((cat, idx) => (
                    <th key={idx} colSpan={cat.sizes.length * 2} className="border-r border-gray-300 dark:border-zinc-700 p-1.5 font-bold text-gray-800 dark:text-gray-200 uppercase">
                      {cat.title}
                    </th>
                  ))}
                </tr>

                {/* Level 2: Sizes */}
                <tr className="border-b border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50">
                  {teaCategories.map(cat => (
                    cat.sizes.map((size, sIdx) => (
                      <th key={`${cat.id}-${sIdx}`} colSpan={2} className="border-r border-gray-300 dark:border-zinc-700 p-1 font-semibold text-gray-600 dark:text-gray-300">
                        {size}
                      </th>
                    ))
                  ))}
                </tr>

                {/* Level 3: OUT / IN */}
                <tr className="border-b-2 border-gray-400 dark:border-zinc-600">
                  {teaCategories.map(cat => (
                    cat.sizes.map((size, sIdx) => (
                      <React.Fragment key={`outin-${cat.id}-${sIdx}`}>
                        <th className="border-r border-gray-300 dark:border-zinc-700 p-1 font-bold text-gray-500 bg-white dark:bg-zinc-900 w-12">OUT</th>
                        <th className="border-r border-gray-400 dark:border-zinc-600 p-1 font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 w-12">IN</th>
                      </React.Fragment>
                    ))
                  ))}
                </tr>
              </thead>

              {/* --- TABLE BODY (Days of Month) --- */}
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {datesOfMonth.map((date) => {
                  const isSunday = new Date(date).getDay() === 0;
                  
                  return (
                    <tr key={date} className={`hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 transition-colors ${isSunday ? 'bg-blue-50/30 dark:bg-blue-900/10 font-medium' : 'bg-white dark:bg-zinc-900'}`}>
                      {/* Date Column (Sticky Left) */}
                      <td className={`border-r border-gray-300 dark:border-zinc-700 p-1.5 sticky left-0 z-10 font-semibold ${isSunday ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}>
                        {date.replace(/-/g, '.')}
                      </td>

                      {/* Data Columns */}
                      {teaCategories.map(cat => (
                        cat.sizes.map((size) => {
                          const key = `${cat.id}_${size}`;
                          const dayData = dailyDataMap[date]?.[key] || {};
                          
                          return (
                            <React.Fragment key={`${date}-${key}`}>
                              <td className="border-r border-gray-200 dark:border-zinc-700/50 p-1 text-gray-800 dark:text-gray-300">
                                {formatVal(dayData.out)}
                              </td>
                              <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-red-600 dark:text-red-400 font-medium bg-amber-50/30 dark:bg-amber-900/5">
                                {formatVal(dayData.in)}
                              </td>
                            </React.Fragment>
                          )
                        })
                      ))}
                    </tr>
                  )
                })}
              </tbody>

              {/* --- FOOTER: SUMMARY CALCULATIONS --- */}
              <tfoot className="border-t-4 border-gray-400 dark:border-zinc-500 font-bold bg-blue-50 dark:bg-zinc-800">
                
                {/* Total Issued */}
                <tr className="border-b border-gray-300 dark:border-zinc-600">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-2 text-left sticky left-0 bg-blue-100 dark:bg-zinc-700 z-10 uppercase text-blue-900 dark:text-blue-300">Total Issued</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      return (
                        <React.Fragment key={`totissued-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-2 bg-blue-100/50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200">{formatVal(columnTotals.out[key])}</td>
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900"></td> {/* Empty space for IN */}
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

                {/* Free Issued */}
                <tr className="border-b border-gray-300 dark:border-zinc-600 bg-orange-50/50 dark:bg-orange-900/10">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-left sticky left-0 bg-orange-100/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs">Free Issu</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      return (
                        <React.Fragment key={`free-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-gray-600 dark:text-gray-400">{formatVal(issueTotals.free[key])}</td>
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-1"></td>
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

                {/* Labor Issued */}
                <tr className="border-b border-gray-300 dark:border-zinc-600 bg-orange-50/50 dark:bg-orange-900/10">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-left sticky left-0 bg-orange-100/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs">Labor Iss</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      return (
                        <React.Fragment key={`labor-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-gray-600 dark:text-gray-400">{formatVal(issueTotals.labour[key])}</td>
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-1"></td>
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

                {/* Staff Issued */}
                <tr className="border-b border-gray-300 dark:border-zinc-600 bg-orange-50/50 dark:bg-orange-900/10">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-left sticky left-0 bg-orange-100/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs">Staff Iss</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      return (
                        <React.Fragment key={`staff-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-1 text-gray-600 dark:text-gray-400">{formatVal(issueTotals.staff[key])}</td>
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-1"></td>
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

                {/* Net Sale (Total Out - Free - Labor - Staff) */}
                <tr className="border-b border-gray-400 dark:border-zinc-500 bg-rose-50 dark:bg-rose-950/20 text-red-600 dark:text-red-400">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-2 text-left sticky left-0 bg-rose-100 dark:bg-rose-900/40 z-10 uppercase tracking-wider">Net Sale</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      const totalOut = columnTotals.out[key] || 0;
                      const free = issueTotals.free[key] || 0;
                      const labour = issueTotals.labour[key] || 0;
                      const staff = issueTotals.staff[key] || 0;
                      const netSale = totalOut - free - labour - staff;
                      
                      return (
                        <React.Fragment key={`netsale-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-2 font-black">{formatVal(netSale)}</td>
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900"></td>
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

                {/* Transfer IN */}
                <tr className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-400">
                  <td className="border-r border-gray-300 dark:border-zinc-700 p-2 text-left sticky left-0 bg-amber-200 dark:bg-amber-900/50 z-10 uppercase tracking-wider">Transfer In</td>
                  {teaCategories.map(cat => (
                    cat.sizes.map((size) => {
                      const key = `${cat.id}_${size}`;
                      return (
                        <React.Fragment key={`transin-${key}`}>
                          <td className="border-r border-gray-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900"></td> {/* Empty space for OUT */}
                          <td className="border-r border-gray-400 dark:border-zinc-600 p-2 font-black">{formatVal(columnTotals.in[key])}</td>
                        </React.Fragment>
                      )
                    })
                  ))}
                </tr>

              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}