import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    Filter, RefreshCcw, FileSpreadsheet, AlertCircle, FileText,
    Users, CalendarDays, TrendingUp, History
} from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

// IMPORT EXCEL STYLING LIBRARY
import * as XLSX from 'xlsx-js-style';
import PDFDownloader from "@/components/PDFDownloader";

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
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const navigate = useNavigate();
    const location = useLocation();
    
    // Date Helpers
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const currentMonthStr = today.toISOString().slice(0, 7);

    // --- State ---
    const [rawRecords, setRawRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // --- Dark Mode State ---
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark" || false);

    // --- Filter State ---
    const [filterMonth, setFilterMonth] = useState(() => location.state?.returnMonth || currentMonthStr);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
    }, [isDarkMode]);

    const getPeriodText = () => {
        if (fromDate && toDate) return `${fromDate} to ${toDate}`;
        if (filterMonth) return filterMonth;
        return "All Time";
    };

    // --- Local Storage Helper ---
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
            return { totalBags: 0, totalKgs: 0 };
        }
    }, []);

    // --- Fetch Data ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/labour-output`);
            if (!response.ok) throw new Error("Failed to fetch data");
            const result = await response.json();
            setRawRecords(result || []);
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Error fetching records");
        } finally {
            setIsLoading(false);
        }
    }, [BACKEND_URL]);

    useEffect(() => {
        fetchData();
        const handlePackingDataChange = () => fetchData();
        window.addEventListener("storage", handlePackingDataChange);
        window.addEventListener("factoryPackingUpdated", handlePackingDataChange);
        return () => {
            window.removeEventListener("storage", handlePackingDataChange);
            window.removeEventListener("factoryPackingUpdated", handlePackingDataChange);
        };
    }, [fetchData]);

    // --- Grouping, Filtering & Stats Calculations ---
    const { filteredGroups, stats } = useMemo(() => {
        // 1. Group raw records by date
        const grouped = rawRecords.reduce((acc, record) => {
            const date = record.date ? record.date.split('T')[0] : 'Unknown Date';
            if (!acc[date]) acc[date] = [];
            acc[date].push(record);
            return acc;
        }, {});

        // 2. Format into array and attach packing summaries
        const allGroups = Object.entries(grouped).map(([date, entries]) => ({
            date,
            entries,
            packingSummary: getPackingSummaryForDate(date)
        }));

        // 3. Initialize Stat Trackers for the specific cards
        let todayWorkers = 0, todayTotalOutput = 0, todaySectionCount = 0;
        let yesterdayWorkers = 0, yesterdayTotalOutput = 0, yesterdaySectionCount = 0;
        let monthWorkers = 0, monthTotalOutput = 0, monthSectionCount = 0;

        // 4. Calculate Stats
        allGroups.forEach(group => {
            const groupWorkers = group.entries.reduce((sum, e) => sum + (e.noOfLabours || 0), 0);
            const groupOutputSum = group.entries.reduce((sum, e) => sum + (e.labourOutput || 0), 0);
            const groupSections = group.entries.length;

            // Today
            if (group.date === todayStr) {
                todayWorkers += groupWorkers;
                todayTotalOutput += groupOutputSum;
                todaySectionCount += groupSections;
            }
            
            // Yesterday
            if (group.date === yesterdayStr) {
                yesterdayWorkers += groupWorkers;
                yesterdayTotalOutput += groupOutputSum;
                yesterdaySectionCount += groupSections;
            }

            // Current Month
            if (group.date.startsWith(currentMonthStr)) {
                monthWorkers += groupWorkers;
                monthTotalOutput += groupOutputSum;
                monthSectionCount += groupSections;
            }
        });

        // 5. Filter Data for UI Table
        let filtered = allGroups;
        if (filterMonth) {
            filtered = filtered.filter(g => g.date.startsWith(filterMonth));
        } else if (fromDate && toDate) {
            filtered = filtered.filter(g => g.date >= fromDate && g.date <= toDate);
        }

        // Sort descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            filteredGroups: filtered,
            stats: {
                today: { 
                    workers: todayWorkers, 
                    avgOutput: todaySectionCount ? (todayTotalOutput / todaySectionCount) : 0 
                },
                yesterday: { 
                    workers: yesterdayWorkers, 
                    avgOutput: yesterdaySectionCount ? (yesterdayTotalOutput / yesterdaySectionCount) : 0 
                },
                currentMonth: { 
                    workers: monthWorkers, 
                    avgOutput: monthSectionCount ? (monthTotalOutput / monthSectionCount) : 0 
                }
            }
        };
    }, [rawRecords, filterMonth, fromDate, toDate, getPackingSummaryForDate, todayStr, yesterdayStr, currentMonthStr]);


    // --- Actions ---
    const handleEditClick = (groupData) => {
        navigate("/factory/labouroutput/edit", { state: { recordData: groupData } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading("Deleting records...");
        try {
            const response = await fetch(`${BACKEND_URL}/api/labour-output/date/${recordToDelete.date}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("Failed to delete the record");
            toast.success("Records deleted successfully!", { id: toastId });
            fetchData();
        } catch (error) {
            toast.error(error.message || "Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // --- PDF Export Structuring ---
    const getCleanTableData = () => {
        return filteredGroups.map((group) => {
            const { date, entries, packingSummary } = group;
            const sections = entries.map(item => item.section).join('\n');
            const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
            const workersStr = entries.map(item => item.noOfLabours || 0).join('\n') + (entries.length > 1 ? `\n---\n${totalWorkers}` : '');
            const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
            const otHoursStr = entries.map(item => (item.otHours || 0).toFixed(2)).join('\n') + (entries.length > 1 ? `\n---\n${totalOtHours.toFixed(2)}` : '');
            const totalBags = Number((packingSummary?.totalBags ?? entries.reduce((sum, item) => sum + (Number(item.noOfBags || 0)), 0)) || 0);
            const totalKgs = Number((packingSummary?.totalKgs ?? entries.reduce((sum, item) => sum + (Number(item.totalKgs || 0)), 0)) || 0);
            const avgLabourOutput = entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length;

            return [ date, sections, workersStr, otHoursStr, totalBags.toString(), totalKgs.toFixed(2), avgLabourOutput.toFixed(2) ];
        });
    };

    // --- Excel Export (Preserved from your code) ---
    const exportToExcel = () => {
        if (filteredGroups.length === 0) return toast.error("No data to export.");
        
        const dataRows = filteredGroups.map(group => {
            const { date, entries } = group;
            const sections = entries.map(item => item.section).join('\n');
            const totalWorkers = entries.reduce((sum, item) => sum + (item.noOfLabours || 0), 0);
            const totalOtHours = entries.reduce((sum, item) => sum + (item.otHours || 0), 0);
            const totalBags = Number((group?.packingSummary?.totalBags ?? entries.reduce((sum, item) => sum + (Number(item.noOfBags || 0)), 0)) || 0);
            const totalKgs = Number((group?.packingSummary?.totalKgs ?? entries.reduce((sum, item) => sum + (Number(item.totalKgs || 0)), 0)) || 0);
            const avgLabourOutput = entries.length > 0 ? entries.reduce((sum, item) => sum + (item.labourOutput || 0), 0) / entries.length : 0;

            return [ date, sections, Number(totalWorkers), Number(totalOtHours.toFixed(2)), Number(totalBags), Number(totalKgs.toFixed(2)), Number(avgLabourOutput.toFixed(2)) ];
        });

        const tableData = [
            [`LABOUR OUTPUT REPORT`], [`Period: ${getPeriodText()}`], [`Generated on ${new Date().toLocaleString()}`], [""],
            ["DATE", "SECTIONS", "TOTAL WORKERS", "TOTAL O/T HOURS", "NO OF BAGS", "TOTAL KGS", "AVG LABOUR OUTPUT"],
            ...dataRows
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(tableData);
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
        ];

        const borderAll = { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } }, left: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "CBD5E1" } } };
        const centerAlign = { horizontal: "center", vertical: "center", wrapText: true };
        const titleStyle = { font: { bold: true, sz: 16, color: { rgb: "1B6A31" } } };
        const headerStyle = { fill: { fgColor: { rgb: "1B6A31" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: centerAlign, border: borderAll };
        const bodyEven = { alignment: { horizontal: "center", vertical: "top", wrapText: true }, border: borderAll };
        const bodyOdd = { fill: { fgColor: { rgb: "F9FAFB" } }, alignment: { horizontal: "center", vertical: "top", wrapText: true }, border: borderAll };

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };

                if (R === 0) worksheet[cellAddress].s = titleStyle;
                else if (R === 1 || R === 2) worksheet[cellAddress].s = { font: { italic: true, sz: 10, color: { rgb: "64748B" } } };
                else if (R === 3) continue;
                else if (R === 4) worksheet[cellAddress].s = headerStyle;
                else {
                    worksheet[cellAddress].s = R % 2 !== 0 ? bodyOdd : bodyEven;
                    if (C >= 3 && typeof worksheet[cellAddress].v === 'number') worksheet[cellAddress].z = "#,##0.00";
                }
            }
        }
        worksheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Labour Output");
        XLSX.writeFile(workbook, `Labour_Output_${getPeriodText().replace(/ /g, "_")}.xlsx`);
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto font-sans flex flex-col min-h-screen bg-[#f3faf7] dark:bg-gray-950 transition-colors duration-300">

            {/* TOP HEADER & BUTTONS */}
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
                    <button onClick={fetchData} disabled={isLoading} className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all">
                        <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button onClick={exportToExcel} disabled={filteredGroups.length === 0} className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-[#1B6A31] dark:text-green-400 border border-[#1B6A31] dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                    <PDFDownloader
                        title="Labour Output Report"
                        subtitle={`Period: ${getPeriodText()}`}
                        data={getCleanTableData()}
                        headers={[[
                            { content: "Date", styles: { halign: "left" } }, { content: "Sections", styles: { halign: "left" } },
                            { content: "Total Workers", styles: { halign: "right" } }, { content: "O/T Hours", styles: { halign: "right" } },
                            { content: "No of Bags", styles: { halign: "right" } }, { content: "Total Kgs", styles: { halign: "right" } },
                            { content: "Avg Output", styles: { halign: "right" } }
                        ]]}
                        uniqueCode={`LOR-${getPeriodText().replace(/ /g, "")}`}
                        fileName={`Labour_Output_${getPeriodText().replace(/ /g, "_")}.pdf`}
                        orientation="portrait"
                        disabled={isLoading || filteredGroups.length === 0}
                        autoTableOptions={{
                            theme: "grid",
                            headStyles: { fillColor: [27, 106, 49], textColor: [255, 255, 255], fontStyle: "bold" }
                        }}
                    />
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 transition-colors">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pb-3 md:pb-0 md:pr-6 w-full md:w-auto">
                    <Filter size={20} />
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Filter Period</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full">
                    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Month</label>
                        <input type="month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFromDate(""); setToDate(""); }} className="w-full sm:w-44 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer" />
                    </div>
                    <div className="hidden sm:flex flex-col items-center justify-center px-2">
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 my-1 uppercase">OR</span>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto">
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">From Date</label>
                            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setFilterMonth(""); }} className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">To Date</label>
                            <input type="date" value={toDate} min={fromDate} onChange={(e) => { setToDate(e.target.value); setFilterMonth(""); }} className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer" />
                        </div>
                    </div>
                </div>
            </div>

            {/* UPDATED SUMMARY CARDS (Yesterday, Today, Monthly Average) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                
                {/* YESTERDAY CARD */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                        <History size={28} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Yesterday</h3>
                        <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                            Avg: {stats.yesterday.avgOutput.toFixed(1)} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Workers: {stats.yesterday.workers}
                        </div>
                    </div>
                </div>

                {/* TODAY CARD */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                        <CalendarDays size={28} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Today</h3>
                        <div className="text-xl font-black text-teal-700 dark:text-teal-400">
                            Avg: {stats.today.avgOutput.toFixed(1)} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Workers: {stats.today.workers}
                        </div>
                    </div>
                </div>

                {/* MONTHLY AVERAGE CARD */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Monthly Average</h3>
                        <div className="text-xl font-black text-blue-700 dark:text-blue-400">
                            Avg: {stats.currentMonth.avgOutput.toFixed(1)} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Workers: {stats.currentMonth.workers}
                        </div>
                    </div>
                </div>

            </div>

            {/* TABLE CONTAINER */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden w-full transition-colors">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] tracking-wider border-b border-gray-300 dark:border-gray-700">
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700">Date</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700">Sections</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">Workers / Section</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">O/T Hours / Section</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">No of Bags</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right">Total Kgs</th>
                                <th className="px-6 py-4 border-r border-gray-300 dark:border-gray-700 text-right text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">Avg Labour Output</th>
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

                            {!isLoading && filteredGroups.length === 0 && (
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

                            {!isLoading && filteredGroups.map((group) => {
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
                                                {entries.map((item, idx) => <span key={idx}>{item.section}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-900 dark:text-gray-200 align-top">
                                            <div className="flex flex-col gap-1">
                                                {entries.map((item, idx) => <span key={idx}>{item.noOfLabours || 0}</span>)}
                                                {entries.length > 1 && <span className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white">{totalWorkers}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top">
                                            <div className="flex flex-col gap-1">
                                                {entries.map((item, idx) => <span key={idx}>{(item.otHours || 0).toFixed(2)}</span>)}
                                                {entries.length > 1 && <span className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white">{totalOtHours.toFixed(2)}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top font-semibold">{totalBags}</td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right text-gray-600 dark:text-gray-400 align-top font-semibold">{totalKgs.toFixed(2)}</td>
                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 align-top">
                                            {labourOutputValue.toFixed(2)}
                                        </td>
                                        
                                        <td className="px-3 py-3 text-center align-top">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleEditClick(group)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all" title="Edit Record">
                                                    <MdOutlineEdit size={20} />
                                                </button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button onClick={() => setRecordToDelete(group)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all" title="Delete Record">
                                                            <MdOutlineDeleteOutline size={20} />
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl border-gray-100 dark:border-gray-700 shadow-xl max-w-md">
                                                        <AlertDialogHeader>
                                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                                                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                            </div>
                                                            <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Labour Log</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                                                Are you sure you want to permanently delete the log for <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">{date}</span>?
                                                                <br /><br />This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-6">
                                                            <AlertDialogCancel onClick={() => setRecordToDelete(null)} className="border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-6 font-semibold">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 rounded-lg px-6 font-semibold shadow-sm transition-colors">Delete Record</AlertDialogAction>
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