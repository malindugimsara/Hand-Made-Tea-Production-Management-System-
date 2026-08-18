import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, AlertCircle, FileText, CalendarDays, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Mapping exact product categories and keys to match backend/frontend consistently
const productCategories = [
    { id: 'athukorala_400g', categoryId: 'athukorala', size: '400g', name: 'Athukorala BOPF 400g' },
    { id: 'athukorala_200g', categoryId: 'athukorala', size: '200g', name: 'Athukorala BOPF 200g' },
    { id: 'athukorala_100g', categoryId: 'athukorala', size: '100g', name: 'Athukorala BOPF 100g' },
    { id: 'bopfSp_400g', categoryId: 'bopfSp', size: '400g', name: 'Athukorala BOPF SP 400g' },
    { id: 'bopfSp_200g', categoryId: 'bopfSp', size: '200g', name: 'Athukorala BOPF SP 200g' },
    { id: 'bopfPremium_400g', categoryId: 'bopfPremium', size: '400g', name: 'Athukorala BOPF PREMIUM 400g' },
    { id: 'bopfPremium_200g', categoryId: 'bopfPremium', size: '200g', name: 'Athukorala BOPF PREMIUM 200g' },
    { id: 'pitigala_400g', categoryId: 'pitigala', size: '400g', name: 'Pitigala tea 400g' },
    { id: 'pitigala_200g', categoryId: 'pitigala', size: '200g', name: 'Pitigala tea 200g' },
    { id: 'tb_25', categoryId: 'tb', size: '25', name: 'Pitigala tea 25 bag' },
    { id: 'tb_100', categoryId: 'tb', size: '100', name: 'Pitigala tea 100 bag' },
    { id: 'gt_200g', categoryId: 'gt', size: '200g', name: 'Green tea 200g' },
    { id: 'gt_t/b 25', categoryId: 'gt', size: 't/b 25', name: 'Green tea 25 bag' },
    { id: 'others_bopf', categoryId: 'others', size: 'bopf', name: 'BOPF' },
    { id: 'others_dust', categoryId: 'others', size: 'dust', name: 'DUST' },
    { id: 'others_dust 1', categoryId: 'others', size: 'dust 1', name: 'DUST 1' },
];

