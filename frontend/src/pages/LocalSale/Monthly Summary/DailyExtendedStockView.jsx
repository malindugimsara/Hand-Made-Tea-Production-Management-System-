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
    { id: 'others', title: 'Other Grades', sizes: ['BOPF', 'DUST', 'DUST 1'] } // Adjusted sizes for others
];

export default function MonthEndSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredCol, setHoveredCol] = useState(null); 

    // States for raw data
    const [datesOfMonth, setDatesOfMonth] = useState([]);
    const [dailyDataMap, setDailyDataMap] = useState({});
    const [issueDataMap, setIssueDataMap] = useState({ free: {}, labour: {}, staff: {} });

    const fetchMonthEndData = async () => {
        if (!month) return;
        setIsLoading(true);

        try {
            const token = localStorage.getItem("token");
            const [dailyRes, issueRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/summary?month=${month}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
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

    // 💡 Auto-Correction Key Generator (Highly Strict Normalization - Matched with DailyExtendedStockView)
    const generateKey = (catId, catTitle, size) => {
        let cleanId = (catId || '').toLowerCase().trim();
        let cleanTitle = (catTitle || '').toLowerCase().trim();
        let cleanSize = (size || '').toLowerCase().trim();

        if (!cleanId && cleanTitle) {
            cleanId = cleanTitle; 
        }

        let finalId = catId;
        let finalSize = size;

        // Normalize Category IDs
        if (cleanId === 'g/t' || cleanTitle === 'g/t' || cleanId === 'gt') finalId = 'gt';
        else if (cleanId === 'other grades' || cleanTitle === 'other grades' || cleanId === 'others') finalId = 'others';
        else if (cleanId === 'bopf premium' || cleanId === 'bopfpremium') finalId = 'bopfPremium';
        else if (cleanId === 'bopf sp.' || cleanId === 'bopfsp' || cleanId === 'bopf sp') finalId = 'bopfSp';
        else if (cleanId === 'pitigala tea' || cleanId === 'pitigala') finalId = 'pitigala';
        else if (cleanId === 'athukorala') finalId = 'athukorala';
        else if (cleanId === 't/b' || cleanId === 'tb') finalId = 'tb';

        // Normalize Sizes
        if (cleanSize === 'bopf (kg)' || cleanSize === 'kg' || cleanSize === 'bopf') finalSize = 'BOPF';
        else if (cleanSize === 'dust (kg)' || cleanSize === 'dust') finalSize = 'DUST';
        else if (cleanSize === 'dust 1 (kg)' || cleanSize === 'dust 1') finalSize = 'DUST 1';
        else if (cleanSize === 't/b 25' || cleanSize === 't/b') finalSize = 'T/B 25';
        else if (cleanSize === '25') finalSize = '25';
        else if (cleanSize === '100') finalSize = '100';
        else if (cleanSize === '400g') finalSize = '400g';
        else if (cleanSize === '200g') finalSize = '200g';
        else if (cleanSize === '100g') finalSize = '100g';

        return `${finalId}_${finalSize}`;
    };

    const processReportData = (dailyRecords, issueRecords) => {
        const activeDates = new Set(); 
        const dailyMap = {};
        const issueMap = { free: {}, labour: {}, staff: {} };

        // 1. Process Daily Data
        dailyRecords.forEach(record => {
            const date = record.date ? record.date.split('T')[0] : '';
            if (date && record.items && record.items.length > 0) {
                activeDates.add(date);
                if (!dailyMap[date]) dailyMap[date] = {};
                record.items.forEach(item => {
                    const key = generateKey(item.categoryId, item.categoryTitle, item.size);
                    dailyMap[date][key] = {
                        out: (dailyMap[date][key]?.out || 0) + (Number(item.out) || 0),
                        in: (dailyMap[date][key]?.in || 0) + (Number(item.in) || 0)
                    };
                });
            }
        });

        // 2. Process Issue Type Data 
        issueRecords.forEach(record => {
            const date = record.date ? record.date.split('T')[0] : '';
            if (date && record.items && record.items.length > 0) {
                activeDates.add(date);
                let targetMap;
                if (record.issueType === 'Free issued') targetMap = issueMap.free;
                else if (record.issueType === 'Labour issued') targetMap = issueMap.labour;
                else if (record.issueType === 'Staff issued') targetMap = issueMap.staff;

                if (targetMap) {
                    if (!targetMap[date]) targetMap[date] = {};
                    record.items.forEach(item => {
                        const key = generateKey(item.categoryId, item.categoryTitle, item.size);
                        targetMap[date][key] = (targetMap[date][key] || 0) + (Number(item.out) || 0);
                    });
                }
            }
        });

        // 3. Sort Dates Descending
        const sortedDates = Array.from(activeDates)
            .filter(d => d.startsWith(month))
            .sort((a, b) => new Date(a) - new Date(b));

        setDatesOfMonth(sortedDates);
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

    // Prepare flat columns for easy grid rendering & crosshair math
    const flatColumns = [];
    teaCategories.forEach(cat => {
        cat.sizes.forEach(size => {
            // Use the same normalization for column keys
            const keyParts = generateKey(cat.id, cat.title, size).split('_');
            flatColumns.push({ catId: keyParts[0], size: keyParts[1], type: 'out', originalCatId: cat.id, originalSize: size });
            flatColumns.push({ catId: keyParts[0], size: keyParts[1], type: 'in', originalCatId: cat.id, originalSize: size });
        });
    });

    // --- EXPORT PDF LOGIC ---
    const getPdfHeaders = () => {
        const row1 = [{
            content: 'DATE',
            rowSpan: 3,
            styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39] }
        }];

        const row2 = []; 
        const row3 = []; 

        teaCategories.forEach(cat => {
            row1.push({
                content: cat.title.toUpperCase(),
                colSpan: cat.sizes.length * 2,
                styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39], fontStyle: 'bold' }
            });

            cat.sizes.forEach(size => {
                // Ensure size in PDF header is 'KG' if it's 'BOPF' or 'DUST' under 'Other Grades'
                let displaySize = size;
                if (cat.id === 'others' && (size === 'BOPF' || size.startsWith('DUST'))) {
                    displaySize = 'KG'; // Force display as KG based on previous request context
                }

                row2.push({
                    content: displaySize,
                    colSpan: 2,
                    styles: { halign: 'center', valign: 'middle', fillColor: [234, 245, 236], textColor: [17, 24, 39], fontStyle: 'bold' }
                });
                row3.push({ content: 'OUT', styles: { halign: 'center', fillColor: [234, 245, 236], textColor: [239, 68, 68] } });
                row3.push({ content: 'IN', styles: { halign: 'center', fillColor: [234, 245, 236], textColor: [34, 197, 94] } });
            });
        });

        return [row1, row2, row3]; 
    };

    const getPdfData = () => {
        const data = filteredDates.map(date => {
            const row = [{ content: formatShortDate(date), styles: { fontStyle: 'bold', fillColor: [255, 255, 255] } }];
            flatColumns.forEach(col => {
                const val = dailyDataMap[date]?.[`${col.catId}_${col.size}`]?.[col.type];
                const isOut = col.type === 'out';
                row.push({ 
                    content: (val && Number(val) > 0) ? val : '-', 
                    styles: { textColor: isOut ? [239, 68, 68] : [34, 197, 94] } 
                });
            });
            return row;
        });

        const createFooterRow = (title, type, color, isNetSale = false, isTransIn = false) => {
            const row = [{ content: title, styles: { fontStyle: 'bold', fillColor: color, textColor: [17, 24, 39], halign: 'center' } }];
            flatColumns.forEach(col => {
                const key = `${col.catId}_${col.size}`;
                const isOut = col.type === 'out';

                if (isNetSale) {
                    if(isOut) {
                        const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                        // Make Net Sale negative values red in PDF
                        row.push({ 
                            content: (net && net !== 0) ? net : '-', 
                            styles: { fontStyle: 'bold', fillColor: color, textColor: net < 0 ? [220, 38, 38] : [239, 68, 68] } 
                        }); 
                    } else {
                        row.push({ content: "-", styles: { fillColor: color, textColor: [34, 197, 94] } }); 
                    }
                } else if (isTransIn) {
                    if(isOut) {
                        row.push({ content: "-", styles: { fillColor: color, textColor: [239, 68, 68] } }); 
                    } else {
                        const inVal = currentTotals.in[key];
                        row.push({ content: (inVal && inVal > 0) ? inVal : '-', styles: { fontStyle: 'bold', fillColor: color, textColor: [34, 197, 94] } });
                    }
                } else {
                    if(isOut) {
                        const outVal = currentTotals[type][key];
                        row.push({ content: (outVal && outVal > 0) ? outVal : '-', styles: { fontStyle: 'bold', fillColor: color, textColor: [239, 68, 68] } });
                    } else {
                        row.push({ content: "-", styles: { fillColor: color, textColor: [34, 197, 94] } });
                    }
                }
            });
            row.isFooter = true; 
            return row;
        };

        // Add visual spacer row to PDF
        data.push([{ content: "", colSpan: flatColumns.length + 1, styles: { fillColor: [255, 255, 255], minCellHeight: 6, lineWidth: 0 } }]);
        
        data.push(createFooterRow("TOTAL ISSUED", "out", [244, 245, 245])); 
        data.push(createFooterRow("FREE ISSUED", "free", [244, 245, 245])); 
        data.push(createFooterRow("LABOUR ISS.", "labour", [244, 245, 245]));
        data.push(createFooterRow("STAFF ISS.", "staff", [244, 245, 245]));
        data.push(createFooterRow("NET SALE", "netSale", [244, 245, 245], true, false)); 
        data.push(createFooterRow("TRANSFER IN", "transferIn", [244, 245, 245], false, true)); 

        return data;
    };

    // --- EXPORT EXCEL LOGIC ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Month End Summary');

            let totalCols = 1 + flatColumns.length;

            const titleRow = worksheet.addRow([`MONTH END SUMMARY - ${getMonthName()}`]);
            worksheet.mergeCells(1, 1, 1, totalCols);
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF5EC' } };
            titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF111827' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;

            const catRow = worksheet.addRow(['DATE']);
            let colIndex = 2;
            teaCategories.forEach(cat => {
                catRow.getCell(colIndex).value = cat.title.toUpperCase();
                const span = cat.sizes.length * 2;
                if (span > 1) worksheet.mergeCells(2, colIndex, 2, colIndex + span - 1);
                colIndex += span;
            });

            const sizeRow = worksheet.addRow(['']);
            colIndex = 2;
            teaCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    let displaySize = size;
                    if (cat.id === 'others' && (size === 'BOPF' || size.startsWith('DUST'))) {
                        displaySize = 'KG'; 
                    }
                    sizeRow.getCell(colIndex).value = displaySize;
                    worksheet.mergeCells(3, colIndex, 3, colIndex + 1);
                    colIndex += 2;
                });
            });

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

            [catRow, sizeRow, outInRow].forEach(row => {
                row.eachCell((cell, cIdx) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5ED' } };
                    if(row === outInRow && cIdx > 1) {
                        cell.font = { bold: true, color: { argb: cell.value === 'OUT' ? 'FFEF4444' : 'FF22C55E' } };
                    } else {
                        cell.font = { bold: true, color: { argb: 'FF111827' } };
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                });
            });

            filteredDates.forEach(date => {
                const rowData = [date];
                flatColumns.forEach(col => {
                    const val = dailyDataMap[date]?.[`${col.catId}_${col.size}`]?.[col.type];
                    rowData.push(val && val > 0 ? Number(val) : '-');
                });
                
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, cIdx) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                    if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                    else if (cIdx % 2 === 0) cell.font = { color: { argb: 'FFEF4444' } }; 
                    else cell.font = { color: { argb: 'FF22C55E' } }; 
                });
            });

            // ADD EMPTY SPACER ROW TO EXCEL
            worksheet.addRow([]);

            const addFooterRow = (title, type, isNetSale = false, isTransIn = false) => {
                const rowData = [title];
                flatColumns.forEach(col => {
                    const key = `${col.catId}_${col.size}`;
                    const isOut = col.type === 'out';

                    if (isNetSale) {
                        if(isOut) {
                            const net = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                            rowData.push(net && net !== 0 ? Number(net) : '-'); 
                        } else rowData.push('-'); 
                    } else if (isTransIn) {
                        if(isOut) rowData.push('-'); 
                        else {
                            const inVal = currentTotals.in[key];
                            rowData.push(inVal && inVal > 0 ? Number(inVal) : '-'); 
                        }
                    } else {
                        if(isOut) {
                            const outVal = currentTotals[type][key];
                            rowData.push(outVal && outVal > 0 ? Number(outVal) : '-'); 
                        } else rowData.push('-'); 
                    }
                });
                const ftRow = worksheet.addRow(rowData);
                ftRow.eachCell((cell, cIdx) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5F5' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFDCEBDC' } }, bottom: { style: 'thin', color: { argb: 'FFDCEBDC' } }, right: { style: 'thin', color: { argb: 'FFDCEBDC' } }, left: { style: 'thin', color: { argb: 'FFDCEBDC' } } };
                    if(cIdx === 1) cell.font = { bold: true, color: { argb: 'FF111827' } };
                    else if (cIdx % 2 === 0) {
                        // Make Net Sale negative values red in Excel
                        const isNegative = typeof cell.value === 'number' && cell.value < 0;
                        cell.font = { bold: true, color: { argb: isNegative ? 'FFDC2626' : 'FFEF4444' } }; 
                    }
                    else cell.font = { bold: true, color: { argb: 'FF16A34A' } }; 
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
                    <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2">
                        <FileSpreadsheet size={26} className="text-green-600 dark:text-green-500" /> Month End Summary
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
                                    lineColor: [220, 235, 220]
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
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-green-600" : "text-green-600"} /> Sync Data
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
                        className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all"
                    />
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search by Date</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="e.g. 2026-08-10"
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

            {/* MASSIVE TABLE WRAPPER */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
                {filteredDates.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No records found for this month.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar max-h-[70vh]" onMouseLeave={() => setHoveredCol(null)}>
                        <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1200px]">

                            {/* --- TABLE HEADERS --- */}
                            <thead className="sticky top-0 z-20 shadow-sm bg-[#eaf5ec] dark:bg-green-900/30 text-gray-800 dark:text-gray-200">

                                {/* Level 1: Categories */}
                                <tr>
                                    <th rowSpan={3} className="px-4 py-3 align-middle border border-[#dcebdc] dark:border-green-800/50 sticky left-0 z-30 text-xs font-bold uppercase tracking-wider bg-[#eaf5ec] dark:bg-green-900/80">
                                        Date
                                    </th>
                                    {teaCategories.map((cat, idx) => (
                                        <th key={idx} colSpan={cat.sizes.length * 2} className="px-4 py-2 border border-[#dcebdc] dark:border-green-800/50 text-[11px] font-bold uppercase tracking-wider">
                                            {cat.title}
                                        </th>
                                    ))}
                                </tr>

                                {/* Level 2: Sizes */}
                                <tr>
                                    {teaCategories.map(cat => (
                                        cat.sizes.map((size, sIdx) => {
                                            // Make it show KG for BOPF and DUST in headers
                                            let displaySize = size;
                                            if (cat.id === 'others' && (size === 'BOPF' || size.startsWith('DUST'))) {
                                                displaySize = 'KG';
                                            }
                                            return (
                                                <th key={`${cat.id}-${sIdx}`} colSpan={2} className="px-3 py-1.5 text-[11px] font-bold border border-[#dcebdc] dark:border-green-800/50">
                                                    {displaySize}
                                                </th>
                                            );
                                        })
                                    ))}
                                </tr>

                                {/* Level 3: OUT / IN */}
                                <tr>
                                    {flatColumns.map((col, idx) => {
                                        const isOut = col.type === 'out';
                                        return (
                                            <th key={`outin-${idx}`} className={`border border-[#dcebdc] dark:border-green-800/50 p-1.5 text-[10px] font-bold uppercase ${isOut ? 'text-red-500' : 'text-green-600'}`}>
                                                {isOut ? 'OUT' : 'IN'}
                                            </th>
                                        );
                                    })}
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
                                                const val = dailyDataMap[date]?.[`${col.catId}_${col.size}`]?.[col.type];
                                                const isOut = col.type === 'out';

                                                return (
                                                    <td 
                                                        key={`${date}-${col.catId}-${col.size}-${col.type}`}
                                                        onMouseEnter={() => setHoveredCol(cIdx)}
                                                        className={`px-2 py-2 border border-[#dcebdc] dark:border-zinc-700/50 text-sm font-medium transition-colors
                                                            ${isOut ? 'text-red-700 dark:text-red-400' : 'text-green-800 dark:text-green-400'} 
                                                            ${
                                                                hoveredCol === cIdx 
                                                                ? (isOut ? 'bg-red-200 dark:bg-red-900/40' : 'bg-green-200 dark:bg-green-900/40') 
                                                                : (isOut ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10')
                                                            }`}
                                                    >
                                                        {val && Number(val) > 0 ? Number(val) : '-'}
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

                                    {[
                                        { title: "TOTAL ISSUED", type: "out" },
                                        { title: "FREE ISSUED", type: "free" },
                                        { title: "LABOR ISS.", type: "labour" },
                                        { title: "STAFF ISS.", type: "staff" },
                                        { title: "NET SALE", type: "netSale" },
                                        { title: "TRANSFER IN", type: "transferIn" }
                                    ].map((rowDef) => (
                                        <tr key={rowDef.title} className="hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                                            <td 
                                                onMouseEnter={() => setHoveredCol(0)}
                                                className={`px-4 py-3 border border-[#dcebdc] dark:border-zinc-700 sticky left-0 bg-[#f4f5f5] dark:bg-zinc-900 z-10 uppercase text-gray-800 dark:text-gray-200 text-center text-xs transition-colors ${hoveredCol === 0 ? 'brightness-95 dark:brightness-125' : ''}`}
                                            >
                                                {rowDef.title}
                                            </td>
                                            
                                            {flatColumns.map((col, idx) => {
                                                const cIdx = idx + 1;
                                                const key = `${col.catId}_${col.size}`;
                                                const isOut = col.type === 'out';
                                                let val = 0;

                                                if (rowDef.type === 'netSale') {
                                                    if(isOut) val = (currentTotals.out[key] || 0) - (currentTotals.free[key] || 0) - (currentTotals.labour[key] || 0) - (currentTotals.staff[key] || 0);
                                                } else if (rowDef.type === 'transferIn') {
                                                    if(!isOut) val = currentTotals.in[key];
                                                } else {
                                                    if(isOut) val = currentTotals[rowDef.type][key];
                                                }

                                                const isNegative = val < 0;

                                                return (
                                                    <td 
                                                        key={`${rowDef.title}-${col.catId}-${col.size}-${col.type}`}
                                                        onMouseEnter={() => setHoveredCol(cIdx)}
                                                        className={`px-2 py-3 border border-[#dcebdc] dark:border-zinc-700 transition-colors
                                                        ${isNegative ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30' : (isOut ? 'text-red-600' : 'text-green-600')}
                                                        ${!isNegative && hoveredCol === cIdx ? 'bg-gray-100 dark:bg-zinc-800' : (!isNegative ? 'bg-[#f4f5f5] dark:bg-zinc-900' : '')}`}
                                                    >
                                                        {val && val !== 0 ? Number(val) : '-'}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}