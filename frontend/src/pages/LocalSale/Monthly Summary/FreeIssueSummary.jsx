import React, { useState, useEffect } from 'react';
import { Calendar, Search, Gift, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Maps the exact UI columns in your image to the backend categoryIds and sizes
const tableStructure = [
  { 
    id: 'athukorala', title: 'ATHUKORALA', 
    columns: [{ size: '400g', key: 'athukorala_400g' }, { size: '200g', key: 'athukorala_200g' }, { size: '100g', key: 'athukorala_100g' }] 
  },
  { 
    id: 'bopfSp', title: 'BOPF SP.', 
    columns: [{ size: '400g', key: 'bopfSp_400g' }, { size: '200g', key: 'bopfSp_200g' }] 
  },
  { 
    id: 'bopfPremium', title: 'BOPF PRE.', 
    columns: [{ size: '400g', key: 'bopfPremium_400g' }, { size: '200g', key: 'bopfPremium_200g' }] 
  },
  { 
    id: 'tb', title: 'T/B', 
    columns: [{ size: '100', key: 'tb_100' }, { size: '25', key: 'tb_25' }] 
  },
  { 
    id: 'pitigala', title: 'PITIGALA TEA', 
    columns: [{ size: '400g', key: 'pitigala_400g' }, { size: '200g', key: 'pitigala_200g' }] 
  },
  { 
    id: 'gt', title: 'G/T', 
    columns: [{ size: '200g', key: 'gt_200g' }, { size: 'T/B 25', key: 'gttb25_T/B 25' }] 
  },
  { 
    id: 'others', title: 'OTHER', 
    columns: [{ size: 'DUST', key: 'others_DUST (KG)' }, { size: 'DUST 1', key: 'others_DUST 1 (KG)' }, { size: 'BOPF', key: 'others_BOPF (KG)' }] 
  }
];

export default function FreeIssueSummary() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);
  
  const [reportData, setReportData] = useState([]);
  const [totals, setTotals] = useState({});

  const fetchFreeIssues = async () => {
    if (!month) return;
    setIsLoading(true);

    try {
      // Fetch data from the issue-summary endpoint for the selected month
      const response = await fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch free issues");
      }

      processFreeIssueData(result.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Error generating free issues report.");
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processFreeIssueData = (records) => {
    // 1. Filter ONLY "Free issued" records
    const freeRecords = records.filter(record => record.issueType === 'Free issued');

    const dailyMap = {};
    const colTotals = {};

    // 2. Process Data
    freeRecords.forEach(record => {
      const date = record.date;
      if (!dailyMap[date]) dailyMap[date] = {};
      
      record.items?.forEach(item => {
        // Create a unique key mapping to our tableStructure (categoryId_size)
        const key = `${item.categoryId}_${item.size}`;
        const outValue = Number(item.out) || 0;

        if (outValue > 0) {
          dailyMap[date][key] = (dailyMap[date][key] || 0) + outValue;
          colTotals[key] = (colTotals[key] || 0) + outValue;
        }
      });
    });

    // 3. Convert Map to sorted array of objects (Date Ascending)
    const sortedDates = Object.keys(dailyMap).sort();
    const formattedData = sortedDates.map(date => ({
      date,
      values: dailyMap[date]
    }));

    setReportData(formattedData);
    setTotals(colTotals);
  };

  useEffect(() => {
    fetchFreeIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Utility to format values (hides 0s)
  const formatVal = (val) => (val && val > 0) ? val : '';

  // Format month for display (e.g., "JULY")
  const getMonthName = () => {
    if (!month) return "";
    const [y, m] = month.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-[1200px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      
      {/* Header & Controls */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-extrabold text-green-700 dark:text-green-500 flex items-center gap-3 uppercase tracking-wider">
            <Gift size={32} /> Free Issued Report
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Monthly breakdown of free product distributions</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 outline-none bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold" 
          />
          <button 
            onClick={fetchFreeIssues}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
            Generate
          </button>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="bg-white dark:bg-zinc-900 shadow-xl border-2 border-black dark:border-zinc-700 overflow-hidden relative">
        
        {/* Main Title Row matching the Excel sheet */}
        <div className="bg-yellow-300 text-black font-black text-center py-2 text-lg border-b-2 border-black uppercase tracking-widest">
          FREE ISSUED - {getMonthName()}
        </div>

        {reportData.length === 0 && !isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <AlertCircle size={48} className="mb-4 opacity-30" />
            <p>No free issues recorded for this month.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-center border-collapse text-sm font-semibold whitespace-nowrap min-w-[900px] text-black dark:text-gray-200">
              
              {/* --- TABLE HEADERS --- */}
              <thead className="bg-[#d9ead3] dark:bg-green-900/30 text-black dark:text-gray-200">
                {/* Level 1: Categories */}
                <tr>
                  <th rowSpan={2} className="border border-black dark:border-zinc-600 p-2 min-w-[120px] sticky left-0 bg-[#d9ead3] dark:bg-green-900 z-10 uppercase font-black">
                    DATE
                  </th>
                  {tableStructure.map((cat, idx) => (
                    <th key={idx} colSpan={cat.columns.length} className="border border-black dark:border-zinc-600 p-2 font-black uppercase">
                      {cat.title}
                    </th>
                  ))}
                </tr>

                {/* Level 2: Sizes */}
                <tr>
                  {tableStructure.map(cat => (
                    cat.columns.map((col, cIdx) => (
                      <th key={`${cat.id}-${cIdx}`} className="border border-black dark:border-zinc-600 p-1 font-bold">
                        {col.size}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>

              {/* --- TABLE BODY --- */}
              <tbody className="bg-white dark:bg-zinc-900">
                {reportData.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-100 dark:hover:bg-zinc-800">
                    
                    {/* Date Column */}
                    <td className="border border-black dark:border-zinc-600 p-1.5 sticky left-0 bg-white dark:bg-zinc-900 z-10 font-bold text-gray-800 dark:text-gray-300">
                      {row.date.replace(/-/g, '.')}
                    </td>

                    {/* Data Columns */}
                    {tableStructure.map(cat => (
                      cat.columns.map((col) => {
                        const val = row.values[col.key];
                        return (
                          <td key={`${row.date}-${col.key}`} className="border border-black dark:border-zinc-700 p-1 text-gray-800 dark:text-gray-300">
                            {formatVal(val)}
                          </td>
                        )
                      })
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* --- FOOTER: TOTALS --- */}
              {reportData.length > 0 && (
                <tfoot className="bg-[#f4cccc] dark:bg-orange-950/40 text-black dark:text-orange-200 font-black">
                  <tr>
                    <td className="border border-black dark:border-zinc-600 p-2 text-left sticky left-0 bg-[#f4cccc] dark:bg-orange-950 z-10">
                      TOTAL
                    </td>
                    {tableStructure.map(cat => (
                      cat.columns.map((col) => (
                        <td key={`total-${col.key}`} className="border border-black dark:border-zinc-600 p-2">
                          {formatVal(totals[col.key]) || 0}
                        </td>
                      ))
                    ))}
                  </tr>
                </tfoot>
              )}

            </table>
          </div>
        )}
      </div>
    </div>
  );
}