export default function BalanceReport() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hoveredRow, setHoveredRow] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token'); 
        return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    };

    // 💡 Auto-Correction Key Generator (Highly Strict Normalization to fix mapping issues)
    const generateKey = (catId, catTitle, size) => {
        let idStr = (catId || catTitle || '').toLowerCase().trim();
        let sizeStr = (size || '').toLowerCase().trim();

        // 1. Normalize Category IDs
        if (idStr === 'g/t' || idStr === 'gt' || idStr === 'green tea 25 bag') idStr = 'gt';
        else if (idStr === 'other grades' || idStr === 'others') idStr = 'others';
        else if (idStr === 'bopf premium' || idStr === 'bopfpremium') idStr = 'bopfPremium';
        else if (idStr === 'bopf sp.' || idStr === 'bopfsp' || idStr === 'bopf sp') idStr = 'bopfSp';
        else if (idStr.includes('pitigala')) idStr = 'pitigala';
        else if (idStr.includes('athukorala')) idStr = 'athukorala';
        else if (idStr === 't/b' || idStr === 'tb') idStr = 'tb';

        // 2. Normalize Sizes
        if (sizeStr === 'bopf (kg)' || sizeStr === 'kg' || sizeStr === 'bopf') sizeStr = 'bopf';
        else if (sizeStr === 'dust (kg)' || sizeStr === 'dust') sizeStr = 'dust';
        else if (sizeStr === 'dust 1 (kg)' || sizeStr === 'dust 1') sizeStr = 'dust 1';
        else if (sizeStr === 't/b 25' || sizeStr === 't/b') sizeStr = 't/b 25';
        else if (sizeStr === '25') sizeStr = '25';
        else if (sizeStr === '100') sizeStr = '100';
        else if (sizeStr === '400g') sizeStr = '400g';
        else if (sizeStr === '200g') sizeStr = '200g';
        else if (sizeStr === '100g') sizeStr = '100g';

        // 3. Fallbacks (If Category ID is Unknown, map it based on the Size)
        if (!idStr || idStr === 'unknown category' || idStr === 'undefined') {
            if (sizeStr === 't/b 25') idStr = 'gt';
            else if (sizeStr === 'bopf' || sizeStr === 'dust' || sizeStr === 'dust 1') idStr = 'others';
            else if (sizeStr === '25' || sizeStr === '100') idStr = 'tb';
        }

        return `${idStr}_${sizeStr}`.toLowerCase();
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
            // Fetch Monthly Balance (for bmStock), Daily Summary (for IN & Sold OUT), and Issue Summary (for Issue OUT)
            const [balanceRes, summaryRes, issueRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/monthly-balance?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/summary?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/issue-summary?month=${month}`, { headers: getHeaders() }).catch(() => ({ ok: false }))
            ]);

            const balanceJson = balanceRes.ok ? await balanceRes.json() : null;
            const summaryJson = summaryRes.ok ? await summaryRes.json() : null;
            const issueJson = issueRes.ok ? await issueRes.json() : null;

            // Extract bmStock map
            const bmStockMap = {};
            const balanceItems = balanceJson?.data?.items || balanceJson?.items || [];
            balanceItems.forEach(item => {
                const key = generateKey(item.categoryId, item.categoryTitle, item.size);
                bmStockMap[key] = Number(item.bmStock) || 0;
            });

            // Extract IN and Sold OUT from daily summary
            const inMap = {};
            const soldOutMap = {};
            const summaries = summaryJson?.data || summaryJson || [];
            if (Array.isArray(summaries)) {
                summaries.forEach(day => {
                    const recordDate = day.date || '';
                    if (recordDate.startsWith(month) && Array.isArray(day.items)) {
                        day.items.forEach(item => {
                            const key = generateKey(item.categoryId, item.categoryTitle, item.size);
                            inMap[key] = (inMap[key] || 0) + (Number(item.in) || 0);
                            soldOutMap[key] = (soldOutMap[key] || 0) + (Number(item.out) || 0);
                        });
                    }
                });
            }

            // Extract Issue OUT from issue summary
            const issueOutMap = {};
            const issues = issueJson?.data || issueJson || [];
            if (Array.isArray(issues)) {
                issues.forEach(issueRecord => {
                    const recordDate = issueRecord.date || '';
                    if (recordDate.startsWith(month) && Array.isArray(issueRecord.items)) {
                        issueRecord.items.forEach(item => {
                            const key = generateKey(item.categoryId, item.categoryTitle, item.size);
                            issueOutMap[key] = (issueOutMap[key] || 0) + (Number(item.out) || 0);
                        });
                    }
                });
            }

            // Build final report rows matching productCategories structure
            const formattedData = productCategories.map(cat => {
                const standardKey = `${cat.categoryId}_${cat.size}`.toLowerCase();
                
                const bmStock = bmStockMap[standardKey] || 0;
                const inQty = inMap[standardKey] || 0;
                const total = bmStock + inQty;
                
                const outQty = (soldOutMap[standardKey] || 0) + (issueOutMap[standardKey] || 0);
                const balance = total - outQty;

                const formatNum = (num) => (num % 1 !== 0 ? num.toFixed(2) : num);

                return {
                    id: cat.id,
                    name: cat.name,
                    bmStock: formatNum(bmStock),
                    inQty: formatNum(inQty),
                    total: formatNum(total),
                    outQty: formatNum(outQty),
                    balance: formatNum(balance),
                    rawBalance: balance
                };
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

            reportData.forEach(row => {
                const dataRow = worksheet.addRow([row.name, row.bmStock, row.inQty, row.total, row.outQty, row.balance]);
                dataRow.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
                    cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'right', vertical: 'middle' };
                    if (colNumber === 6) {
                        cell.font = { bold: true, color: { argb: row.rawBalance < 0 ? 'FFDC2626' : 'FF2563EB' } };
                    }
                });
            });

            worksheet.getColumn(1).width = 35; 
            worksheet.getColumn(2).width = 12; 
            worksheet.getColumn(3).width = 10; 
            worksheet.getColumn(4).width = 10; 
            worksheet.getColumn(5).width = 10; 
            worksheet.getColumn(6).width = 12; 

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Balance_Report_${month}.xlsx`);
            toast.success("Excel downloaded successfully!");
        } catch (error) {
            toast.error("Failed to download Excel file.");
        }
    };

    const uniqueCode = `BAL-REP/${month.replace('-', '')}`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1200px] mx-auto font-sans bg-slate-50 dark:bg-zinc-950 min-h-screen">
            
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
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                <div className="flex flex-col gap-1.5 w-64">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Month</label>
                    <div className="relative">
                        <CalendarDays size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                            className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                        />
                    </div>
                </div>
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
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-green-600 border-r border-gray-200 dark:border-zinc-700">IN</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700">Total</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-red-500 border-r border-gray-200 dark:border-zinc-700">Out</th>
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
                                        <td className={`px-4 py-3 text-sm font-black ${
                                            row.rawBalance < 0 
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