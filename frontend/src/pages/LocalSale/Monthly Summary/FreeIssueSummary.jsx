import React, { useState, useEffect } from 'react';
import { Search, Gift, RefreshCw, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; // Ensure this path matches your project
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Maps the exact UI columns, adding a colorTheme to match the image_5fe33b.png header aesthetic
const tableStructure = [
  { 
    id: 'athukorala', title: 'ATHUKORALA', colorTheme: 'green',
    columns: [{ size: '400g', key: 'athukorala_400g' }, { size: '200g', key: 'athukorala_200g' }, { size: '100g', key: 'athukorala_100g' }] 
  },
  { 
    id: 'bopfSp', title: 'BOPF SP.', colorTheme: 'blue',
    columns: [{ size: '400g', key: 'bopfSp_400g' }, { size: '200g', key: 'bopfSp_200g' }] 
  },
  { 
    id: 'bopfPremium', title: 'BOPF PRE.', colorTheme: 'purple',
    columns: [{ size: '400g', key: 'bopfPremium_400g' }, { size: '200g', key: 'bopfPremium_200g' }] 
  },
  { 
    id: 'tb', title: 'T/B', colorTheme: 'orange',
    columns: [{ size: '100', key: 'tb_100' }, { size: '25', key: 'tb_25' }] 
  },
  { 
    id: 'pitigala', title: 'PITIGALA TEA', colorTheme: 'teal',
    columns: [{ size: '400g', key: 'pitigala_400g' }, { size: '200g', key: 'pitigala_200g' }] 
  },
  { 
    id: 'gt', title: 'G/T', colorTheme: 'rose',
    columns: [{ size: '200g', key: 'gt_200g' }, { size: 'T/B 25', key: 'gttb25_T/B 25' }] 
  },
  { 
    id: 'others', title: 'OTHER', colorTheme: 'gray',
    columns: [{ size: 'DUST', key: 'others_DUST (KG)' }, { size: 'DUST 1', key: 'others_DUST 1 (KG)' }, { size: 'BOPF', key: 'others_BOPF (KG)' }] 
  }
];

// Helper to style table headers dynamically
const getHeaderTheme = (theme) => {
  const themes = {
    green: 'bg-green-50/40 text-green-800 border-t-2 border-t-green-500 dark:bg-green-900/20 dark:text-green-400',
    blue: 'bg-blue-50/40 text-blue-800 border-t-2 border-t-blue-500 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50/40 text-purple-800 border-t-2 border-t-purple-500 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50/40 text-orange-800 border-t-2 border-t-orange-500 dark:bg-orange-900/20 dark:text-orange-400',
    teal: 'bg-teal-50/40 text-teal-800 border-t-2 border-t-teal-500 dark:bg-teal-900/20 dark:text-teal-400',
    rose: 'bg-rose-50/40 text-rose-800 border-t-2 border-t-rose-500 dark:bg-rose-900/20 dark:text-rose-400',
    gray: 'bg-gray-50/40 text-gray-700 border-t-2 border-t-gray-400 dark:bg-zinc-800/50 dark:text-gray-300',
  };
  return themes[theme] || themes.gray;
};

export default function FreeIssueSummary() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [reportData, setReportData] = useState([]);

  // Fetch Data
  const fetchFreeIssues = async () => {
    if (!month) return;
    setIsLoading(true);

    try {
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
    const freeRecords = records.filter(record => record.issueType === 'Free issued');
    const dailyMap = {};

    freeRecords.forEach(record => {
      const date = record.date;
      if (!dailyMap[date]) dailyMap[date] = {};
      
      record.items?.forEach(item => {
        const key = `${item.categoryId}_${item.size}`;
        const outValue = Number(item.out) || 0;

        if (outValue > 0) {
          dailyMap[date][key] = (dailyMap[date][key] || 0) + outValue;
        }
      });
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const formattedData = sortedDates.map(date => ({
      date,
      values: dailyMap[date]
    }));

    setReportData(formattedData);
  };

  useEffect(() => {
    fetchFreeIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // --- FILTERING & DYNAMIC TOTALS ---
  const filteredReportData = reportData.filter(row => 
    !searchQuery || row.date.replace(/-/g, '.').includes(searchQuery)
  );

  const filteredTotals = {};
  filteredReportData.forEach(row => {
    tableStructure.forEach(cat => {
      cat.columns.forEach(col => {
        const val = Number(row.values[col.key]) || 0;
        filteredTotals[col.key] = (filteredTotals[col.key] || 0) + val;
      });
    });
  });

  const clearFilters = () => setSearchQuery('');
  const formatVal = (val) => (val && val > 0) ? val : '';
  const getMonthName = () => {
    if (!month) return "";
    const [y, m] = month.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  // --- EXPORT PDF LOGIC ---
  const getPdfHeaders = () => {
    const headers = ["DATE"];
    tableStructure.forEach(cat => cat.columns.forEach(col => headers.push(`${cat.title}\n(${col.size})`)));
    return headers;
  };

  const getPdfData = () => {
    const data = filteredReportData.map(row => {
      const rowData = [{ content: row.date.replace(/-/g, '.'), styles: { fontStyle: 'bold' } }];
      tableStructure.forEach(cat => cat.columns.forEach(col => rowData.push(formatVal(row.values[col.key]) || '-')));
      return rowData;
    });

    const totalsRow = [{ content: "TOTAL", styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } }];
    tableStructure.forEach(cat => {
      cat.columns.forEach(col => {
        totalsRow.push({ content: formatVal(filteredTotals[col.key]) || '0', styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } });
      });
    });
    data.push(totalsRow);
    return data;
  };

  // --- EXPORT EXCEL (.XLSX) LOGIC WITH COLORS ---
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Free Issued');

      let totalCols = 1;
      tableStructure.forEach(cat => totalCols += cat.columns.length);

      const titleRow = worksheet.addRow([`FREE ISSUED - ${getMonthName()}`]);
      worksheet.mergeCells(1, 1, 1, totalCols);
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBFBEE' } }; 
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF166534' } };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 30;

      const catRow = worksheet.addRow(['DATE']);
      let colIndex = 2;
      tableStructure.forEach(cat => {
        catRow.getCell(colIndex).value = cat.title;
        if (cat.columns.length > 1) worksheet.mergeCells(2, colIndex, 2, colIndex + cat.columns.length - 1);
        colIndex += cat.columns.length;
      });

      const sizeRow = worksheet.addRow(['']);
      tableStructure.forEach(cat => {
        cat.columns.forEach(col => sizeRow.getCell(sizeRow.actualCellCount + 1).value = col.size);
      });
      worksheet.mergeCells('A2:A3'); 

      [catRow, sizeRow].forEach(row => {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          cell.font = { bold: true, color: { argb: 'FF374151' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        });
      });

      filteredReportData.forEach(row => {
        const rowData = [row.date.replace(/-/g, '.')];
        tableStructure.forEach(cat => cat.columns.forEach(col => {
          const val = row.values[col.key];
          rowData.push(val && val > 0 ? Number(val) : '');
        }));
        
        const dataRow = worksheet.addRow(rowData);
        dataRow.eachCell(cell => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFF3F4F6' } } };
        });
        dataRow.getCell(1).font = { bold: true, color: { argb: 'FF4B5563' } }; 
      });

      const totalsData = ["TOTAL"];
      tableStructure.forEach(cat => cat.columns.forEach(col => {
        const totalVal = filteredTotals[col.key];
        totalsData.push(totalVal && totalVal > 0 ? Number(totalVal) : 0);
      }));
      
      const totalsRow = worksheet.addRow(totalsData);
      totalsRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        cell.font = { bold: true, color: { argb: 'FF111827' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'medium', color: { argb: 'FFD1D5DB' } } };
      });

      worksheet.getColumn(1).width = 15;
      for (let i = 2; i <= totalCols; i++) worksheet.getColumn(i).width = 10;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Free_Issued_${getMonthName()}.xlsx`);
      toast.success("Excel summary downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download Excel file.");
    }
  };

  const uniqueCode = `FREE-ISSUE/${getMonthName()}/${new Date().getFullYear()}`;

  return (
    <div className="p-4 sm:p-8 w-full max-w-[1400px] mx-auto font-sans bg-slate-50 dark:bg-zinc-950 min-h-screen">
      
      {/* HEADER SECTION (Matches image_5fe33b.png) */}
      <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2">
            <Gift size={26} className="text-green-600 dark:text-green-400" /> Free Issued Report
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monthly breakdown of free product distributions</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Custom Wrapper for PDFDownloader to match target styling */}
          <div className="[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button]:border [&>button]:border-blue-200 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-semibold [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:text-sm hover:[&>button]:bg-blue-100 dark:[&>button]:bg-blue-900/20 dark:[&>button]:border-blue-800/50 dark:hover:[&>button]:bg-blue-900/40 transition-colors">
            <PDFDownloader 
              title={`FREE ISSUED SUMMARY - ${getMonthName()}`}
              subtitle={searchQuery ? `Filtered by Date: ${searchQuery}` : `Complete Monthly Report`}
              headers={getPdfHeaders()}
              data={getPdfData()}
              uniqueCode={uniqueCode}
              fileName={`Free_Issued_${getMonthName()}.pdf`}
              orientation="landscape"
              disabled={isLoading || filteredReportData.length === 0}
            />
          </div>

          <button 
            onClick={exportToExcel}
            disabled={isLoading || filteredReportData.length === 0}
            className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50 dark:hover:bg-green-900/40 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          
          <button 
            onClick={fetchFreeIssues}
            disabled={isLoading}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700 dark:hover:bg-zinc-700 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-green-600" : "text-green-600"} /> Sync Data
          </button>
        </div>
      </div>

      {/* FILTER SECTION (Matches floating label style in image_5fe33b.png) */}
      <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all" 
          />
        </div>
        
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search by Date</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="e.g. 2026.08.10"
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all" 
            />
          </div>
        </div>

        <button 
          onClick={clearFilters} 
          disabled={!searchQuery} 
          className="p-2.5 text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-200 dark:bg-zinc-800 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear Filters"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* TABLE SECTION (Matches segmented headers in image_5fe33b.png) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {filteredReportData.length === 0 && !isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <AlertCircle size={48} className="mb-4 opacity-30" />
            <p className="font-semibold text-lg">No records found.</p>
            {searchQuery && <p className="text-sm mt-1">Try clearing your filters.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1000px]">
              
              {/* --- LEVEL 1: SUPER HEADERS --- */}
              <thead>
                <tr>
                  <th rowSpan={2} className="px-4 py-3 align-middle bg-gray-50 dark:bg-zinc-800 border-b border-r border-gray-200 dark:border-zinc-700 sticky left-0 z-10 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  {tableStructure.map((cat, idx) => (
                    <th key={idx} colSpan={cat.columns.length} className={`px-4 py-2 border-r border-b border-gray-200 dark:border-zinc-700 text-[11px] font-bold uppercase tracking-wider ${getHeaderTheme(cat.colorTheme)}`}>
                      {cat.title}
                    </th>
                  ))}
                </tr>
                
                {/* --- LEVEL 2: SUB HEADERS --- */}
                <tr className="bg-white dark:bg-zinc-900">
                  {tableStructure.map(cat => (
                    cat.columns.map((col, cIdx) => (
                      <th key={`${cat.id}-${cIdx}`} className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-r border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900">
                        {col.size}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>

              {/* --- TABLE BODY --- */}
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                {filteredReportData.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-2.5 border-r border-gray-100 dark:border-zinc-800 sticky left-0 bg-white dark:bg-zinc-900 z-10 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {row.date.replace(/-/g, '.')}
                    </td>
                    {tableStructure.map(cat => (
                      cat.columns.map((col) => (
                        <td key={`${row.date}-${col.key}`} className="px-3 py-2.5 border-r border-gray-50 dark:border-zinc-800/50 text-sm text-gray-700 dark:text-gray-300">
                          {formatVal(row.values[col.key])}
                        </td>
                      ))
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* --- FOOTER: TOTALS --- */}
              {filteredReportData.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-zinc-800/80 border-t-2 border-gray-200 dark:border-zinc-700">
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-800 z-10 text-xs font-bold text-gray-800 dark:text-gray-200 uppercase text-left">
                      Total Output
                    </td>
                    {tableStructure.map(cat => (
                      cat.columns.map((col) => (
                        <td key={`total-${col.key}`} className="px-3 py-3 border-r border-gray-200 dark:border-zinc-700 text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatVal(filteredTotals[col.key]) || 0}
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