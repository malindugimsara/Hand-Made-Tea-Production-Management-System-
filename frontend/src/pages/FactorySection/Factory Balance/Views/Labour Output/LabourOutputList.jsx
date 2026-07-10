import React, { useEffect, useState, useCallback } from 'react';
import PDFDownloader from "@/components/PDFDownloader";
import { Filter, RefreshCcw, FileSpreadsheet, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// IMPORT EXCEL STYLING LIBRARY (Make sure you ran: npm install xlsx-js-style)
import * as XLSX from 'xlsx-js-style';

// Import your Dialog components
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LabourOutputTable = () => {
    const navigate = useNavigate();

    // --- Data State ---
    const [groupedData, setGroupedData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // --- Filter State ---
    const [month, setMonth] = useState('2026-06');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const getPackingSummaryForDate = useCallback((date) => {
        if (typeof window === "undefined") return { totalBags: 0, totalKgs: 0 };

        try {
            const storedRecords = JSON.parse(localStorage.getItem("factoryPackingRecords") || "[]");
            const matchingRecords = storedRecords.filter((record) => String(record.date) === String(date));

            return {
                totalBags: matchingRecords.reduce((sum, record) => sum + Number(record.noOfBags || 0), 0),
                totalKgs: matchingRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0)
            };
        } catch (error) {
            console.error("Error reading factory packing records:", error);
            return { totalBags: 0, totalKgs: 0 };
        }
    }, []);

    // --- Extracted Fetch Function ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/labour-output');
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }

            const result = await response.json();
            const grouped = result.reduce((acc, record) => {
                const date = record.date ? record.date.split('T')[0] : 'Unknown Date';
                if (!acc[date]) acc[date] = [];
                acc[date].push(record);
                return acc;
            }, {});

            const groupedArray = Object.entries(grouped).map(([date, entries]) => ({
                date,
                entries,
                packingSummary: getPackingSummaryForDate(date)
            }));
            setGroupedData(groupedArray);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getPackingSummaryForDate]);

    // Fetch on mount
    useEffect(() => {
        fetchData();

        const handlePackingDataChange = () => {
            fetchData();
        };

        window.addEventListener("storage", handlePackingDataChange);
        window.addEventListener("factoryPackingUpdated", handlePackingDataChange);
        return () => {
            window.removeEventListener("storage", handlePackingDataChange);
            window.removeEventListener("factoryPackingUpdated", handlePackingDataChange);
        };
    }, [fetchData]);

    // --- Action Handlers ---
    const handleEditClick = (groupData) => {
        navigate("/factory/labouroutput/edit", { state: { recordData: groupData } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading("Deleting records...");

        try {
            const response = await fetch(`http://localhost:3000/api/labour-output/date/${recordToDelete.date}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error("Failed to delete the record");
            }

            toast.success("Records deleted successfully!", { id: toastId });
            fetchData();
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error(error.message || "Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // --- Helper for File Name & Subtitle ---
    const getPeriodText = () => {
        if (fromDate && toDate) return `${fromDate} to ${toDate}`;
        if (month) return month;
        return "All Time";
    };

    // --- Helper to convert Table Data for the PDF ---
    const getCleanTableData = () => {
        return groupedData.map((group) => {
            const { date, entries, packingSummary } = group;
            
            // Format PDF output to multi-line strings
            const sections = entries.map(item => item.section).join('\n');
            const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
            const workersStr = entries.map(item => item.noOfLabours || 0).join('\n') + (entries.length > 1 ? `\n---\n${totalWorkers}` : '');
            
            const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
            const otHoursStr = entries.map(item => (item.otHours || 0).toFixed(2)).join('\n') + (entries.length > 1 ? `\n---\n${totalOtHours.toFixed(2)}` : '');
            
            const totalBags = Number((packingSummary?.totalBags ?? entries.reduce((sum, item) => sum + (Number(item.noOfBags || 0)), 0)) || 0);
            const totalKgs = Number((packingSummary?.totalKgs ?? entries.reduce((sum, item) => sum + (Number(item.totalKgs || 0)), 0)) || 0);
            const avgLabourOutput = entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length;

            return [
                date,
                sections,
                workersStr,
                otHoursStr,
                totalBags.toString(),
                totalKgs.toFixed(2),
                avgLabourOutput.toFixed(2)
            ];
        });
    };

    // =======================================================================
    // --- EXCEL EXPORT LOGIC (WITH CUSTOM UI COLORS) ---
    // =======================================================================
    const exportToExcel = () => {
        if (groupedData.length === 0) {
            toast.error("No data to export.");
            return;
        }

        // Generate dynamic rows mimicking the UI grouping
        const dataRows = groupedData.map(group => {
            const { date, entries } = group;
            const sections = entries.map(item => item.section).join('\n');
            const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
            const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
            const totalBags = Number((group?.packingSummary?.totalBags ?? entries.reduce((sum, item) => sum + (Number(item.noOfBags || 0)), 0)) || 0);
            const totalKgs = Number((group?.packingSummary?.totalKgs ?? entries.reduce((sum, item) => sum + (Number(item.totalKgs || 0)), 0)) || 0);
            const avgLabourOutput = entries.length > 0
                ? entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length
                : 0;

            return [
                date,
                sections,
                Number(totalWorkers),
                Number(totalOtHours.toFixed(2)),
                Number(totalBags),
                Number(totalKgs.toFixed(2)),
                Number(avgLabourOutput.toFixed(2))
            ];
        });

        const tableData = [
            [`LABOUR OUTPUT REPORT`],
            [`Period: ${getPeriodText()}`],
            [`Generated on ${new Date().toLocaleString()}`],
            [""], // Spacer
            ["DATE", "SECTIONS", "TOTAL WORKERS", "TOTAL O/T HOURS", "NO OF BAGS", "TOTAL KGS", "AVG LABOUR OUTPUT"],
            ...dataRows
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(tableData);

        // Merges for titles
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Subtitle
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Timestamp
        ];

        // Styles
        const borderAll = {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
        };

        const centerAlign = { horizontal: "center", vertical: "center", wrapText: true };
        const leftAlign = { horizontal: "left", vertical: "center", wrapText: true };
        const topAlign = { horizontal: "center", vertical: "top", wrapText: true };
        const topLeftAlign = { horizontal: "left", vertical: "top", wrapText: true };

        const titleStyle = { font: { bold: true, sz: 16, color: { rgb: "1B6A31" } } };
        const subtitleStyle = { font: { italic: true, sz: 10, color: { rgb: "64748B" } } };

        const headerStyle = {
            fill: { fgColor: { rgb: "1B6A31" } }, // Dark Green Header
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: centerAlign,
            border: borderAll
        };

        const bodyEven = { alignment: topAlign, border: borderAll };
        const bodyOdd = { fill: { fgColor: { rgb: "F9FAFB" } }, alignment: topAlign, border: borderAll };
        const bodyLeftEven = { alignment: topLeftAlign, border: borderAll };
        const bodyLeftOdd = { fill: { fgColor: { rgb: "F9FAFB" } }, alignment: topLeftAlign, border: borderAll };

        // Highlight for Avg Output (matches the blue block in your UI)
        const highlightEven = { font: { bold: true, color: { rgb: "2563EB" } }, fill: { fgColor: { rgb: "EFF6FF" } }, alignment: topAlign, border: borderAll };
        const highlightOdd = { font: { bold: true, color: { rgb: "2563EB" } }, fill: { fgColor: { rgb: "DBEAFE" } }, alignment: topAlign, border: borderAll };

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };

                if (R === 0) worksheet[cellAddress].s = titleStyle;
                else if (R === 1 || R === 2) worksheet[cellAddress].s = subtitleStyle;
                else if (R === 3) continue; // Spacer
                else if (R === 4) worksheet[cellAddress].s = headerStyle;
                else {
                    const isOddRow = R % 2 !== 0;

                    if (C === 1) { // Sections Column (Left Align)
                        worksheet[cellAddress].s = isOddRow ? bodyLeftOdd : bodyLeftEven;
                    } else if (C === 6) { // Avg Labour Output (Blue Highlight)
                        worksheet[cellAddress].s = isOddRow ? highlightOdd : highlightEven;
                    } else { // General numbers
                        worksheet[cellAddress].s = isOddRow ? bodyOdd : bodyEven;
                    }

                    if (C >= 3 && typeof worksheet[cellAddress].v === 'number') {
                        worksheet[cellAddress].z = "#,##0.00"; // Format to 2 decimal places
                    }
                }
            }
        }

        // Set specific column widths
        worksheet['!cols'] = [
            { wch: 15 }, // DATE
            { wch: 30 }, // SECTIONS (Wide for lists)
            { wch: 20 }, // TOTAL WORKERS
            { wch: 20 }, // TOTAL O/T HOURS
            { wch: 15 }, // NO OF BAGS
            { wch: 15 }, // TOTAL KGS
            { wch: 25 }, // AVG LABOUR OUTPUT
        ];

        worksheet['!rows'] = [
            { hpt: 30 }, { hpt: 15 }, { hpt: 20 }, { hpt: 10 }, { hpt: 30 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Labour Output");
        XLSX.writeFile(workbook, `Labour_Output_${getPeriodText().replace(/ /g, "_")}.xlsx`);
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto font-sans flex flex-col min-h-screen bg-[#f3faf7] dark:bg-gray-950 transition-colors duration-300">

            {/* 1. Header Section */}
            <div className="mb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-400 flex items-center gap-2">
                        Labour Output Logs
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Master overview of Labour, Sections & Output metrics
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
                    </button>

                    <button
                        onClick={exportToExcel}
                        className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-[#1B6A31] dark:text-green-400 border border-[#1B6A31] dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>

                    <PDFDownloader
                        title="Labour Output Report"
                        subtitle={`Period: ${getPeriodText()}`}
                        data={getCleanTableData()}
                        headers={[
                            [
                                { content: "Date", styles: { halign: "left" } },
                                { content: "Sections", styles: { halign: "left" } },
                                { content: "Total No. of Workers", styles: { halign: "right" } },
                                { content: "Total O/T Hours", styles: { halign: "right" } },
                                { content: "No of Bags", styles: { halign: "right" } },
                                { content: "Total Kgs", styles: { halign: "right" } },
                                { content: "Average Labour Output", styles: { halign: "right" } },
                            ]
                        ]}
                        uniqueCode={`LOR-${getPeriodText().replace(/ /g, "")}`}
                        fileName={`Labour_Output_${getPeriodText().replace(/ /g, "_")}.pdf`}
                        orientation="portrait"
                        disabled={isLoading || groupedData.length === 0}
                        autoTableOptions={{
                            theme: "grid",
                            headStyles: {
                                fillColor: [27, 106, 49], 
                                textColor: [255, 255, 255], 
                                lineColor: [209, 213, 219],
                                lineWidth: 0.1,
                                fontStyle: "bold",
                            },
                        }}
                    />
                </div>
            </div>

            {/* 2. Filter Section */}
            <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 transition-colors">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pb-3 md:pb-0 md:pr-6 w-full md:w-auto">
                    <Filter size={20} />
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Filter Records
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full">
                    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Month
                        </label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                                setMonth(e.target.value);
                                setFromDate("");
                                setToDate("");
                            }}
                            className="w-full sm:w-44 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
                        />
                    </div>

                    <div className="hidden sm:flex flex-col items-center justify-center px-2">
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 my-1 uppercase">OR</span>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto">
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    setMonth("");
                                }}
                                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                min={fromDate}
                                onChange={(e) => {
                                    setToDate(e.target.value);
                                    setMonth("");
                                }}
                                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Table Container */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden w-full transition-colors">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs tracking-wider border-b border-gray-300 dark:border-gray-700 transition-colors">
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700">Date</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700">Sections</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">Workers / Section</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">O/T Hours / Section</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">No of Bags</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">Total Kgs</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">Avg Labour Output</th>
                                <th className="px-4 py-4 text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                            {isLoading && (
                                <tr>
                                    <td colSpan="8" className="p-16 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] dark:border-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
                                            <p className="font-medium">Loading labour output...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!isLoading && error && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-red-500 dark:text-red-400 font-medium">
                                        {error}
                                    </td>
                                </tr>
                            )}

                            {!isLoading && !error && groupedData.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                            <AlertCircle size={40} className="mb-3 opacity-20" />
                                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                                                No records found for {getPeriodText()}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!isLoading && !error && groupedData.map((group) => {
                                const { date, entries, packingSummary } = group;
                                
                                const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
                                const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
                                const totalBags = Number((packingSummary?.totalBags ?? entries.reduce((sum, item) => sum + (Number(item.noOfBags || 0)), 0)) || 0);
                                const totalKgs = Number((packingSummary?.totalKgs ?? entries.reduce((sum, item) => sum + (Number(item.totalKgs || 0)), 0)) || 0);
                                const labourOutputValue = entries.length > 0 ? (entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length) : 0;

                                return (
                                    <tr key={date} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 align-top">
                                            {date}
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 align-top">
                                            <div className="flex flex-col gap-1">
                                                {entries.map((item, idx) => (
                                                    <span key={idx}>{item.section}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-200 align-top">
                                            <div className="flex flex-col gap-1">
                                                {entries.map((item, idx) => (
                                                    <span key={idx}>{item.noOfLabours || 0}</span>
                                                ))}
                                                {/* Optional line to show the overall total at the bottom of the cell if there are multiple sections */}
                                                {entries.length > 1 && (
                                                    <span className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white">
                                                        {totalWorkers}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top">
                                            <div className="flex flex-col gap-1">
                                                {entries.map((item, idx) => (
                                                    <span key={idx}>{(item.otHours || 0).toFixed(2)}</span>
                                                ))}
                                                {/* Optional line to show the overall total at the bottom of the cell if there are multiple sections */}
                                                {entries.length > 1 && (
                                                    <span className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white">
                                                        {totalOtHours.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top">
                                            {totalBags}
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top">
                                            {totalKgs.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 align-top">
                                            {labourOutputValue.toFixed(2)}
                                        </td>

                                        {/* Actions Cell */}
                                        <td className="px-3 py-3 text-center align-top">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleEditClick(group)}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-green-900/30 rounded transition-all"
                                                    title="Edit Record"
                                                >
                                                    <Edit size={18} />
                                                </button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button
                                                            onClick={() => setRecordToDelete(group)}
                                                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </AlertDialogTrigger>

                                                    <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl border-gray-100 dark:border-gray-700 shadow-xl max-w-md">
                                                        <AlertDialogHeader>
                                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                                                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                            </div>
                                                            <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                                Delete Labour Log
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                                                Are you sure you want to permanently delete the log for{" "}
                                                                <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">
                                                                    {date}
                                                                </span>?
                                                                <br /><br />
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>

                                                        <AlertDialogFooter className="mt-6">
                                                            <AlertDialogCancel
                                                                onClick={() => setRecordToDelete(null)}
                                                                className="border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-6 font-semibold"
                                                            >
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleConfirmDelete}
                                                                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 rounded-lg px-6 font-semibold shadow-sm transition-colors"
                                                            >
                                                                Delete Record
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LabourOutputTable;