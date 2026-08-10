import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Package, RefreshCw, Filter } from 'lucide-react';
import PDFDownloader from '@/components/PDFDownloader';

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

  // Filters State
  const [filterMonth, setFilterMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
      toast.error("දත්ත ලබාගැනීමේ දෝෂයක් සිදු විය!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [BACKEND_URL]);

  const getItemValue = (items, categoryId, size, type) => {
    if (!items) return 0;
    const found = items.find(item => {
      if (categoryId === 'others') {
        return item.categoryId === 'others' && item.size.includes(size);
      }
      return item.categoryId === categoryId && item.size === size;
    });

    if (!found) return 0;
    const val = found[type];
    return (val !== undefined && val !== null && val !== '') ? Number(val) : 0;
  };

  // Filter Logic
  const filteredSummaries = useMemo(() => {
    let filtered = summaries;

    if (filterMonth) {
      filtered = filtered.filter(record => record.date.startsWith(filterMonth));
    } else {
      if (fromDate) filtered = filtered.filter(record => record.date >= fromDate);
      if (toDate) filtered = filtered.filter(record => record.date <= toDate);
    }

    return filtered;
  }, [summaries, filterMonth, fromDate, toDate]);

  // Calculate Totals
  const totals = useMemo(() => {
    const calcTotals = {};
    teaCategories.forEach(cat => {
      calcTotals[cat.id] = {};
      cat.sizes.forEach(size => {
        calcTotals[cat.id][size] = { in: 0, out: 0 };
      });
    });

    filteredSummaries.forEach(record => {
      teaCategories.forEach(cat => {
        cat.sizes.forEach(size => {
          calcTotals[cat.id][size].out += getItemValue(record.items, cat.id, size, 'out');
          calcTotals[cat.id][size].in += getItemValue(record.items, cat.id, size, 'in');
        });
      });
    });

    return calcTotals;
  }, [filteredSummaries]);

  // Handle Month change (clears from/to dates)
  const handleMonthChange = (e) => {
    setFilterMonth(e.target.value);
    if (e.target.value) {
      setFromDate('');
      setToDate('');
    }
  };

  // Handle Date Range change (clears month)
  const handleDateChange = (setter) => (e) => {
    setter(e.target.value);
    setFilterMonth('');
  };

  // Prepare Data for PDF
  const preparePdfHeaders = () => {
    return [
      [
        { content: 'DATE', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
        ...teaCategories.map(cat => {
          if (cat.title === '') {
            return cat.sizes.map(size => ({ content: size, colSpan: 2, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }));
          }
          return { content: cat.title, colSpan: cat.sizes.length * 2, styles: { halign: 'center' } };
        }).flat()
      ],
      [
        ...teaCategories.filter(cat => cat.title !== '').map(cat =>
          cat.sizes.map(size => ({ content: size, colSpan: 2, styles: { halign: 'center' } }))
        ).flat(2)
      ],
      [
        ...teaCategories.map(cat =>
          cat.sizes.map(() => [
            { content: 'OUT', styles: { textColor: [220, 38, 38], halign: 'center' } },
            { content: 'IN', styles: { textColor: [22, 163, 74], halign: 'center' } }
          ])
        ).flat(3)
      ]
    ];
  };

  const preparePdfData = () => {
    const data = filteredSummaries.map(record => {
      const row = [record.date];
      teaCategories.forEach(cat => {
        cat.sizes.forEach(size => {
          const outVal = getItemValue(record.items, cat.id, size, 'out');
          const inVal = getItemValue(record.items, cat.id, size, 'in');
          row.push(outVal > 0 ? outVal : '-');
          row.push(inVal > 0 ? inVal : '-');
        });
      });
      return row;
    });

    // Add Total Row
    const totalRow = ['TOTAL'];
    teaCategories.forEach(cat => {
      cat.sizes.forEach(size => {
        totalRow.push(totals[cat.id][size].out > 0 ? totals[cat.id][size].out.toFixed(2) : '-');
        totalRow.push(totals[cat.id][size].in > 0 ? totals[cat.id][size].in.toFixed(2) : '-');
      });
    });
    
    data.push(totalRow);
    return data;
  };

  return (
    <div className="p-4 sm:p-8 max-w-full mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      
      {/* Top Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-500 flex items-center gap-2">
            <Package size={30} /> Daily IN/OUT Log
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Master overview of daily product inventory</p>
        </div>

        <div className="flex items-center gap-3">
          <PDFDownloader
            title="Daily IN/OUT Log"
            subtitle={`Filtered Data Overview - ${new Date().toLocaleDateString()}`}
            headers={preparePdfHeaders()}
            data={preparePdfData()}
            fileName="daily_in_out_log.pdf"
            orientation="landscape"
            uniqueCode="DIOL-2026"
            autoTableOptions={{
              theme: 'grid', // Grid theme එක අනිවාර්ය කරන්න
              styles: { 
                fontSize: 6, 
                cellPadding: 1.5,
                lineWidth: 0.1, // මේකෙන් Table එක පුරාම ඉරි (Borders) අඳිනවා
                lineColor: [180, 180, 180] // ඉරි වල පාට (අළු පාට)
              },
              headStyles: { 
                fillColor: [220, 245, 220], // 👈 Header එකේ පසුබිම ලා කොළ පාට (Light Green) කරයි
                textColor: [30, 30, 30], // අකුරු වල පාට කළු
                lineWidth: 0.1, // 👈 Header එකේ කොටු වලටත් ඉරි දානවා
                lineColor: [180, 180, 180] // Header එකේ ඉරි වල පාට
              },
              columnStyles: { 0: { cellWidth: 15 } }
            }}
          />

          <button 
            onClick={fetchSummaries} 
            disabled={loading}
            className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-green-50 dark:hover:bg-green-900/30"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Filter Section (Matched to Image Style) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Month</label>
            <div className="relative">
              <input 
                type="month" 
                value={filterMonth}
                onChange={handleMonthChange}
                className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 bg-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">From Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={fromDate}
                onChange={handleDateChange(setFromDate)}
                className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 bg-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">To Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={toDate}
                onChange={handleDateChange(setToDate)}
                className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <RefreshCw size={40} className="animate-spin mb-3 text-green-600" />
          <p className="text-sm font-bold">Loading data...</p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 text-center">
          <Filter size={48} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No records found</h3>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters to see more results.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-center text-xs">
            <thead >
              {/* Row 1: Category Titles */}
              <tr className="bg-green-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-zinc-700">
                <th className="bg-green-100 p-3 border-r border-gray-300 dark:border-zinc-700 min-w-[100px] sticky left-0 bg-gray-50 dark:bg-zinc-800 z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#3f3f46]" rowSpan="2">
                  DATE
                </th>
                {teaCategories.map((cat) => {
                  if (cat.title === '') {
                    return cat.sizes.map((size) => (
                      <th key={`${cat.id}-${size}`} colSpan="2" className="bg-green-100 py-2 px-1 border-r border-gray-200 dark:border-zinc-700" rowSpan="2">
                        {size}
                      </th>
                    ));
                  }
                  return (
                    <th 
                      key={cat.id} 
                      colSpan={cat.sizes.length * 2} 
                      className="bg-green-100 py-2 px-1 border-r border-gray-300 dark:border-zinc-700 uppercase tracking-wider"
                    >
                      {cat.title}
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Sizes */}
              <tr className="bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-zinc-700">
                {teaCategories.map((cat) => {
                  if (cat.title === '') return null; 
                  return cat.sizes.map((size) => (
                    <th key={`${cat.id}-${size}`} colSpan="2" className="bg-green-100 py-2 px-1 border-r border-gray-300 dark:border-zinc-700">
                      {size}
                    </th>
                  ));
                })}
              </tr>

              {/* Row 3: OUT / IN subheaders */}
              <tr className="bg-green-100 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-300 font-bold border-b-2 border-gray-300 dark:border-zinc-700 text-[10px]">
                <th className="bg-green-100 sticky left-0 bg-gray-50 dark:bg-zinc-800/90 border-r border-gray-300 dark:border-zinc-700 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#3f3f46]"></th>
                {teaCategories.map((cat) => 
                  cat.sizes.map((size) => (
                    <React.Fragment key={`sub-${cat.id}-${size}`}>
                      <th className="py-1.5 px-1 border-r border-gray-300 dark:border-zinc-700 text-red-600 dark:text-red-400">OUT</th>
                      <th className="py-1.5 px-1 border-r border-gray-300  dark:border-zinc-700 text-green-600 dark:text-green-400">IN</th>
                    </React.Fragment>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {filteredSummaries.map((record) => (
                <tr key={record._id} className="hover:bg-amber-50/40 dark:hover:bg-zinc-800/40 transition-colors border-r border-gray-300">
                  <td className="p-3 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-300 dark:border-zinc-800 sticky left-0 bg-white dark:bg-zinc-900 z-10 whitespace-nowrap shadow-[1px_0_0_0_#f3f4f6] dark:shadow-[1px_0_0_0_#27272a]">
                    {record.date}
                  </td>
                  {teaCategories.map((cat) => 
                    cat.sizes.map((size) => {
                      const outVal = getItemValue(record.items, cat.id, size, 'out');
                      const inVal = getItemValue(record.items, cat.id, size, 'in');

                      return (
                        <React.Fragment key={`val-${record._id}-${cat.id}-${size}`}>
                          <td className={`p-2 border-r border-gray-300 dark:border-zinc-800 font-semibold ${outVal > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-zinc-700'}`}>
                            {outVal > 0 ? outVal : '-'}
                          </td>
                          <td className={`p-2 border-r border-gray-300 dark:border-zinc-800 font-semibold ${inVal > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-zinc-700'}`}>
                            {inVal > 0 ? inVal : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>

            {/* Total Row */}
            <tfoot className="sticky bottom-0">
              <tr className="bg-gray-100 dark:bg-zinc-800 font-black border-t-2 border-gray-300 dark:border-zinc-700 text-xs">
                <td className="p-3 border-r border-gray-300 dark:border-zinc-700 sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10 text-gray-800 dark:text-gray-200 shadow-[1px_0_0_0_#d1d5db] dark:shadow-[1px_0_0_0_#3f3f46]">
                  TOTAL
                </td>
                {teaCategories.map((cat) => 
                  cat.sizes.map((size) => {
                    const outTot = totals[cat.id][size].out;
                    const inTot = totals[cat.id][size].in;
                    return (
                      <React.Fragment key={`tot-${cat.id}-${size}`}>
                        <td className="p-2 border-r border-gray-300 dark:border-zinc-700 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">
                          {outTot > 0 ? outTot.toFixed(2).replace(/\.00$/, '') : '-'}
                        </td>
                        <td className="p-2 border-r border-gray-300 dark:border-zinc-700 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">
                          {inTot > 0 ? inTot.toFixed(2).replace(/\.00$/, '') : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}