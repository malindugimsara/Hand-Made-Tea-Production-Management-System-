import React, { useState, useEffect } from 'react';
import { Calendar, Search, Gift, RefreshCw, AlertCircle, FilterX, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader'; // Ensure this path matches your project
import { utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Maps the exact UI columns in image_629650.png to the backend categoryIds and sizes
const tableStructure = [
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

    const clearFilters = () => {
        setSearchQuery('');
    };

    // --- UTILITIES ---
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
        tableStructure.forEach(cat => {
            cat.columns.forEach(col => {
                headers.push(`${cat.title}\n(${col.size})`);
            });
        });
        return headers;
    };

    const getPdfData = () => {
        const data = filteredReportData.map(row => {
            const rowData = [{ content: row.date.replace(/-/g, '.'), styles: { fontStyle: 'bold' } }];
            tableStructure.forEach(cat => {
                cat.columns.forEach(col => {
                    rowData.push(formatVal(row.values[col.key]) || '-');
                });
            });
            return rowData;
        });

        // Add Totals Row
        const totalsRow = [{ content: "TOTAL", styles: { fontStyle: 'bold', fillColor: [244, 204, 204] } }];
        tableStructure.forEach(cat => {
            cat.columns.forEach(col => {
                totalsRow.push({
                    content: formatVal(filteredTotals[col.key]) || '0',
                    styles: { fontStyle: 'bold', fillColor: [244, 204, 204] }
                });
            });
        });
        data.push(totalsRow);

        return data;
    };

    // --- EXPORT EXCEL (.XLSX) LOGIC WITH COLORS ---
    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Free Issued Summary');

            // Calculate total columns based on table structure
            let totalCols = 1; // 1 for the Date column
            tableStructure.forEach(cat => totalCols += cat.columns.length);

            // 1. MAIN TITLE ROW
            const titleRow = worksheet.addRow([`FREE ISSUED - ${getMonthName()}`]);
            worksheet.mergeCells(1, 1, 1, totalCols);
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF200' } }; // Yellow
            titleRow.getCell(1).font = { bold: true, size: 14 };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;

            // 2. CATEGORY HEADERS ROW
            const catRow = worksheet.addRow(['DATE']);
            let colIndex = 2;
            tableStructure.forEach(cat => {
                catRow.getCell(colIndex).value = cat.title;
                if (cat.columns.length > 1) {
                    worksheet.mergeCells(2, colIndex, 2, colIndex + cat.columns.length - 1);
                }
                colIndex += cat.columns.length;
            });

            // 3. SIZE HEADERS ROW
            const sizeRow = worksheet.addRow(['']);
            tableStructure.forEach(cat => {
                cat.columns.forEach(col => {
                    sizeRow.getCell(sizeRow.actualCellCount + 1).value = col.size;
                });
            });
            worksheet.mergeCells('A2:A3'); // Merge DATE column vertically

            // Apply styles to Headers (Rows 2 & 3)
            [catRow, sizeRow].forEach(row => {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; // Light Green
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            // 4. DATA ROWS
            filteredReportData.forEach(row => {
                const rowData = [row.date.replace(/-/g, '.')];
                tableStructure.forEach(cat => {
                    cat.columns.forEach(col => {
                        const val = row.values[col.key];
                        rowData.push(val && val > 0 ? Number(val) : ''); // Leave 0s blank for a cleaner look
                    });
                });

                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell(cell => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                    };
                });
                dataRow.getCell(1).font = { bold: true }; // Make Date column bold
            });

            // 5. TOTALS ROW
            const totalsData = ["TOTAL"];
            tableStructure.forEach(cat => {
                cat.columns.forEach(col => {
                    const totalVal = filteredTotals[col.key];
                    totalsData.push(totalVal && totalVal > 0 ? Number(totalVal) : 0);
                });
            });

            const totalsRow = worksheet.addRow(totalsData);
            totalsRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; // Light Red
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium' }, left: { style: 'thin' },
                    bottom: { style: 'medium' }, right: { style: 'thin' }
                };
            });

            // 6. AUTO-SIZE COLUMNS
            worksheet.getColumn(1).width = 15; // Date column slightly wider
            for (let i = 2; i <= totalCols; i++) {
                worksheet.getColumn(i).width = 10;
            }

            // 7. GENERATE AND DOWNLOAD
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Free_Issued_${getMonthName()}.xlsx`);

            toast.success("Beautiful Excel file downloaded!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download Excel file.");
        }
    };

    const uniqueCode = `FREE-ISSUE/${getMonthName()}/${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 w-full max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">

            {/* Header & Controls */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
                <div>
                    <h2 className="text-3xl font-extrabold text-green-700 dark:text-green-500 flex items-center gap-3 uppercase tracking-wider">
                        <Gift size={32} /> Free Issued Report
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Monthly breakdown of free product distributions</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Export PDF */}
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

                    {/* Export Excel */}
                    <button
                        onClick={exportToExcel}
                        disabled={isLoading || filteredReportData.length === 0}
                        className="p-2.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Excel (CSV)"
                    >
                        <FileSpreadsheet size={22} />
                    </button>

                    {/* Month Picker & Sync */}
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 outline-none bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold"
                    />
                    <button
                        onClick={fetchFreeIssues}
                        disabled={isLoading}
                        className="px-5 py-2.5 rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Sync
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Search by Date</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="e.g. 2026.07.14..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        />
                    </div>
                </div>
                <button
                    onClick={clearFilters}
                    disabled={!searchQuery}
                    className={`px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${searchQuery ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-not-allowed'}`}
                >
                    <FilterX size={16} /> Clear
                </button>
            </div>

            {/* Pivot Table Wrapper */}
            <div className="bg-white dark:bg-zinc-900 shadow-xl border-2 border-black dark:border-zinc-700 overflow-hidden relative">

                {/* Main Title Row matching the Excel sheet */}
                <div className="bg-yellow-300 text-black font-black text-center py-2 text-lg border-b-2 border-black uppercase tracking-widest">
                    FREE ISSUED - {getMonthName()}
                </div>

                {filteredReportData.length === 0 && !isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={48} className="mb-4 opacity-30" />
                        <p className="font-semibold text-lg">No free issues found.</p>
                        {searchQuery && <p className="text-sm mt-1">Try clearing your date filter.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-center border-collapse text-sm font-semibold whitespace-nowrap min-w-[900px] text-black dark:text-gray-200">

                            {/* --- TABLE HEADERS --- */}
                            <thead className="bg-[#d9ead3] dark:bg-green-900/30 text-black dark:text-gray-200">
                                <tr>
                                    <th rowSpan={2} className="border border-black dark:border-zinc-600 p-2 min-w-[120px] sticky left-0 bg-[#d9ead3] dark:bg-green-900 z-10 uppercase font-black">
                                        DATE
                                    </th>
                                    {tableStructure.map((cat, idx) => (
                                        <th key={idx} colSpan={cat.columns.length} className="border border-black dark:border-zinc-600 p-2 font-black uppercase">
                                            {cat.title}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {tableStructure.map(cat => (
                                        cat.columns.map((col, cIdx) => (
                                            <th key={`${cat.id}-${cIdx}`} className="border border-black dark:border-zinc-600 p-1 font-bold">
                                                {col.size}
                                            </th>
                                        ))
                                    ))}
                                </tr>
                            </thead>

                            {/* --- TABLE BODY --- */}
                            <tbody className="bg-white dark:bg-zinc-900">
                                {filteredReportData.map((row) => (
                                    <tr key={row.date} className="hover:bg-gray-100 dark:hover:bg-zinc-800">
                                        <td className="border border-black dark:border-zinc-600 p-1.5 sticky left-0 bg-white dark:bg-zinc-900 z-10 font-bold text-gray-800 dark:text-gray-300">
                                            {row.date.replace(/-/g, '.')}
                                        </td>
                                        {tableStructure.map(cat => (
                                            cat.columns.map((col) => (
                                                <td key={`${row.date}-${col.key}`} className="border border-black dark:border-zinc-700 p-1 text-gray-800 dark:text-gray-300">
                                                    {formatVal(row.values[col.key])}
                                                </td>
                                            ))
                                        ))}
                                    </tr>
                                ))}
                            </tbody>

                            {/* --- FOOTER: DYNAMIC TOTALS --- */}
                            {filteredReportData.length > 0 && (
                                <tfoot className="bg-[#f4cccc] dark:bg-orange-950/40 text-black dark:text-orange-200 font-black">
                                    <tr>
                                        <td className="border border-black dark:border-zinc-600 p-2 text-left sticky left-0 bg-[#f4cccc] dark:bg-orange-950 z-10">
                                            TOTAL
                                        </td>
                                        {tableStructure.map(cat => (
                                            cat.columns.map((col) => (
                                                <td key={`total-${col.key}`} className="border border-black dark:border-zinc-600 p-2">
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