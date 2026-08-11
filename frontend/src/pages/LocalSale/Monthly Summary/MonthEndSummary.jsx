import React, { useState, useEffect } from 'react';
import { Search, FileSpreadsheet, RefreshCw, AlertCircle, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Define structure
const teaCategories = [
    { id: 'athukorala', title: 'Athukorala', sizes: ['400g', '200g', '100g'] },
    { id: 'bopfSp', title: 'BOPF Sp.', sizes: ['400g', '200g'] },
    { id: 'bopfPremium', title: 'BOPF Premium', sizes: ['400g', '200g'] },
    { id: 'tb', title: 'T/B', sizes: ['100', '25'] },
    { id: 'pitigala', title: 'PITIGALA TEA', sizes: ['400g', '200g'] },
    { id: 'gt', title: 'G/T', sizes: ['200g', 'T/B 25'] },
    { id: 'dusts', title: 'Other Grades', sizes: ['DUST', 'DUST 1', 'BOPF'] }
];

export default function MonthEndSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // States for raw data
    const [datesOfMonth, setDatesOfMonth] = useState([]);
    const [dailyDataMap, setDailyDataMap] = useState({});
    const [issueDataMap, setIssueDataMap] = useState({ free: {}, labour: {}, staff: {} });

    const fetchMonthEndData = async () => {
        if (!month) return;
        setIsLoading(true);

        try {
            const [dailyRes, issueRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/summary?month=${month}`),
                fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`)
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

        // 2. Process Daily Data
        const dailyMap = {};
        dates.forEach(d => dailyMap[d] = {});

        dailyRecords.forEach(record => {
            const date = record.date;
            if (!dailyMap[date]) dailyMap[date] = {};
            record.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                dailyMap[date][key] = {
                    out: (dailyMap[date][key]?.out || 0) + (Number(item.out) || 0),
                    in: (dailyMap[date][key]?.in || 0) + (Number(item.in) || 0)
                };
            });
        });

        // 3. Process Issue Type Data 
        const issueMap = { free: {}, labour: {}, staff: {} };
        issueRecords.forEach(record => {
            const date = record.date;
            let targetMap;
            if (record.issueType === 'Free issued') targetMap = issueMap.free;
            else if (record.issueType === 'Labour issued') targetMap = issueMap.labour;
            else if (record.issueType === 'Staff issued') targetMap = issueMap.staff;

            if (targetMap) {
                if (!targetMap[date]) targetMap[date] = {};
                record.items?.forEach(item => {
                    const key = `${item.categoryId}_${item.size}`;
                    targetMap[date][key] = (targetMap[date][key] || 0) + (Number(item.out) || 0);
                });
            }
        });

        setDailyDataMap(dailyMap);
        setIssueDataMap(issueMap);
    };

    useEffect(() => {
        fetchMonthEndData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    // --- FILTERING & DYNAMIC TOTALS ---
    const filteredDates = datesOfMonth.filter(date =>
        !searchQuery || date.replace(/-/g, '.').includes(searchQuery)
    );

    const calculateTotals = () => {
        const t = { out: {}, in: {}, free: {}, labour: {}, staff: {} };

        filteredDates.forEach(date => {
            if (dailyDataMap[date]) {
                Object.entries(dailyDataMap[date]).forEach(([key, values]) => {
                    t.out[key] = (t.out[key] || 0) + (values.out || 0);
                    t.in[key] = (t.in[key] || 0) + (values.in || 0);
                });
            }
            ['free', 'labour', 'staff'].forEach(type => {
                if (issueDataMap[type][date]) {
                    Object.entries(issueDataMap[type][date]).forEach(([key, val]) => {
                        t[type][key] = (t[type][key] || 0) + (val || 0);
                    });
                }
            });
        });
        return t;
    };

    const currentTotals = calculateTotals();

    // --- UTILS ---
    const clearFilters = () => setSearchQuery('');
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

    // --- EXPORT PDF LOGIC ---
    const getPdfHeaders = () => {
        const row1 = [{
            content: 'DATE',
            rowSpan: 3,
            styles: { halign: 'center', valign: 'middle', fillColor: [235, 245, 237], textColor: [55, 65, 81] }
        }];

        const row2 = []; 
        const row3 = []; 

        teaCategories.forEach(cat => {
            row1.push({
                content: cat.title.toUpperCase(),
                colSpan: cat.sizes.length * 2,
                styles: { halign: 'center', valign: 'middle', fillColor: [235, 245, 237], textColor: [17, 24, 39], fontStyle: 'bold' }
            });

            cat.sizes.forEach(size => {
                row2.push({
                    content: size,
                    colSpan: 2,
                    styles: { halign: 'center', valign: 'middle', fillColor: [235, 245, 237], textColor: [17, 24, 39], fontStyle: 'bold' }
                });
                row3.push({ content: 'OUT', styles: { halign: 'center', fillColor: [235, 245, 237], textColor: [239, 68, 68] } });
                row3.push({ content: 'IN', styles: { halign: 'center', fillColor: [235, 245, 237], textColor: [34, 197, 94] } });
            });
        });

        return [row1, row2, row3]; 
    };

    const getPdfData = () => {
        const data = filteredDates.map(date => {
            const row = [{ content: formatShortDate(date), styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }];
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    const key = `${cat.id}_${size}`;
                    const outVal = dailyDataMap[date]?.[key]?.out;
                    const inVal = dailyDataMap[date]?.[key]?.in;
                    row.push({ content: (outVal && outVal > 0) ? outVal : '-', styles: { textColor: [239, 68, 68] } });
                    row.push({ content: (inVal && inVal > 0) ? inVal : '-', styles: { textColor: [34, 197, 94] } });
                });
            });
            return row;
        });

        const createFooterRow = (title, type, color, isNetSale = false, isTransIn = false) => {
            const row = [{ content: title, styles: { fontStyle: 'bold', fillColor: color, textColor: [17, 24, 39], halign: 'center' } }];
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    const key = `${cat.id}_${size}`;
                    if (isNetSale) {
                        const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                        row.push({ content: (net && net > 0) ? net : '-', styles: { fontStyle: 'bold', fillColor: color, textColor: [239, 68, 68] } }); // OUT
                        row.push({ content: "-", styles: { fillColor: color, textColor: [34, 197, 94] } }); // IN
                    } else if (isTransIn) {
                        row.push({ content: "-", styles: { fillColor: color, textColor: [239, 68, 68] } }); // OUT
                        const inVal = currentTotals.in[key];
                        row.push({ content: (inVal && inVal > 0) ? inVal : '-', styles: { fontStyle: 'bold', fillColor: color, textColor: [34, 197, 94] } }); // IN
                    } else {
                        const outVal = currentTotals[type][key];
                        row.push({ content: (outVal && outVal > 0) ? outVal : '-', styles: { fontStyle: 'bold', fillColor: color, textColor: [239, 68, 68] } }); // OUT
                        row.push({ content: "-", styles: { fillColor: color, textColor: [34, 197, 94] } }); // IN
                    }
                });
            });
            row.isFooter = true; 
            return row;
        };

        data.push(createFooterRow("TOTAL ISSUED", "out", [249, 250, 251])); 
        data.push(createFooterRow("FREE ISSUED", "free", [249, 250, 251])); 
        data.push(createFooterRow("LABOUR ISS.", "labour", [249, 250, 251]));
        data.push(createFooterRow("STAFF ISS.", "staff", [249, 250, 251]));
        data.push(createFooterRow("NET SALE", "netSale", [249, 250, 251], true, false)); 
        data.push(createFooterRow("TRANSFER IN", "transferIn", [249, 250, 251], false, true)); 

        return data;
    };

    // --- EXPORT EXCEL LOGIC ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Month End Summary');

            let totalCols = 1;
            teaCategories.forEach(cat => totalCols += (cat.sizes.length * 2));

            // Title
            const titleRow = worksheet.addRow([`MONTH END SUMMARY - ${getMonthName()}`]);
            worksheet.mergeCells(1, 1, 1, totalCols);
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBFBEE' } };
            titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF166534' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;

            // Category Headers
            const catRow = worksheet.addRow(['DATE']);
            let colIndex = 2;
            teaCategories.forEach(cat => {
                catRow.getCell(colIndex).value = cat.title.toUpperCase();
                const span = cat.sizes.length * 2;
                if (span > 1) worksheet.mergeCells(2, colIndex, 2, colIndex + span - 1);
                colIndex += span;
            });

            // Size Headers
            const sizeRow = worksheet.addRow(['']);
            colIndex = 2;
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    sizeRow.getCell(colIndex).value = size;
                    worksheet.mergeCells(3, colIndex, 3, colIndex + 1);
                    colIndex += 2;
                });
            });

            // OUT/IN Headers
            const outInRow = worksheet.addRow(['']);
            colIndex = 2;
            teaCategories.forEach(cat => {
                cat.sizes.forEach(() => {
                    outInRow.getCell(colIndex).value = 'OUT';
                    outInRow.getCell(colIndex + 1).value = 'IN';
                    colIndex += 2;
                });
            });
            worksheet.mergeCells('A2:A4'); 

            // Style Headers
            [catRow, sizeRow, outInRow].forEach(row => {
                row.eachCell((cell, cIdx) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5ED' } };
                    
                    if(row === outInRow && cIdx > 1) {
                        cell.font = { bold: true, color: { argb: cell.value === 'OUT' ? 'FFEF4444' : 'FF22C55E' } };
                    } else {
                        cell.font = { bold: true, color: { argb: 'FF111827' } };
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFD5E8D8' } }, bottom: { style: 'thin', color: { argb: 'FFD5E8D8' } }, left: { style: 'thin', color: { argb: 'FFD5E8D8' } }, right: { style: 'thin', color: { argb: 'FFD5E8D8' } } };
                });
            });

            // Data Rows
            filteredDates.forEach(date => {
                const rowData = [date];
                teaCategories.forEach(cat => {
                    cat.sizes.forEach(size => {
                        const key = `${cat.id}_${size}`;
                        const outVal = dailyDataMap[date]?.[key]?.out;
                        const inVal = dailyDataMap[date]?.[key]?.in;
                        rowData.push(outVal && outVal > 0 ? Number(outVal) : '-');
                        rowData.push(inVal && inVal > 0 ? Number(inVal) : '-');
                    });
                });
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, cIdx) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
                    if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                    else if (cIdx % 2 === 0) cell.font = { color: { argb: 'FFEF4444' } }; // OUT
                    else cell.font = { color: { argb: 'FF22C55E' } }; // IN
                });
            });

            // Helper for Footer Rows
            const addFooterRow = (title, type, isNetSale = false, isTransIn = false) => {
                const rowData = [title];
                teaCategories.forEach(cat => {
                    cat.sizes.forEach(size => {
                        const key = `${cat.id}_${size}`;
                        if (isNetSale) {
                            const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                            rowData.push(net && net > 0 ? Number(net) : '-'); 
                            rowData.push('-'); 
                        } else if (isTransIn) {
                            rowData.push('-'); 
                            const inVal = currentTotals.in[key];
                            rowData.push(inVal && inVal > 0 ? Number(inVal) : '-'); 
                        } else {
                            const outVal = currentTotals[type][key];
                            rowData.push(outVal && outVal > 0 ? Number(outVal) : '-'); 
                            rowData.push('-'); 
                        }
                    });
                });
                const ftRow = worksheet.addRow(rowData);
                ftRow.eachCell((cell, cIdx) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
                    if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                    else if (cIdx % 2 === 0) cell.font = { bold: true, color: { argb: 'FFDC2626' } }; // OUT
                    else cell.font = { bold: true, color: { argb: 'FF16A34A' } }; // IN
                });
            };

            addFooterRow("TOTAL ISSUED", "out"); 
            addFooterRow("FREE ISSUED", "free"); 
            addFooterRow("LABOUR ISS.", "labour");
            addFooterRow("STAFF ISS.", "staff");
            addFooterRow("NET SALE", "netSale", true, false); 
            addFooterRow("TRANSFER IN", "transferIn", false, true); 

            worksheet.getColumn(1).width = 15;
            for (let i = 2; i <= totalCols; i++) worksheet.getColumn(i).width = 8;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Month_End_Summary_${getMonthName()}.xlsx`);
            toast.success("Excel summary downloaded!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download Excel file.");
        }
    };

    const uniqueCode = `MONTH-END/${getMonthName()}/${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1500px] mx-auto font-sans bg-slate-50 dark:bg-zinc-950 min-h-screen transition-colors duration-300">

            {/* HEADER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                        <FileSpreadsheet size={26} className="text-indigo-600 dark:text-indigo-400" /> Month End Summary
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Consolidated view of Daily Summaries and Issue Deductions</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button]:border [&>button]:border-blue-200 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-semibold [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:text-sm hover:[&>button]:bg-blue-100 dark:[&>button]:bg-blue-900/20 dark:[&>button]:border-blue-800/50 dark:hover:[&>button]:bg-blue-900/40 transition-colors">
                        <PDFDownloader
                            title={`MONTH END SUMMARY - ${getMonthName()}`}
                            subtitle={searchQuery ? `Filtered by Date: ${searchQuery}` : `Complete Monthly Report`}
                            headers={getPdfHeaders()}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Month_End_Summary_${getMonthName()}.pdf`}
                            orientation="landscape" 
                            disabled={isLoading || filteredDates.length === 0}
                            autoTableOptions={{
                                theme: 'grid',
                                styles: {
                                    fontSize: 5,        
                                    cellPadding: 1,   
                                    lineWidth: 0.1,
                                    lineColor: [213, 232, 216]
                                },
                                headStyles: {
                                    minCellHeight: 12   
                                },
                                columnStyles: {
                                    0: { cellWidth: 16 } 
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
                        onClick={fetchMonthEndData}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700 dark:hover:bg-zinc-700 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-indigo-600" : "text-indigo-600"} /> Sync Data
                    </button>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-wrap gap-6 items-end">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all"
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
                            className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all"
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

            {/* MASSIVE TABLE WRAPPER */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 overflow-hidden">
                {filteredDates.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No records found for this month.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar max-h-[70vh]">
                        <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1200px]">

                            {/* --- TABLE HEADERS --- */}
                            <thead className="sticky top-0 z-20 shadow-sm bg-[#ebf5ed] dark:bg-green-900/30 text-gray-800 dark:text-gray-200">

                                {/* Level 1: Categories */}
                                <tr>
                                    <th rowSpan={3} className="px-4 py-3 align-middle border border-[#d5e8d8] dark:border-green-800/50 sticky left-0 z-30 text-xs font-bold uppercase tracking-wider bg-[#ebf5ed] dark:bg-green-900">
                                        Date
                                    </th>
                                    {teaCategories.map((cat, idx) => (
                                        <th key={idx} colSpan={cat.sizes.length * 2} className="px-4 py-2 border border-[#d5e8d8] dark:border-green-800/50 text-[11px] font-bold uppercase tracking-wider">
                                            {cat.title}
                                        </th>
                                    ))}
                                </tr>

                                {/* Level 2: Sizes */}
                                <tr>
                                    {teaCategories.map(cat => (
                                        cat.sizes.map((size, sIdx) => (
                                            <th key={`${cat.id}-${sIdx}`} colSpan={2} className="px-3 py-1.5 text-[11px] font-bold border border-[#d5e8d8] dark:border-green-800/50">
                                                {size}
                                            </th>
                                        ))
                                    ))}
                                </tr>

                                {/* Level 3: OUT / IN */}
                                <tr>
                                    {teaCategories.map(cat => (
                                        cat.sizes.map((size, sIdx) => (
                                            <React.Fragment key={`outin-${cat.id}-${sIdx}`}>
                                                <th className="border border-[#d5e8d8] dark:border-green-800/50 p-1.5 text-[10px] font-bold text-red-500 uppercase">OUT</th>
                                                <th className="border border-[#d5e8d8] dark:border-green-800/50 p-1.5 text-[10px] font-bold text-green-600 uppercase">IN</th>
                                            </React.Fragment>
                                        ))
                                    ))}
                                </tr>
                            </thead>

                            {/* --- TABLE BODY --- */}
                            <tbody className="bg-white dark:bg-zinc-950">
                                {filteredDates.map((date) => {
                                    return (
                                        <tr key={date} className="hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                                            <td className="px-4 py-2 border border-gray-200 dark:border-zinc-700 sticky left-0 z-10 text-sm font-bold bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-200">
                                                {formatShortDate(date)}
                                            </td>

                                            {teaCategories.map(cat => (
                                                cat.sizes.map((size) => {
                                                    const key = `${cat.id}_${size}`;
                                                    const dayData = dailyDataMap[date]?.[key] || {};

                                                    return (
                                                        <React.Fragment key={`${date}-${key}`}>
                                                            <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-sm text-red-500 font-medium">
                                                                {dayData.out && Number(dayData.out) > 0 ? Number(dayData.out) : '-'}
                                                            </td>
                                                            <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-sm font-medium text-green-600">
                                                                {dayData.in && Number(dayData.in) > 0 ? Number(dayData.in) : '-'}
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
                            {filteredDates.length > 0 && (
                                <tfoot className="bg-gray-50 dark:bg-zinc-900 font-bold text-sm">

                                    {/* Total Issued */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Total Issued</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const valOut = currentTotals.out[key];
                                                return (
                                                    <React.Fragment key={`totissued-${key}`}>
                                                        <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-red-600">{valOut && Number(valOut) > 0 ? Number(valOut) : '-'}</td>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-green-600">-</td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Free Issued */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Free Issu.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const valOut = currentTotals.free[key];
                                                return (
                                                    <React.Fragment key={`free-${key}`}>
                                                        <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-red-600">{valOut && Number(valOut) > 0 ? Number(valOut) : '-'}</td>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-green-600">-</td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Labor Issued */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Labor Iss.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const valOut = currentTotals.labour[key];
                                                return (
                                                    <React.Fragment key={`labor-${key}`}>
                                                        <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-red-600">{valOut && Number(valOut) > 0 ? Number(valOut) : '-'}</td>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-green-600">-</td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Staff Issued */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Staff Iss.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const valOut = currentTotals.staff[key];
                                                return (
                                                    <React.Fragment key={`staff-${key}`}>
                                                        <td className="px-2 py-2 border border-gray-200 dark:border-zinc-700 text-red-600">{valOut && Number(valOut) > 0 ? Number(valOut) : '-'}</td>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-green-600">-</td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Net Sale */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Net Sale</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const netSale = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                                                return (
                                                    <React.Fragment key={`netsale-${key}`}>
                                                        <td className="px-2 py-3 border border-gray-200 dark:border-zinc-700 text-red-600">{netSale && netSale > 0 ? Number(netSale) : '-'}</td>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-green-600">-</td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Transfer IN */}
                                    <tr>
                                        <td className="px-4 py-3 border border-gray-200 dark:border-zinc-700 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs">Transfer In</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const valIn = currentTotals.in[key];
                                                return (
                                                    <React.Fragment key={`transin-${key}`}>
                                                        <td className="border border-gray-200 dark:border-zinc-700 text-red-600">-</td>
                                                        <td className="px-2 py-3 border border-gray-200 dark:border-zinc-700 text-green-600">{valIn && Number(valIn) > 0 ? Number(valIn) : '-'}</td>
                                                    </React.Fragment>
                                                )
                                            })
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