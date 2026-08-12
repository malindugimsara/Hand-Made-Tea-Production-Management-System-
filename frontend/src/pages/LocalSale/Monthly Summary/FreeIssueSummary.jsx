import React, { useState, useEffect } from 'react';
import { Search, FileSpreadsheet, RefreshCw, AlertCircle, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Base structure (මෙයට අමතරව එන ඒවා ඉබේම table එකට එකතු වේ)
const baseTableStructure = [
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
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredCol, setHoveredCol] = useState(null);

    // States for raw data
    const [datesOfMonth, setDatesOfMonth] = useState([]);
    const [dailyDataMap, setDailyDataMap] = useState({});

    // Dynamic columns states (අලුත් items ආවොත් ඒවා මෙතැනට එකතු වේ)
    const [dynamicTableStructure, setDynamicTableStructure] = useState(baseTableStructure);
    const [flatColumns, setFlatColumns] = useState([]);

    const fetchFreeIssues = async () => {
        if (!month) return;
        setIsLoading(true);

        try {
            const token = localStorage.getItem("token"); // 👈 Token එක ලබා ගැනීම
            const response = await fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`, {
                headers: {
                    'Authorization': `Bearer ${token}` // 👈 2. Headers වලට Token එක එකතු කිරීම
                }
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to fetch free issues");
            }

            processFreeIssueData(result.data || []);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Error generating free issues report.");
            setDatesOfMonth([]);
            setDailyDataMap({});
            setDynamicTableStructure(baseTableStructure);
            setFlatColumns([]);
        } finally {
            setIsLoading(false);
        }
    };

    const processFreeIssueData = (records) => {
        const freeRecords = records.filter(record => record.issueType === 'Free issued');
        const dailyMap = {};
        const activeDates = new Set();
        
        // Deep copy of base structure to append new custom items
        const currentStructure = JSON.parse(JSON.stringify(baseTableStructure));

        freeRecords.forEach(record => {
            const date = record.date;
            let hasData = false;
            
            if (!dailyMap[date]) dailyMap[date] = {};
            
            record.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                const outValue = Number(item.out) || 0;

                if (outValue > 0) {
                    dailyMap[date][key] = (dailyMap[date][key] || 0) + outValue;
                    hasData = true;

                    // --- DYNAMICALLY ADD NEW CATEGORY OR SIZE ---
                    let catIndex = currentStructure.findIndex(c => c.id === item.categoryId);
                    
                    if (catIndex === -1) {
                        // Category එක නැත්නම් අලුතින් එකතු කරන්න
                        currentStructure.push({
                            id: item.categoryId,
                            title: item.categoryTitle || item.categoryId.toUpperCase(),
                            columns: [{ size: item.size, key: key }]
                        });
                    } else {
                        // Category එක තියෙනවා, Size එක තියෙනවද බලන්න
                        const colExists = currentStructure[catIndex].columns.some(c => c.size === item.size);
                        if (!colExists) {
                            currentStructure[catIndex].columns.push({ size: item.size, key: key });
                        }
                    }
                }
            });

            if (hasData) activeDates.add(date);
        });

        // Sort Dates Descending
        const sortedDates = Array.from(activeDates)
            .filter(d => d.startsWith(month))
            .sort((a, b) => new Date(b) - new Date(a));

        // Generate flat columns from the dynamically updated structure
        const newFlatColumns = [];
        currentStructure.forEach(cat => {
            cat.columns.forEach(col => {
                newFlatColumns.push({ catId: cat.id, size: col.size, key: col.key });
            });
        });

        setDynamicTableStructure(currentStructure);
        setFlatColumns(newFlatColumns);
        setDatesOfMonth(sortedDates);
        setDailyDataMap(dailyMap);
    };

    useEffect(() => {
        fetchFreeIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    // --- FILTERING & DYNAMIC TOTALS ---
    const filteredDates = datesOfMonth.filter(date => {
        if (searchQuery && !date.replace(/-/g, '.').includes(searchQuery)) return false;

        if (!fromDate && !toDate) return true;
        const targetDate = new Date(date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        if (from && to) return targetDate >= from && targetDate <= to;
        if (from) return targetDate >= from;
        if (to) return targetDate <= to;
        return true;
    });

    const calculateTotals = () => {
        const t = {};
        filteredDates.forEach(date => {
            if (dailyDataMap[date]) {
                Object.entries(dailyDataMap[date]).forEach(([key, val]) => {
                    t[key] = (t[key] || 0) + val;
                });
            }
        });
        return t;
    };

    const currentTotals = calculateTotals();

    // --- UTILS ---
    const clearFilters = () => {
        setFromDate('');
        setToDate('');
        setSearchQuery('');
    };

    const getMonthName = () => {
        if (!month) return "";
        const [y, m] = month.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'long' }).toUpperCase();
    };
    
    const formatShortDate = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${Number(parts[1])}/${parts[2]}`;
        }
        return dateStr;
    };

    const formatVal = (val) => (val && val > 0) ? val : '-';

    // --- EXPORT PDF LOGIC ---
    const getPdfHeaders = () => {
        const row1 = [{
            content: 'DATE',
            rowSpan: 2,
            styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39] }
        }];

        const row2 = []; 

        dynamicTableStructure.forEach(cat => {
            row1.push({
                content: cat.title.toUpperCase(),
                colSpan: cat.columns.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39], fontStyle: 'bold' }
            });

            cat.columns.forEach(col => {
                row2.push({
                    content: col.size,
                    styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39], fontStyle: 'bold' }
                });
            });
        });

        return [row1, row2]; 
    };

    const getPdfData = () => {
        const data = filteredDates.map(date => {
            const row = [{ content: formatShortDate(date), styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }];
            flatColumns.forEach(col => {
                const val = dailyDataMap[date]?.[col.key];
                row.push({ 
                    content: formatVal(val), 
                    styles: { textColor: [239, 68, 68] } 
                });
            });
            return row;
        });

        data.push([{ content: "", colSpan: flatColumns.length + 1, styles: { fillColor: [255, 255, 255], minCellHeight: 6, lineWidth: 0 } }]);
        
        const totalsRow = [{ content: "TOTAL", styles: { fontStyle: 'bold', fillColor: [244, 245, 245], textColor: [17, 24, 39], halign: 'center' } }];
        flatColumns.forEach(col => {
            const val = currentTotals[col.key];
            totalsRow.push({ content: formatVal(val), styles: { fontStyle: 'bold', fillColor: [244, 245, 245], textColor: [239, 68, 68] } });
        });
        totalsRow.isFooter = true;
        data.push(totalsRow);

        return data;
    };

    // --- EXPORT EXCEL LOGIC ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Free Issued');

            let totalCols = 1 + flatColumns.length;

            const titleRow = worksheet.addRow([`FREE ISSUED SUMMARY - ${getMonthName()}`]);
            worksheet.mergeCells(1, 1, 1, totalCols);
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF5EC' } };
            titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF111827' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;

            const catRow = worksheet.addRow(['DATE']);
            let colIndex = 2;
            dynamicTableStructure.forEach(cat => {
                catRow.getCell(colIndex).value = cat.title.toUpperCase();
                const span = cat.columns.length;
                if (span > 1) worksheet.mergeCells(2, colIndex, 2, colIndex + span - 1);
                colIndex += span;
            });

            const sizeRow = worksheet.addRow(['']);
            colIndex = 2;
            dynamicTableStructure.forEach(cat => {
                cat.columns.forEach(col => {
                    sizeRow.getCell(colIndex).value = col.size;
                    colIndex += 1;
                });
            });
            worksheet.mergeCells('A2:A3'); 

            [catRow, sizeRow].forEach(row => {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF5EC' } };
                    cell.font = { bold: true, color: { argb: 'FF111827' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                });
            });

            filteredDates.forEach(date => {
                const rowData = [date];
                flatColumns.forEach(col => {
                    const val = dailyDataMap[date]?.[col.key];
                    rowData.push(val && val > 0 ? Number(val) : '-');
                });
                
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, cIdx) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                    if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                    else cell.font = { color: { argb: 'FFEF4444' } }; 
                });
            });

            worksheet.addRow([]);

            const totalsData = ["TOTAL"];
            flatColumns.forEach(col => {
                const val = currentTotals[col.key];
                totalsData.push(val && val > 0 ? Number(val) : '-');
            });
            const ftRow = worksheet.addRow(totalsData);
            ftRow.eachCell((cell, cIdx) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5F5' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                else cell.font = { bold: true, color: { argb: 'FFDC2626' } }; 
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
    const subtitleText = (fromDate || toDate) 
        ? `Filtered: ${fromDate || 'Start'} to ${toDate || 'End'}` 
        : `Complete Monthly Report`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1500px] mx-auto font-sans bg-slate-50 dark:bg-zinc-950 min-h-screen transition-colors duration-300">

            {/* HEADER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2">
                        <FileSpreadsheet size={26} className="text-green-600 dark:text-green-500" /> Free Issued Report
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monthly breakdown of free product distributions</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button]:border [&>button]:border-blue-200 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-semibold [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:text-sm hover:[&>button]:bg-blue-100 dark:[&>button]:bg-blue-900/20 dark:[&>button]:border-blue-800/50 dark:hover:[&>button]:bg-blue-900/40 transition-colors">
                        <PDFDownloader
                            title={`FREE ISSUED SUMMARY - ${getMonthName()}`}
                            subtitle={subtitleText}
                            headers={getPdfHeaders()}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Free_Issued_${getMonthName()}.pdf`}
                            orientation="landscape" 
                            disabled={isLoading || filteredDates.length === 0}
                            autoTableOptions={{
                                theme: 'grid',
                                styles: {
                                    fontSize: 6,        
                                    cellPadding: 1.5,   
                                    lineWidth: 0.1,
                                    lineColor: [220, 235, 220]
                                },
                                headStyles: {
                                    minCellHeight: 14   
                                },
                                columnStyles: {
                                    0: { cellWidth: 18 } 
                                }
                            }}
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        disabled={isLoading || filteredDates.length === 0}
                        className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50 dark:hover:bg-green-900/40 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <FileText size={16} /> Export Excel
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

            {/* FILTER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-end gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 w-full">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                                setMonth(e.target.value);
                                setFromDate('');
                                setToDate('');
                            }}
                            className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Date</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. 08.10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={clearFilters}
                    disabled={!fromDate && !toDate && !searchQuery}
                    className="p-2.5 md:mb-[1px] text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto flex justify-center shadow-sm"
                    title="Clear All Filters"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* MASSIVE TABLE WRAPPER */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 overflow-hidden">
                {filteredDates.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No free issues found for the selected criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar max-h-[70vh]" onMouseLeave={() => setHoveredCol(null)}>
                        <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1000px]">

                            {/* --- TABLE HEADERS --- */}
                            <thead className="sticky top-0 z-20 shadow-sm bg-[#eaf5ec] dark:bg-green-900/30 text-gray-800 dark:text-gray-200">

                                {/* Level 1: Categories */}
                                <tr>
                                    <th rowSpan={2} className="px-4 py-3 align-middle border border-[#dcebdc] dark:border-green-800/50 sticky left-0 z-30 text-xs font-bold uppercase tracking-wider bg-[#eaf5ec] dark:bg-green-900/80">
                                        Date
                                    </th>
                                    {dynamicTableStructure.map((cat, idx) => (
                                        <th key={idx} colSpan={cat.columns.length} className="px-4 py-2 border border-[#dcebdc] dark:border-green-800/50 text-[11px] font-bold uppercase tracking-wider">
                                            {cat.title}
                                        </th>
                                    ))}
                                </tr>

                                {/* Level 2: Sizes */}
                                <tr>
                                    {dynamicTableStructure.map(cat => (
                                        cat.columns.map((col, cIdx) => (
                                            <th key={`${cat.id}-${cIdx}`} className="px-3 py-1.5 text-[11px] font-bold border border-[#dcebdc] dark:border-green-800/50 text-red-500">
                                                {col.size}
                                            </th>
                                        ))
                                    ))}
                                </tr>
                            </thead>

                            {/* --- TABLE BODY --- */}
                            <tbody className="bg-white dark:bg-zinc-950">
                                {filteredDates.map((date) => {
                                    return (
                                        <tr key={date} className="group hover:bg-[#f6fbf6] dark:hover:bg-zinc-900 transition-colors">
                                            <td 
                                                onMouseEnter={() => setHoveredCol(0)}
                                                className={`px-4 py-2 border border-[#dcebdc] dark:border-zinc-700/50 sticky left-0 z-10 text-sm font-bold text-gray-800 dark:text-gray-200 bg-[#eaf5ec] dark:bg-green-900/50 transition-colors ${hoveredCol === 0 ? 'brightness-95 dark:brightness-125' : ''}`}
                                            >
                                                {formatShortDate(date)}
                                            </td>

                                            {flatColumns.map((col, idx) => {
                                                const cIdx = idx + 1;
                                                const val = dailyDataMap[date]?.[col.key];

                                                return (
                                                    <td 
                                                        key={`${date}-${col.key}`}
                                                        onMouseEnter={() => setHoveredCol(cIdx)}
                                                        className={`px-2 py-2 border border-[#dcebdc] dark:border-zinc-700/50 text-sm font-medium transition-colors text-red-500
                                                        ${hoveredCol === cIdx ? 'bg-[#f6fbf6] dark:bg-zinc-800' : 'bg-white dark:bg-zinc-950'}`}
                                                    >
                                                        {formatVal(val)}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>

                            {/* --- FOOTER: SUMMARY CALCULATIONS --- */}
                            {filteredDates.length > 0 && (
                                <tfoot className="bg-[#f4f5f5] dark:bg-zinc-900 font-bold text-sm">
                                    
                                    {/* SPACER ROW FOR VISUAL SEPARATION */}
                                    <tr className="bg-white dark:bg-zinc-950 border-none">
                                        <td colSpan={flatColumns.length + 1} className="border-none border-transparent py-2"></td>
                                    </tr>

                                    <tr className="hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                                        <td 
                                            onMouseEnter={() => setHoveredCol(0)}
                                            className={`px-4 py-3 border border-[#dcebdc] dark:border-zinc-700 sticky left-0 bg-[#f4f5f5] dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs transition-colors ${hoveredCol === 0 ? 'brightness-95 dark:brightness-125' : ''}`}
                                        >
                                            TOTAL ISSUED
                                        </td>
                                        
                                        {flatColumns.map((col, idx) => {
                                            const cIdx = idx + 1;
                                            const val = currentTotals[col.key];

                                            return (
                                                <td 
                                                    key={`total-${col.key}`}
                                                    onMouseEnter={() => setHoveredCol(cIdx)}
                                                    className={`px-2 py-3 border border-[#dcebdc] dark:border-zinc-700 transition-colors text-red-600
                                                    ${hoveredCol === cIdx ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-[#f4f5f5] dark:bg-zinc-900'}`}
                                                >
                                                    {formatVal(val)}
                                                </td>
                                            )
                                        })}
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