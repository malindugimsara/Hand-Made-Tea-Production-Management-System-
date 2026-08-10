import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, Package, RefreshCw } from 'lucide-react';

const teaCategories = [
  { id: 'athukorala', title: 'Athukorala', sizes: ['400g', '200g', '100g'] },
  { id: 'bopfSp', title: 'BOPF Sp.', sizes: ['400g', '200g'] },
  { id: 'bopfPremium', title: 'BOPF Premium', sizes: ['400g', '200g'] },
  { id: 'tb', title: 'T/B', sizes: ['100', '25'] },
  { id: 'pitigala', title: 'PITIGALA TEA', sizes: ['400g', '200g'] },
  { id: 'gt', title: 'G/T', sizes: ['200g'] },
  { id: 'others', title: '', sizes: ['G/T T/B 25', 'DUST', 'DUST 1', 'BOPF'] } 
];

export default function DailySummaryTableView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/summary`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch summaries');
      }

      setSummaries(data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Error fetching daily summaries. Please try again later.              ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [BACKEND_URL]);

  const getItemValue = (items, categoryId, size, type) => {
    if (!items) return '-';
    
    const found = items.find(item => {
      if (categoryId === 'others') {
        return item.categoryId === 'others' && item.size.includes(size);
      }
      return item.categoryId === categoryId && item.size === size;
    });

    if (!found) return '-';
    const val = found[type];
    return (val !== undefined && val !== null && val !== 0 && val !== '0' && val !== '') ? val : '-';
  };

  return (
    <div className="p-4 sm:p-8 max-w-full mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400">Daily IN/OUT Data View</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">View your daily IN/OUT product details</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSummaries} 
            disabled={loading}
            className="p-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-800/60 text-green-700 dark:text-green-400 rounded-xl transition-colors flex items-center gap-1.5 font-bold text-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <RefreshCw size={40} className="animate-spin mb-3 text-green-600" />
          <p className="text-sm font-bold">Loading daily summaries...</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 text-center">
          <Package size={48} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No summaries found</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              {/* Row 1: Category Titles & Sizes (Using rowSpan for categories with single sizes) */}
              <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-300 dark:border-zinc-700">
                <th className="p-3 border-r border-gray-300 dark:border-zinc-700 min-w-[110px] sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10" rowSpan="2">
                  DATE
                </th>
                {teaCategories.map((cat) => {
                  if (cat.title === '') {
                    return cat.sizes.map((size) => (
                      <th key={`${cat.id}-${size}`} colSpan="2" className="p-2 border-r border-gray-300 dark:border-zinc-700" rowSpan="2">
                        {size}
                      </th>
                    ));
                  }
                  return (
                    <th 
                      key={cat.id} 
                      colSpan={cat.sizes.length * 2} 
                      className="p-2 border-r border-gray-300 dark:border-zinc-700 uppercase tracking-wider"
                    >
                      {cat.title}
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Sizes (Only for categories that have a title) */}
              <tr className="bg-gray-50 dark:bg-zinc-800/60 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-300 dark:border-zinc-700">
                {teaCategories.map((cat) => {
                  if (cat.title === '') return null; // title එක නැති ඒවා ඉහත row එකේදීම handle කර ඇත
                  return cat.sizes.map((size) => (
                    <th key={`${cat.id}-${size}`} colSpan="2" className="p-2 border-r border-gray-300 dark:border-zinc-700">
                      {size}
                    </th>
                  ));
                })}
              </tr>

              {/* Row 3: OUT / IN subheaders */}
              <tr className="bg-gray-200 dark:bg-zinc-900 text-gray-700 dark:text-gray-300 font-bold border-b-2 border-gray-300 dark:border-zinc-700 text-[10px]">
                <th className="sticky left-0 bg-gray-200 dark:bg-zinc-900 border-r border-gray-500 dark:border-zinc-700"></th>
                {teaCategories.map((cat) => 
                  cat.sizes.map((size) => (
                    <React.Fragment key={`sub-${cat.id}-${size}`}>
                      <th className="p-1.5 border-r border-gray-500 dark:border-zinc-700 text-red-600 dark:text-red-400">OUT</th>
                      <th className="p-1.5 border-r border-gray-500 dark:border-zinc-700 text-green-600 dark:text-green-400">IN</th>
                    </React.Fragment>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {summaries.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                  {/* Date Column (Sticky) */}
                  <td className="p-3 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-500 dark:border-zinc-700 sticky left-0 bg-white dark:bg-zinc-900 z-10 whitespace-nowrap">
                    {record.date}
                  </td>

                  {/* Dynamic Category & Size Values */}
                  {teaCategories.map((cat) => 
                    cat.sizes.map((size) => {
                      const outVal = getItemValue(record.items, cat.id, size, 'out');
                      const inVal = getItemValue(record.items, cat.id, size, 'in');

                      return (
                        <React.Fragment key={`val-${record._id}-${cat.id}-${size}`}>
                          {/* OUT Value */}
                          <td className="p-2 border-r border-gray-500 dark:border-zinc-800 text-red-600 dark:text-red-400 font-bold">
                            {outVal}
                          </td>
                          {/* IN Value */}
                          <td className="p-2 border-r border-gray-500 dark:border-zinc-800 text-green-600 dark:text-green-400 font-bold">
                            {inVal}
                          </td>
                        </React.Fragment>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}     