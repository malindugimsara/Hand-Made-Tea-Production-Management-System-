import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, AlertCircle, FileText, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Mapping exact product names to match your backend keys
const productCategories = [
    { id: 'athukorala_400g', name: 'Athukorala BOPF 400g' },
    { id: 'athukorala_200g', name: 'Athukorala BOPF 200g' },
    { id: 'athukorala_100g', name: 'Athukorala BOPF 100g' },
    { id: 'bopfSp_400g', name: 'Athukorala BOPF SP 400g' },
    { id: 'bopfSp_200g', name: 'Athukorala BOPF SP 200g' },
    { id: 'bopfPremium_400g', name: 'Athukorala BOPF PREMIUM 400g' },
    { id: 'bopfPremium_200g', name: 'Athukorala BOPF PREMIUM 200g' },
    { id: 'pitigala_400g', name: 'Pitigala tea 400g' },
    { id: 'pitigala_200g', name: 'Pitigala tea 200g' },
    { id: 'tb_25', name: 'Pitigala tea 25 bag' },
    { id: 'tb_100', name: 'Pitigala tea 100 bag' },
    { id: 'gt_200g', name: 'Green tea 200g' },
    { id: 'gt_T/B 25', name: 'Green tea 25 bag' },
    { id: 'others_BOPF', name: 'BOPF' },
    { id: 'others_DUST', name: 'DUST' },
    { id: 'others_DUST 1', name: 'DUST 1' },
];

export default function BalanceReport() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hoveredRow, setHoveredRow] = useState(null);

    // Get Auth Headers safely
    const getHeaders = () => {
        const token = localStorage.getItem('token'); 
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchBalanceData = async () => {
        if (!month) return;

        // --- NEW LOGIC: Boundary Checks ---
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const systemStartMonth = "2026-07"; // The exact month you seeded your initial B/M stock

        // Rule 1: Do not show data for months before the system started (e.g., June 2026)
        // Rule 2: Do not show data for future months (e.g., September 2026 if today is August)
        if (month < systemStartMonth || month > currentMonthStr) {
            setReportData([]);
            return; // Exit early, no need to hit the backend!
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/api/monthly-balance?month=${month}`, { 
                headers: getHeaders() 
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message || "Failed to fetch balance report");
            
            // Map the backend data to the table
            if (result.data && result.data.items) {
                mapDataToTable(result.data.items);
            } else {
                setReportData([]);
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Error generating balance report.");
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const mapDataToTable = (backendItems) => {
        const finalData = productCategories.map(cat => {
            // Find the item from the backend matching this category & size
            const dbItem = backendItems.find(i => `${i.categoryId}_${i.size}` === cat.id);

            const bmStock = dbItem?.bmStock || 0;
            const currentIn = dbItem?.in || 0;
            const currentOut = dbItem?.out || 0;
            const total = bmStock + currentIn;
            
            // Use the closingBalance from the DB (which handles manual adjustments perfectly)
            const balance = dbItem?.closingBalance ?? (total - currentOut);

            return {
                id: cat.id,
                name: cat.name,
                bmStock: bmStock,
                inQty: currentIn,
                total: total,
                outQty: currentOut,
                balance: balance
            };
        });

        setReportData(finalData);
    };

    useEffect(() => {
        fetchBalanceData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month]);

    const getMonthName = () => {
        if (!month) return "";
        const [y, m] = month.split('-');
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    // --- EXPORT PDF LOGIC ---
    const getPdfHeaders = () => {
        return [["CATEGORY", "B/M STOCK", "IN", "TOTAL", "OUT", "BALANCE"]];
    };

    const getPdfData = () => {
        return reportData.map(row => [
            { content: row.name, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 41, 55] } },
            { content: row.bmStock.toString(), styles: { textColor: [107, 114, 128] } },
            { content: row.inQty.toString(), styles: { textColor: [34, 197, 94] } }, 
            { content: row.total.toString(), styles: { fontStyle: 'bold', textColor: [17, 24, 39] } },
            { content: row.outQty.toString(), styles: { textColor: [239, 68, 68] } }, 
            { content: row.balance.toString(), styles: { fontStyle: 'bold', textColor: [37, 99, 235] } } 
        ]);
    };

    // --- EXPORT EXCEL LOGIC ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Balance Report');

            // Title Row (Yellow Background)
            const titleRow = worksheet.addRow([`BALANCE REPORT - ${getMonthName()}`]);
            worksheet.mergeCells('A1:F1');
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; 
            titleRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF000000' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 25;

            // Headers Row (Light Blue Background)
            const headers = ['CATEGORY', 'B/M STOCK', 'IN', 'Total', 'Out', 'BALANCE'];
            const headerRow = worksheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } }; 
                cell.font = { bold: true, color: { argb: 'FF000000' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            });

            // Data Rows
            reportData.forEach(row => {
                const dataRow = worksheet.addRow([
                    row.name, row.bmStock, row.inQty, row.total, row.outQty, row.balance
                ]);
                
                dataRow.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
                    cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'right', vertical: 'middle' };
                });
            });

            // Column Widths
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
            console.error(error);
            toast.error("Failed to download Excel file.");
        }
    };

    const uniqueCode = `BAL-REP/${month.replace('-', '')}`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1200px] mx-auto font-sans bg-slate-50 dark:bg-zinc-950 min-h-screen transition-colors duration-300">

            {/* HEADER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-500 flex items-center gap-2">
                        <FileSpreadsheet size={26} className="text-blue-600 dark:text-blue-500" /> Balance Report
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monthly overview of Stock, Inward, Sales, and Balances</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="[&>button]:bg-blue-50 [&>button]:text-blue-600 [&>button]:border [&>button]:border-blue-200 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-lg [&>button]:font-semibold [&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:text-sm hover:[&>button]:bg-blue-100 dark:[&>button]:bg-blue-900/20 dark:[&>button]:border-blue-800/50 dark:hover:[&>button]:bg-blue-900/40 transition-colors">
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
                        className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/40 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <FileText size={16} /> Export Excel
                    </button>

                    <button
                        onClick={fetchBalanceData}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700 dark:hover:bg-zinc-700 text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-blue-600" : "text-blue-600"} /> Refresh
                    </button>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                <div className="flex flex-col gap-1.5 w-64">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Month</label>
                    <div className="relative">
                        <CalendarDays size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full pl-9 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 transition-all cursor-pointer shadow-sm"
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
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700 text-gray-500">B/M Stock</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700 text-green-600">IN</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700">Total</th>
                                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider border-r border-gray-200 dark:border-zinc-700 text-red-500">Out</th>
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
                                        <td className="px-4 py-3 text-left border-r border-gray-100 dark:border-zinc-800 text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {row.name}
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm text-gray-500 dark:text-gray-400">
                                            {row.bmStock}
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-semibold text-green-600">
                                            {row.inQty}
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-bold text-gray-900 dark:text-gray-100 bg-gray-50/30 dark:bg-zinc-900/50">
                                            {row.total}
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 text-sm font-semibold text-red-500">
                                            {row.outQty}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10">
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