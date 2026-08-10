import React, { useState, useEffect } from 'react';
import { Search, FileSpreadsheet, RefreshCw, AlertCircle, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; // Ensure this path matches your project
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Define structure and aesthetic color themes
const teaCategories = [
    { id: 'athukorala', title: 'Athukorala', colorTheme: 'green', sizes: ['400g', '200g', '100g'] },
    { id: 'bopfSp', title: 'BOPF Sp.', colorTheme: 'blue', sizes: ['400g', '200g'] },
    { id: 'bopfPremium', title: 'BOPF Premium', colorTheme: 'purple', sizes: ['400g', '200g'] },
    { id: 'tb', title: 'T/B', colorTheme: 'orange', sizes: ['100', '25'] },
    { id: 'pitigala', title: 'PITIGALA TEA', colorTheme: 'teal', sizes: ['400g', '200g'] },
    { id: 'gt', title: 'G/T', colorTheme: 'rose', sizes: ['200g', 'T/B 25'] },
    { id: 'dusts', title: 'Other Grades', colorTheme: 'gray', sizes: ['DUST', 'DUST 1', 'BOPF'] }
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

        // 3. Process Issue Type Data (mapped by date to support filtering)
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
            // Daily IN/OUT Totals
            if (dailyDataMap[date]) {
                Object.entries(dailyDataMap[date]).forEach(([key, values]) => {
                    t.out[key] = (t.out[key] || 0) + (values.out || 0);
                    t.in[key] = (t.in[key] || 0) + (values.in || 0);
                });
            }
            // Issue Totals
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
    const formatVal = (val) => (val && val > 0) ? val : '';
    const getMonthName = () => {
        if (!month) return "";
        const [y, m] = month.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'long' }).toUpperCase();
    };
    
    // Convert "2026-08-01" to "8/01"
    const formatShortDate = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${Number(parts[1])}/${parts[2]}`;
        }
        return dateStr;
    };

    // --- EXPORT PDF LOGIC ---
    const getPdfThemeColor = (theme) => {
        const colors = {
            green: [22, 101, 52],
            blue: [30, 64, 175],
            purple: [107, 33, 168],
            orange: [154, 52, 18],
            teal: [17, 94, 89],
            rose: [159, 18, 57],
            gray: [75, 85, 99],
        };
        return colors[theme] || colors.gray;
    };

    const getPdfHeaders = () => {
        // Row 1: DATE (spans 3 rows downwards) & CATEGORIES (spans columns)
        const row1 = [{
            content: 'DATE',
            rowSpan: 3,
            styles: { halign: 'center', valign: 'middle', fillColor: [243, 244, 246], textColor: [55, 65, 81] }
        }];

        const row2 = []; // Row 2: SIZES (400g, 200g)
        const row3 = []; // Row 3: OUT / IN

        teaCategories.forEach(cat => {
            // Level 1: Category Name
            row1.push({
                content: cat.title.toUpperCase(),
                colSpan: cat.sizes.length * 2,
                styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: getPdfThemeColor(cat.colorTheme), fontStyle: 'bold' }
            });

            cat.sizes.forEach(size => {
                // Level 2: Size
                row2.push({
                    content: size,
                    colSpan: 2,
                    styles: { halign: 'center', valign: 'middle', fillColor: [249, 250, 251], textColor: [75, 85, 99], fontStyle: 'bold' }
                });

                // Level 3: OUT and IN
                row3.push({ content: 'OUT', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [107, 114, 128] } });
                row3.push({ content: 'IN', styles: { halign: 'center', fillColor: [254, 252, 232], textColor: [217, 119, 6] } });
            });
        });

        return [row1, row2, row3]; // Returns a 2D Array for jsPDF-autotable
    };

    const getPdfData = () => {
        const data = filteredDates.map(date => {
            const row = [{ content: formatShortDate(date), styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }];
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    const key = `${cat.id}_${size}`;
                    row.push({ content: formatVal(dailyDataMap[date]?.[key]?.out) || '-', styles: { textColor: [55, 65, 81] } });
                    row.push({ content: formatVal(dailyDataMap[date]?.[key]?.in) || '-', styles: { textColor: [180, 83, 9] } });
                });
            });
            return row;
        });

        // Helper for generating total rows
        const createFooterRow = (title, type, color, textColor = [17, 24, 39]) => {
            const row = [{ content: title, styles: { fontStyle: 'bold', fillColor: color, textColor: textColor, halign: 'left' } }];
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    const key = `${cat.id}_${size}`;
                    if (type === 'netSale') {
                        const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                        row.push({ content: formatVal(net) || '0', styles: { fontStyle: 'bold', fillColor: color, textColor: [220, 38, 38] } }); // OUT
                        row.push({ content: "", styles: { fillColor: color } }); // IN
                    } else if (type === 'transferIn') {
                        row.push({ content: "", styles: { fillColor: color } }); // OUT
                        row.push({ content: formatVal(currentTotals.in[key]) || '0', styles: { fontStyle: 'bold', fillColor: color, textColor } }); // IN
                    } else {
                        row.push({ content: formatVal(currentTotals[type][key]) || '0', styles: { fontStyle: 'bold', fillColor: color, textColor } }); // OUT
                        row.push({ content: "", styles: { fillColor: color } }); // IN
                    }
                });
            });
            row.isFooter = true; // Flag for your PDFDownloader parser
            return row;
        };

        data.push(createFooterRow("TOTAL ISSUED", "out", [224, 231, 255], [30, 58, 138])); // Indigo
        data.push(createFooterRow("FREE ISSUED", "free", [255, 237, 213], [154, 52, 18])); // Orange
        data.push(createFooterRow("LABOUR ISS.", "labour", [255, 237, 213], [154, 52, 18]));
        data.push(createFooterRow("STAFF ISS.", "staff", [255, 237, 213], [154, 52, 18]));
        data.push(createFooterRow("NET SALE", "netSale", [254, 226, 226])); // Red
        data.push(createFooterRow("TRANSFER IN", "transferIn", [254, 243, 199], [146, 64, 14])); // Amber

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
                catRow.getCell(colIndex).value = cat.title;
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
            worksheet.mergeCells('A2:A4'); // Merge DATE column

            // Style Headers
            [catRow, sizeRow, outInRow].forEach(row => {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                    cell.font = { bold: true, color: { argb: 'FF374151' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
                });
            });

            // Data Rows
            filteredDates.forEach(date => {
                const rowData = [formatShortDate(date)];
                teaCategories.forEach(cat => {
                    cat.sizes.forEach(size => {
                        const key = `${cat.id}_${size}`;
                        const outVal = dailyDataMap[date]?.[key]?.out;
                        const inVal = dailyDataMap[date]?.[key]?.in;
                        rowData.push(outVal && outVal > 0 ? Number(outVal) : '');
                        rowData.push(inVal && inVal > 0 ? Number(inVal) : '');
                    });
                });
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFF3F4F6' } } };
                });
                dataRow.getCell(1).font = { bold: true, color: { argb: 'FF4B5563' } };
            });

            // Helper for Footer Rows
            const addFooterRow = (title, type, bgColor) => {
                const rowData = [title];
                teaCategories.forEach(cat => {
                    cat.sizes.forEach(size => {
                        const key = `${cat.id}_${size}`;
                        if (type === 'netSale') {
                            const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                            rowData.push(net && net > 0 ? Number(net) : 0); // OUT
                            rowData.push(''); // IN
                        } else if (type === 'transferIn') {
                            rowData.push(''); // OUT
                            const inVal = currentTotals.in[key];
                            rowData.push(inVal && inVal > 0 ? Number(inVal) : 0); // IN
                        } else {
                            const outVal = currentTotals[type][key];
                            rowData.push(outVal && outVal > 0 ? Number(outVal) : 0); // OUT
                            rowData.push(''); // IN
                        }
                    });
                });
                const ftRow = worksheet.addRow(rowData);
                ftRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'medium', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
                });
                if (type === 'netSale') ftRow.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red text for net sale
            };

            addFooterRow("TOTAL ISSUED", "out", "FFE0E7FF"); // Blue-100
            addFooterRow("FREE ISSUED", "free", "FFFFEDD5"); // Orange-100
            addFooterRow("LABOUR ISS.", "labour", "FFFFEDD5");
            addFooterRow("STAFF ISS.", "staff", "FFFFEDD5");
            addFooterRow("NET SALE", "netSale", "FFFEE2E2"); // Red-100
            addFooterRow("TRANSFER IN", "transferIn", "FFFEF3C7"); // Amber-100

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
                            orientation="landscape" // Must be landscape!
                            disabled={isLoading || filteredDates.length === 0}
                            autoTableOptions={{
                                theme: 'grid',
                                styles: {
                                    fontSize: 5,        // Super small font to fit wide tables
                                    cellPadding: 0.8,   // Minimal padding to save space
                                    lineWidth: 0.1,
                                    lineColor: [229, 231, 235]
                                },
                                headStyles: {
                                    minCellHeight: 12   // Gives headers breathing room
                                },
                                columnStyles: {
                                    0: { cellWidth: 14 } // Lock the Date column width
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
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
                {filteredDates.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No records found for this month.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar pb-2 max-h-[70vh]">
                        <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1200px]">

                            {/* --- TABLE HEADERS --- */}
                            <thead className="sticky top-0 z-20 shadow-sm">

                                {/* Level 1: Categories */}
                                <tr>
                                    <th rowSpan={3} className="px-4 py-3 align-middle bg-gray-50 dark:bg-zinc-800 border-b border-r border-gray-200 dark:border-zinc-700 sticky left-0 z-30 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    {teaCategories.map((cat, idx) => (
                                        <th key={idx} colSpan={cat.sizes.length * 2} className={`px-4 py-2 border-r border-b border-gray-200 dark:border-zinc-700 text-[11px] font-bold uppercase tracking-wider ${getHeaderTheme(cat.colorTheme)}`}>
                                            {cat.title}
                                        </th>
                                    ))}
                                </tr>

                                {/* Level 2: Sizes */}
                                <tr className="bg-gray-50/80 dark:bg-zinc-900">
                                    {teaCategories.map(cat => (
                                        cat.sizes.map((size, sIdx) => (
                                            <th key={`${cat.id}-${sIdx}`} colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-r border-gray-100 dark:border-zinc-800">
                                                {size}
                                            </th>
                                        ))
                                    ))}
                                </tr>

                                {/* Level 3: OUT / IN */}
                                <tr className="bg-white dark:bg-zinc-900/90 border-b-2 border-gray-200 dark:border-zinc-700">
                                    {teaCategories.map(cat => (
                                        cat.sizes.map((size, sIdx) => (
                                            <React.Fragment key={`outin-${cat.id}-${sIdx}`}>
                                                <th className="border-r border-gray-100 dark:border-zinc-800 p-1.5 text-[10px] font-bold text-gray-500 uppercase">OUT</th>
                                                <th className="border-r border-gray-200 dark:border-zinc-700 p-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-900/10 uppercase">IN</th>
                                            </React.Fragment>
                                        ))
                                    ))}
                                </tr>
                            </thead>

                            {/* --- TABLE BODY --- */}
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                                {filteredDates.map((date) => {
                                    const isSunday = new Date(date).getDay() === 0;

                                    return (
                                        <tr key={date} className={`hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 transition-colors ${isSunday ? 'bg-blue-50/30 dark:bg-blue-900/10 font-medium' : 'bg-white dark:bg-zinc-900'}`}>
                                            <td className={`px-4 py-2 border-r border-gray-100 dark:border-zinc-800 sticky left-0 z-10 text-sm font-semibold ${isSunday ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300'}`}>
                                                {formatShortDate(date)}
                                            </td>

                                            {teaCategories.map(cat => (
                                                cat.sizes.map((size) => {
                                                    const key = `${cat.id}_${size}`;
                                                    const dayData = dailyDataMap[date]?.[key] || {};

                                                    return (
                                                        <React.Fragment key={`${date}-${key}`}>
                                                            <td className="px-2 py-2 border-r border-gray-50 dark:border-zinc-800/50 text-sm text-gray-700 dark:text-gray-300">
                                                                {formatVal(dayData.out)}
                                                            </td>
                                                            <td className="px-2 py-2 border-r border-gray-100 dark:border-zinc-700 text-sm font-medium text-amber-700 dark:text-amber-500 bg-amber-50/30 dark:bg-amber-900/5">
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
                            {filteredDates.length > 0 && (
                                <tfoot className="border-t-2 border-gray-300 dark:border-zinc-600 font-bold bg-blue-50/50 dark:bg-zinc-800/50 text-sm">

                                    {/* Total Issued */}
                                    <tr className="border-b border-gray-200 dark:border-zinc-700/50">
                                        <td className="px-4 py-2.5 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-blue-100/50 dark:bg-zinc-800 z-10 uppercase text-blue-900 dark:text-blue-300 text-left text-xs">Total Issued</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                return (
                                                    <React.Fragment key={`totissued-${key}`}>
                                                        <td className="px-2 py-2.5 border-r border-gray-200 dark:border-zinc-700 bg-blue-100/30 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200">{formatVal(currentTotals.out[key])}</td>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"></td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Free Issued */}
                                    <tr className="border-b border-gray-200 dark:border-zinc-700/50 bg-orange-50/30 dark:bg-orange-900/10">
                                        <td className="px-4 py-2 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-orange-50/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs text-left">Free Issu.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                return (
                                                    <React.Fragment key={`free-${key}`}>
                                                        <td className="px-2 py-2 border-r border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">{formatVal(currentTotals.free[key])}</td>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"></td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Labor Issued */}
                                    <tr className="border-b border-gray-200 dark:border-zinc-700/50 bg-orange-50/30 dark:bg-orange-900/10">
                                        <td className="px-4 py-2 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-orange-50/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs text-left">Labor Iss.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                return (
                                                    <React.Fragment key={`labor-${key}`}>
                                                        <td className="px-2 py-2 border-r border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">{formatVal(currentTotals.labour[key])}</td>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"></td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Staff Issued */}
                                    <tr className="border-b border-gray-300 dark:border-zinc-600 bg-orange-50/30 dark:bg-orange-900/10">
                                        <td className="px-4 py-2 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-orange-50/50 dark:bg-zinc-800 z-10 text-gray-600 dark:text-gray-400 uppercase text-xs text-left">Staff Iss.</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                return (
                                                    <React.Fragment key={`staff-${key}`}>
                                                        <td className="px-2 py-2 border-r border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">{formatVal(currentTotals.staff[key])}</td>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"></td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Net Sale */}
                                    <tr className="border-b border-gray-200 dark:border-zinc-700/50 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                        <td className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-red-50 dark:bg-red-900/30 z-10 uppercase text-xs text-left">Net Sale</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                const netSale = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                                                return (
                                                    <React.Fragment key={`netsale-${key}`}>
                                                        <td className="px-2 py-3 border-r border-gray-200 dark:border-zinc-700 font-black">{formatVal(netSale)}</td>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"></td>
                                                    </React.Fragment>
                                                )
                                            })
                                        ))}
                                    </tr>

                                    {/* Transfer IN */}
                                    <tr className="bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                                        <td className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 sticky left-0 bg-amber-100/50 dark:bg-amber-900/30 z-10 uppercase text-xs text-left">Transfer In</td>
                                        {teaCategories.map(cat => (
                                            cat.sizes.map((size) => {
                                                const key = `${cat.id}_${size}`;
                                                return (
                                                    <React.Fragment key={`transin-${key}`}>
                                                        <td className="border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"></td>
                                                        <td className="px-2 py-3 border-r border-gray-200 dark:border-zinc-700 font-black">{formatVal(currentTotals.in[key])}</td>
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