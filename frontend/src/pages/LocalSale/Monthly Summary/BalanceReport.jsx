import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, AlertCircle, FileText, CalendarDays, Database, Weight } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 💡 1. Define base structure (Same as MonthEndSummary)
const baseTeaCategories = [
    { id: 'athukorala', title: 'Athukorala', sizes: ['400g', '200g', '100g'] },
    { id: 'bopfSp', title: 'BOPF Sp.', sizes: ['400g', '200g'] },
    { id: 'bopfPremium', title: 'BOPF Premium', sizes: ['400g', '200g'] },
    { id: 'tb', title: 'T/B', sizes: ['100', '25'] },
    { id: 'pitigala', title: 'PITIGALA TEA', sizes: ['400g', '200g'] },
    { id: 'gt', title: 'G/T', sizes: ['200g', 'T/B 25'] },
    { id: 'others', title: 'Other Grades', sizes: ['DUST', 'DUST 1', 'BOPF'] }
];

export default function BalanceReport() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hoveredRow, setHoveredRow] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    };

    // 💡 2. Auto-Correction Key Generator
    const generateKey = (catId, catTitle, size) => {
        let cleanId = (catId || '').toLowerCase().trim();
        let cleanTitle = (catTitle || '').toLowerCase().trim();
        let cleanSize = (size || '').trim();

        if (!cleanId && cleanTitle) {
            cleanId = cleanTitle.replace(/\s+/g, '-'); 
        }

        let finalId = cleanId || 'unknown';
        let finalSize = cleanSize || catTitle || '-';

        if (cleanId === 'g/t' || cleanTitle === 'g/t' || cleanId === 'gt') finalId = 'gt';
        else if (cleanId === 'other grades' || cleanTitle === 'other grades' || cleanId === 'others') finalId = 'others';
        else if (cleanId === 'bopf sp' || cleanId === 'bopf sp.' || cleanId === 'bopfsp') finalId = 'bopfSp';
        else if (cleanId === 'bopf premium' || cleanId === 'bopfpremium') finalId = 'bopfPremium';
        else if (cleanId === 't/b' || cleanId === 'tb') finalId = 'tb';
        else if (cleanId === 'pitigala tea' || cleanId === 'pitigala') finalId = 'pitigala';
        else if (cleanId === 'athukorala') finalId = 'athukorala';
        else {
             finalId = cleanTitle.replace(/[^a-z0-9]/g, ''); 
        }

        if (finalSize.toLowerCase() === 'bopf (kg)' || finalSize.toLowerCase() === 'kg' || finalSize.toLowerCase() === 'bopf') finalSize = 'BOPF';
        if (finalSize.toLowerCase() === 'dust (kg)' || finalSize.toLowerCase() === 'dust') finalSize = 'DUST';
        if (finalSize.toLowerCase() === 'dust 1 (kg)' || finalSize.toLowerCase() === 'dust 1') finalSize = 'DUST 1';

        return { 
            id: finalId, 
            title: catTitle || cleanId.toUpperCase(),
            size: finalSize, 
            key: `${finalId}_${finalSize}` 
        };
    };

    const fetchBalanceData = async () => {
        if (!month) return;

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        if (month < "2026-07" || month > currentMonthStr) {
            setReportData([]);
            return;
        }

        setIsLoading(true);
        try {
            const [balanceRes, summaryRes, issueRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/monthly-balance?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/summary?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false }))
            ]);

            const balanceJson = balanceRes.ok ? await balanceRes.json() : null;
            const summaryJson = summaryRes.ok ? await summaryRes.json() : null;
            const issueJson = issueRes.ok ? await issueRes.json() : null;

            const bmStockMap = {};
            const inMap = {};
            const soldOutMap = {};
            const issueOutMap = {};

            const dynamicCategoriesMap = {};
            const dynamicBaseSizesMap = {}; 
            const baseCategoryIds = baseTeaCategories.map(c => c.id);

            // 💡 3. Dynamic Category Scanner
            const scanItem = (id, title, size) => {
                if (!baseCategoryIds.includes(id)) {
                    if (!dynamicCategoriesMap[id]) {
                        dynamicCategoriesMap[id] = { id, title, sizes: new Set() };
                    }
                    dynamicCategoriesMap[id].sizes.add(size);
                } else {
                    const baseCat = baseTeaCategories.find(c => c.id === id);
                    const sizeExists = baseCat.sizes.some(s => s.toLowerCase() === size.toLowerCase());
                    if (!sizeExists) {
                        if (!dynamicBaseSizesMap[id]) dynamicBaseSizesMap[id] = new Set();
                        dynamicBaseSizesMap[id].add(size);
                    }
                }
            };

            // Process BM Stock
            const balanceItems = balanceJson?.data?.items || balanceJson?.items || [];
            balanceItems.forEach(item => {
                const { id, title, size, key } = generateKey(item.categoryId, item.categoryTitle, item.size);
                scanItem(id, title, size);
                bmStockMap[key] = (bmStockMap[key] || 0) + (Number(item.bmStock) || 0);
            });

            // Process IN & Sold OUT
            const summaries = summaryJson?.data || summaryJson || [];
            if (Array.isArray(summaries)) {
                summaries.forEach(day => {
                    const recordDate = day.date || '';
                    if (recordDate.startsWith(month) && Array.isArray(day.items)) {
                        day.items.forEach(item => {
                            const { id, title, size, key } = generateKey(item.categoryId, item.categoryTitle, item.size);
                            scanItem(id, title, size);
                            inMap[key] = (inMap[key] || 0) + (Number(item.in) || 0);
                            soldOutMap[key] = (soldOutMap[key] || 0) + (Number(item.out) || 0);
                        });
                    }
                });
            }

            // Process Issue OUT
            // const issues = issueJson?.data || issueJson || [];
            // if (Array.isArray(issues)) {
            //     issues.forEach(issueRecord => {
            //         const recordDate = issueRecord.date || '';
            //         if (recordDate.startsWith(month) && Array.isArray(issueRecord.items)) {
            //             issueRecord.items.forEach(item => {
            //                 const { id, title, size, key } = generateKey(item.categoryId, item.categoryTitle, item.size);
            //                 scanItem(id, title, size);
            //                 issueOutMap[key] = (issueOutMap[key] || 0) + (Number(item.out) || 0);
            //             });
            //         }
            //     });
            // }

            // 💡 4. Merge Categories
            const updatedBaseCats = baseTeaCategories.map(cat => {
                if (dynamicBaseSizesMap[cat.id]) {
                    return { ...cat, sizes: [...cat.sizes, ...Array.from(dynamicBaseSizesMap[cat.id])] };
                }
                return cat;
            });

            const customCatsArray = Object.values(dynamicCategoriesMap).map(cat => {
                const cleanTitle = cat.title.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return { id: cat.id, title: cleanTitle, sizes: Array.from(cat.sizes) };
            });
            
            const finalCategories = [...updatedBaseCats, ...customCatsArray];

            // 💡 5. Format Output Data & Filter Empties
            const formattedData = [];
            
            finalCategories.forEach(cat => {
                cat.sizes.forEach(size => {
                    const { key } = generateKey(cat.id, cat.title, size);

                    const bmStock = bmStockMap[key] || 0;
                    const inQty = inMap[key] || 0;
                    const total = bmStock + inQty;
                    const outQty = (soldOutMap[key] || 0) + (issueOutMap[key] || 0);
                    const balance = total - outQty;

                    // Hide rows with absolutely no data
                    if (bmStock !== 0 || inQty !== 0 || outQty !== 0) {
                        
                        // Other Grades වල "Other Grades" කෑල්ල අයින් කර Size එක (DUST, DUST 1, BOPF) පමණක් පෙන්වීම
                        const displayName = cat.id === 'others' ? size : `${cat.title} ${size}`;

                        formattedData.push({
                            id: key,
                            name: displayName,
                            bmStock: bmStock % 1 !== 0 ? bmStock.toFixed(2) : bmStock,
                            inQty: inQty % 1 !== 0 ? inQty.toFixed(2) : inQty,
                            total: total % 1 !== 0 ? total.toFixed(2) : total,
                            outQty: outQty % 1 !== 0 ? outQty.toFixed(2) : outQty,
                            balance: balance % 1 !== 0 ? balance.toFixed(2) : balance,
                            rawBalance: balance
                        });
                    }
                });
            });

            setReportData(formattedData);

        } catch (error) {
            console.error("Balance report fetch error:", error);
            toast.error("Error generating balance report.");
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalanceData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    // 💡 NEW: Calculate Total Black Tea KG Sold (Excluding Green Tea & Correcting Weights)
    const totalBlackTeaSoldKg = useMemo(() => {
        let totalKg = 0;

        reportData.forEach(row => {
            const outVal = Number(row.outQty) || 0;
            if (outVal <= 0) return;

            const nameLower = row.name.toLowerCase();
            const idLower = row.id.toLowerCase();

            // Ignore Green Tea
            if (idLower.startsWith('gt_') || nameLower.includes('green tea') || nameLower.includes('g/t')) {
                return; 
            }

            let multiplier = 0;

            // Bulk Categories -> Straight kg amount
            if (idLower.startsWith('others_') || nameLower === 'dust' || nameLower === 'dust 1' || nameLower === 'bopf') {
                multiplier = 1;
            } 
            // 400g Packages
            else if (nameLower.includes('400g') || nameLower.includes('100 bag') || nameLower.includes('t/b 100') || nameLower.endsWith(' 100')) {
                multiplier = 0.4;
            } 
            // 200g Packages
            else if (nameLower.includes('200g')) {
                multiplier = 0.2;
            } 
            // 100g Packages (Including T/B 25 & Welfare Pack 25)
            else if (nameLower.includes('100g') || nameLower.includes('25 bag') || nameLower.includes('t/b 25') || nameLower.endsWith(' 25') || nameLower.includes('welfare')) {
                multiplier = 0.1;
            } 
            // 50g Packages
            else if (nameLower.includes('50g')) {
                multiplier = 0.05;
            }

            totalKg += (outVal * multiplier);
        });

        return totalKg;
    }, [reportData]);

    const handleUpdateBM = async () => {
        const confirmUpdate = window.confirm(`Force update the B/M Stock using data from ${month}? (Note: The system already does this automatically at the end of every month).`);
        if (!confirmUpdate) return;

        setIsUpdating(true);
        const toastId = toast.loading("Updating B/M Stock database...");

        try {
            const response = await fetch(`${BACKEND_URL}/api/monthly-balance/update-bm`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ currentMonth: month })
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message);
            toast.success(result.message, { id: toastId });
            fetchBalanceData();
        } catch (error) {
            toast.error(error.message || "Failed to update BM Stock", { id: toastId });
        } finally {
            setIsUpdating(false);
        }
    };

    const getMonthName = () => {
        if (!month) return "";
        const [y, m] = month.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    // --- EXPORT PDF LOGIC ---
    const getPdfHeaders = () => [["CATEGORY", "B/M STOCK", "IN", "TOTAL", "OUT", "BALANCE"]];
    const getPdfData = () => reportData.map(row => [
        { content: row.name, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 41, 55] } },
        { content: row.bmStock.toString(), styles: { textColor: [107, 114, 128] } },
        { content: row.inQty.toString(), styles: { textColor: [34, 197, 94] } },
        { content: row.total.toString(), styles: { fontStyle: 'bold', textColor: [17, 24, 39] } },
        { content: row.outQty.toString(), styles: { textColor: [239, 68, 68] } },
        {
            content: row.balance.toString(),
            styles: {
                fontStyle: 'bold',
                textColor: row.rawBalance < 0 ? [220, 38, 38] : [37, 99, 235]
            }
        }
    ]);

    // --- EXPORT EXCEL LOGIC ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Balance Report');
            const titleRow = worksheet.addRow([`BALANCE REPORT - ${getMonthName()}`]);
            worksheet.mergeCells('A1:F1');
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            titleRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF000000' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 25;

            const headers = ['CATEGORY', 'B/M STOCK', 'IN', 'Total', 'Out', 'BALANCE'];
            const headerRow = worksheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } };
                cell.font = { bold: true, color: { argb: 'FF000000' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            });

            reportData.forEach((row, index) => {
                const rowIndex = index + 3; 

                const bmVal = Number(row.bmStock) || 0;
                const inVal = Number(row.inQty) || 0;
                const outVal = Number(row.outQty) || 0;

                const dataRow = worksheet.addRow([
                    row.name,
                    bmVal || '',
                    inVal || '',
                    { formula: `B${rowIndex}+C${rowIndex}` }, 
                    outVal || '',
                    { formula: `D${rowIndex}-E${rowIndex}` } 
                ]);

                dataRow.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
                    cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'right', vertical: 'middle' };

                    if (colNumber > 1) {
                        cell.numFmt = '#,##0.00';
                    }

                    if (colNumber === 4 || colNumber === 6) {
                        cell.font = { bold: true };
                    }
                });
            });

            worksheet.addConditionalFormatting({
                ref: `F3:F${reportData.length + 2}`,
                rules: [
                    {
                        type: 'cellIs',
                        operator: 'lessThan',
                        formulae: ['0'],
                        style: { font: { color: { argb: 'FFDC2626' }, bold: true } }
                    },
                    {
                        type: 'cellIs',
                        operator: 'greaterThanOrEqual',
                        formulae: ['0'],
                        style: { font: { color: { argb: 'FF2563EB' }, bold: true } }
                    }
                ]
            });

            worksheet.getColumn(1).width = 35;
            worksheet.getColumn(2).width = 12;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 12;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 15;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Balance_Report_${month}.xlsx`);
            toast.success("Excel downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download Excel file.");
        }
    };

    const uniqueCode = `BAL-REP/${month.replace('-', '')}`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1200px] mx-auto font-sans dark:bg-zinc-950 min-h-screen">

            {/* HEADER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-500 flex items-center gap-2">
                        <FileSpreadsheet size={26} /> Balance Report
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monthly overview of Stock, Inward, Sales, and Balances</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button]:border [&>button]:border-blue-200 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-semibold [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:text-sm hover:[&>button]:bg-blue-100">
                        <PDFDownloader
                            title={`BALANCE REPORT - ${getMonthName()}`}
                            subtitle={`Complete Monthly Stock Balance`}
                            headers={getPdfHeaders()}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Balance_Report_${month}.pdf`}
                            orientation="portrait"
                            disabled={isLoading || reportData.length === 0}
                            autoTableOptions={{
                                theme: 'grid',
                                styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 225, 230] },
                                headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], halign: 'center' },
                                columnStyles: { 0: { halign: 'left', cellWidth: 'auto' } }
                            }}
                        />
                    </div>

                    <button
                        onClick={exportToExcel}
                        disabled={isLoading || reportData.length === 0}
                        className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <FileText size={16} /> Export Excel
                    </button>

                    <button
                        onClick={handleUpdateBM}
                        disabled={isLoading || isUpdating || reportData.length === 0}
                        className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                        title="Force sync next month's starting stock if past data was edited"
                    >
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                        Update B/M Stock
                    </button>

                    <button
                        onClick={fetchBalanceData}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-blue-600" : "text-blue-600"} /> Refresh
                    </button>
                </div>
            </div>

            {/* FILTERS SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col gap-1.5 w-full md:w-64">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Month</label>
                    <div className="relative">
                        <CalendarDays size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                            className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                        />
                    </div>
                </div>

                {/* 💡 NEW: Total Black Tea Sold Card */}
                {reportData.length > 0 && (
                    <div className="md:ml-auto flex items-center gap-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-3.5 px-6 rounded-xl shadow-sm">
                        <div className="p-2.5 bg-green-100 dark:bg-green-800/50 rounded-lg text-green-700 dark:text-green-400">
                            <Weight size={22} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-green-600 dark:text-green-500 uppercase tracking-widest">Total Black Tea Out</span>
                            <span className="text-2xl font-black text-green-800 dark:text-green-400 tracking-tight">{totalBlackTeaSoldKg.toFixed(2)} KG</span>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLE SECTION */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 overflow-hidden">
                {reportData.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No stock data available for this month.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar" onMouseLeave={() => setHoveredRow(null)}>
                        <table className="w-full text-right border-collapse whitespace-nowrap min-w-[800px]">
                            <thead className="bg-[#f8fafc] dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-zinc-600">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700">Category</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 border-r border-gray-200 dark:border-zinc-700">B/M Stock</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-green-600 border-r border-gray-200 dark:border-zinc-700">Total IN</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700">Total Stock</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-red-500 border-r border-gray-200 dark:border-zinc-700">Total Out</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-blue-600">BALANCE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {reportData.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        onMouseEnter={() => setHoveredRow(idx)}
                                        className={`transition-colors ${hoveredRow === idx ? 'bg-blue-50/50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-950'}`}
                                    >
                                        <td className="px-4 py-3 text-left border-r border-gray-100 dark:border-zinc-800 text-sm font-bold text-gray-800 dark:text-gray-200">{row.name}</td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm text-gray-500 dark:text-gray-400">{row.bmStock}</td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-semibold text-green-600">{row.inQty}</td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-bold text-gray-900 dark:text-gray-100 bg-gray-50/30 dark:bg-zinc-900/50">{row.total}</td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-semibold text-red-500">{row.outQty}</td>
                                        <td className={`px-4 py-3 text-sm font-black ${row.rawBalance < 0
                                                ? 'text-red-600 bg-red-50/80 dark:text-red-400 dark:bg-red-900/20'
                                                : 'text-blue-600 bg-blue-50/30 dark:bg-blue-900/10'
                                            }`}>
                                            {row.balance}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}