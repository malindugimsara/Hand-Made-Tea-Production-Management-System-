import React, { useState, useEffect } from 'react';
import { Calendar, Search, FileText, Package, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ISSUE_TYPES = [
  "Free issued",
  "Labour issued",
  "Staff issued"
];

export default function IssueTypeSummaryView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});
  const [isLoading, setIsLoading] = useState(false);

 // Fetch and process data
  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      // Ensure this URL matches your actual Express route (e.g., /api/issue-summary)
      const response = await fetch(`${BACKEND_URL}/api/summary?date=${date}`);
      
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch summary data');
      }
      
      // Pass result.data because your backend returns { success: true, data: summaries }
      processSummaryData(result.data || []);
      
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Could not load summary data for this date.");
      setSummaryData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processSummaryData = (records) => {
    const summaryMap = {};
    const totals = { total: 0 };
    ISSUE_TYPES.forEach(type => totals[type] = 0);

    records.forEach(record => {
      const type = record.issueType;
      
      record.items.forEach(item => {
        const key = `${item.categoryId}-${item.size}`;
        
        // Initialize row if it doesn't exist
        if (!summaryMap[key]) {
          summaryMap[key] = {
            categoryTitle: item.categoryTitle,
            size: item.size,
            rowTotal: 0
          };
          ISSUE_TYPES.forEach(t => summaryMap[key][t] = 0);
        }

        const outValue = Number(item.out) || 0;
        
        // Add to row
        if (ISSUE_TYPES.includes(type)) {
          summaryMap[key][type] += outValue;
        }
        summaryMap[key].rowTotal += outValue;

        // Add to column totals
        if (ISSUE_TYPES.includes(type)) {
          totals[type] += outValue;
        }
        totals.total += outValue;
      });
    });

    // Convert map to sorted array
    const sortedData = Object.values(summaryMap).sort((a, b) => 
      a.categoryTitle.localeCompare(b.categoryTitle)
    );

    setSummaryData(sortedData);
    setColumnTotals(totals);
  };

  // Optional: Load data on initial mount or when date changes
  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      
      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 flex items-center gap-3">
            <FileText size={32} />
            Daily Issue Summary
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            View aggregated OUT records by category and issue type
          </p>
        </div>
      </div>

      {/* Controls Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 mb-8 flex flex-col sm:flex-row items-end gap-4">
        <div className="w-full sm:w-auto flex-1 max-w-sm">
          <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-yellow-600 dark:text-yellow-500"/> Select Date
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400/50 outline-none bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold transition-colors" 
          />
        </div>
        
        <button 
          onClick={fetchSummary}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
          {isLoading ? "Loading..." : "Load Summary"}
        </button>
      </div>

      {/* Data Table Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
        
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800/80 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center gap-3">
          <Package size={20} className="text-gray-500 dark:text-gray-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
            Summary Data for {date}
          </h3>
        </div>

        <div className="overflow-x-auto">
          {summaryData.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <AlertCircle size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No records found for this date.</p>
              <p className="text-sm mt-1">Try selecting a different date or saving new entries.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                  <th className="p-4 pl-6 w-[20%]">Category</th>
                  <th className="p-4 w-[15%]">Size / Type</th>
                  {ISSUE_TYPES.map(type => (
                    <th key={type} className="p-4 text-center">{type}</th>
                  ))}
                  <th className="p-4 pr-6 text-center text-green-600 dark:text-green-500">Total OUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                {summaryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-800 dark:text-gray-200">
                      {row.categoryTitle}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {row.size}
                    </td>
                    {ISSUE_TYPES.map(type => (
                      <td key={type} className="p-4 text-center font-medium text-gray-600 dark:text-gray-300">
                        {row[type] > 0 ? (
                          <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {row[type]}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-zinc-700">-</span>
                        )}
                      </td>
                    ))}
                    <td className="p-4 pr-6 text-center font-black text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/10">
                      {row.rowTotal > 0 ? row.rowTotal : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Grand Totals Footer */}
              {summaryData.length > 0 && (
                <tfoot className="bg-green-50 dark:bg-green-950/30 border-t-2 border-green-200 dark:border-green-900/50 font-black">
                  <tr>
                    <td colSpan="2" className="p-4 pl-6 text-right uppercase tracking-wider text-green-800 dark:text-green-400 text-sm">
                      Grand Totals
                    </td>
                    {ISSUE_TYPES.map(type => (
                      <td key={type} className="p-4 text-center text-green-700 dark:text-green-300">
                        {columnTotals[type] || 0}
                      </td>
                    ))}
                    <td className="p-4 pr-6 text-center text-lg text-red-600 dark:text-red-400">
                      {columnTotals.total || 0}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}