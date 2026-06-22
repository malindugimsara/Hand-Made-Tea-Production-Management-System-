import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Download, FileSpreadsheet, FileText, AlertCircle, RefreshCcw, CalendarDays } from 'lucide-react';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import as a function

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

export default function FactoryView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    // Set Default to Current Month
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // State Management
    const [records, setRecords] = useState([]);
    const [bfBalance, setBfBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // Updated: Range Selection State
    const [startMonth, setStartMonth] = useState(currentMonthStr);
    const [endMonth, setEndMonth] = useState(currentMonthStr);

    // Fetch data whenever start or end month changes
    useEffect(() => {
        if (startMonth && endMonth) {
            fetchFactoryLogs();
        }
    }, [startMonth, endMonth]);

    const fetchFactoryLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Updated to send startMonth and endMonth
            const response = await fetch(`${BACKEND_URL}/api/factory-logs?startMonth=${startMonth}&endMonth=${endMonth}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Unauthorized: Please log in.");
                throw new Error("Failed to fetch data from database");
            }

            const data = await response.json();

            setBfBalance(data.bfFromLastMonth || 0);
            setRecords(data.records || []);

        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Could not load data from database.");
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---
    const handleEditClick = (record) => {
        navigate('/factory/edit', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting factory log...');

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`${BACKEND_URL}/api/factory-logs/${recordToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Unauthorized: Please log in again.");
                throw new Error('Failed to delete');
            }

            toast.success("Record deleted successfully!", { id: toastId });
            fetchFactoryLogs();

        } catch (error) {
            console.error("Delete Error:", error);
            toast.error(error.message || "Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };
    
    // --- EXPORT TO EXCEL ---
    const exportToExcel = () => {
    // 1. Prepare raw data
    const tableData = [
        ["DATE", "G/L Today", "G/L To Date", "M/T Today", "M/T To Date", "DISPATCH", "LOCAL SALES", "TOTAL", "RETURN", "FACTORY BALANCE"],
        ["B/F", "-", "-", "-", "-", "-", "-", "-", "-", bfBalance.toFixed(2)],
        ...records.map(r => [
            r.date ? r.date.split('T')[0] : '-',
            (r.greenLeaf?.today || 0).toFixed(2),
            (r.greenLeaf?.toDate || 0).toFixed(2),
            (r.madeTea?.today || 0).toFixed(2),
            (r.madeTea?.toDate || 0).toFixed(2),
            (r.dispatch || 0).toFixed(2),
            (r.localSaleAndGratis || 0).toFixed(2),
            (r.totalOut || 0).toFixed(2),
            (r.returnAmount || 0).toFixed(2),
            (r.factoryBalance || 0).toFixed(2)
        ])
    ];

    // 2. Create Sheet
    const worksheet = XLSX.utils.aoa_to_sheet(tableData);

    // 3. Define Styles
    const headerStyle = {
        fill: { fgColor: { rgb: "1B6A31" } }, // Dark Green
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center" }
    };
    const bfStyle = { fill: { fgColor: { rgb: "E5E7EB" } }, font: { bold: true } }; // Light Gray
    const balanceStyle = { font: { color: { rgb: "1E40AF" }, bold: true } }; // Blue Text

    // 4. Apply Styles to cells
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[cellAddress]) continue;

            if (R === 0) worksheet[cellAddress].s = headerStyle; // Header row
            else if (R === 1) worksheet[cellAddress].s = bfStyle; // B/F row
            else if (C === 9) worksheet[cellAddress].s = balanceStyle; // Balance column
        }
    }

    // 5. Create Workbook and Write
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Factory Logs");
    XLSX.writeFile(workbook, `Factory_Logs_${startMonth}_to_${endMonth}.xlsx`);
};

    // --- EXPORT TO PDF ---
    const exportToPDF = () => {
        const doc = new jsPDF('landscape');
        
        // 1. Add Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(27, 106, 49); // Your dark green
        doc.text(`Factory Logs View: ${startMonth} to ${endMonth}`, 14, 15);

        // 2. Prepare Data
        const tableBody = [
            ["B/F", "-", "-", "-", "-", "-", "-", "-", "-", bfBalance.toFixed(2)],
            ...records.map(r => [
                r.date ? r.date.split('T')[0] : '-',
                (r.greenLeaf?.today || 0).toFixed(2),
                (r.greenLeaf?.toDate || 0).toFixed(2),
                (r.madeTea?.today || 0).toFixed(2),
                (r.madeTea?.toDate || 0).toFixed(2),
                (r.dispatch || 0).toFixed(2),
                (r.localSaleAndGratis || 0).toFixed(2),
                (r.totalOut || 0).toFixed(2),
                (r.returnAmount || 0).toFixed(2),
                (r.factoryBalance || 0).toFixed(2)
            ])
        ];

        // 3. Configure Table
        autoTable(doc, {
            startY: 22,
            head: [
                [
                    { content: 'DATE', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'G/L', colSpan: 2 },
                    { content: 'M/T', colSpan: 2 },
                    { content: 'DISPATCH', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'LOCAL SALES & GRATIS', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'TOTAL', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'RETURN INVOICE', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'FACTORY BALANCE', rowSpan: 2, styles: { valign: 'middle' } }
                ],
                ['Today', 'To Date', 'Today', 'To Date']
            ],
            body: tableBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [27, 106, 49], // Your dark green
                textColor: [255, 255, 255],
                halign: 'center',
                fontStyle: 'bold'
            },
            styles: { 
                fontSize: 9, 
                halign: 'center',
                cellPadding: 3 
            },
            columnStyles: {
                9: { fontStyle: 'bold', textColor: [30, 64, 175] } // Blue text for Balance column
            },
            didParseCell: function (data) {
                // Style the B/F row (index 0 of body)
                if (data.row.index === 0 && data.section === 'body') {
                    data.cell.styles.fillColor = [243, 244, 246]; // Light gray background
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(`Factory_Report_${startMonth}_to_${endMonth}.pdf`);
    };
    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto font-sans flex flex-col min-h-0">
            <Toaster position="top-right" />

            {/* Header & Controls */}
            <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2">
                        Factory Logs View
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Master view of G/L, M/T, Dispatch, and Balances</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    {/* Range Month Picker UI */}
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm h-[40px]">
                        <CalendarDays size={18} className="text-gray-500" />
                        <span className="text-sm text-gray-500 font-medium">From:</span>
                        <input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="outline-none text-sm font-semibold text-gray-700 bg-transparent cursor-pointer w-28"
                        />
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500 font-medium">To:</span>
                        <input
                            type="month"
                            value={endMonth}
                            min={startMonth} // Prevents picking an end date before the start date
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="outline-none text-sm font-semibold text-gray-700 bg-transparent cursor-pointer w-28"
                        />
                    </div>

                    <button onClick={fetchFactoryLogs} disabled={loading} className="px-4 py-2 h-[40px] bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-2 h-[40px] bg-white text-[#1B6A31] border border-[#1B6A31] hover:bg-green-50 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all">
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                    <button onClick={exportToPDF} className="px-4 py-2 h-[40px] bg-[#1B6A31] text-white hover:bg-[#145325] rounded-md text-sm font-semibold flex items-center gap-2 shadow-md transition-all">
                        <FileText size={18} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden w-full">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Fetching logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse whitespace-nowrap">

                            <thead>
                                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-xs tracking-wider border-b border-gray-300">
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle w-24 bg-gray-200">Date</th>
                                    <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-[#8CC63F]/20 text-[#1B6A31]">G/L</th>
                                    <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-purple-100 text-purple-800">M/T</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50">Dispatch</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50 whitespace-normal min-w-[120px]">Local Sales &<br />Gratis</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-900 bg-orange-100 font-extrabold whitespace-normal min-w-[140px]">Total<br /><span className="text-[10px] font-normal">(Local Sale + Dispatch)</span></th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-red-700 bg-red-50">Return<br />Invoice</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-blue-800 bg-blue-50 font-extrabold">Factory<br />Balance</th>
                                    <th rowSpan="2" className="px-4 py-4 align-middle text-gray-600 bg-gray-100 w-24">Action</th>
                                </tr>
                                <tr className="bg-gray-50 text-gray-600 text-xs border-b-2 border-gray-400">
                                    <th className="px-3 py-2 border-r border-gray-300 font-semibold">Today</th>
                                    <th className="px-3 py-2 border-r border-gray-300 font-semibold">To Date</th>
                                    <th className="px-3 py-2 border-r border-gray-300 font-semibold">Today</th>
                                    <th className="px-3 py-2 border-r border-gray-300 font-semibold">To Date</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {/* B/F ROW */}
                                <tr className="bg-gray-100 font-bold text-gray-800 border-b-2 border-red-400">
                                    <td className="px-4 py-3 border-r border-gray-300 bg-gray-200">B/F</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 bg-orange-50/50 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-400">-</td>
                                    <td className="px-3 py-3 border-r border-gray-300 bg-blue-50/50 text-blue-900">{bfBalance > 0 ? bfBalance.toFixed(2) : '0.00'}</td>
                                    <td className="px-3 py-3 bg-gray-100"></td>
                                </tr>

                                {/* DYNAMIC DATA ROWS */}
                                {records.length > 0 ? (
                                    records.map((record) => {
                                        // Use full date (e.g., 2026-06-01) in case they select multiple months
                                        const displayDay = record.date ? record.date.split('T')[0] : '';

                                        return (
                                            <tr key={record._id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-4 py-3 border-r border-gray-300 font-semibold bg-gray-50 text-gray-700 relative text-left">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span>{displayDay}</span>
                                                        {record.isEdited && (
                                                            <span className="text-[9px] text-orange-500 font-medium whitespace-nowrap">
                                                                *Edited
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 border-r border-gray-200">{(record.greenLeaf?.today || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 border-r border-gray-300 font-medium">{(record.greenLeaf?.toDate || 0).toFixed(2)}</td>

                                                <td className="px-3 py-3 border-r border-gray-200">{(record.madeTea?.today || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 border-r border-gray-300 font-medium">{(record.madeTea?.toDate || 0).toFixed(2)}</td>

                                                <td className="px-3 py-3 border-r border-gray-200 text-gray-600">{(record.dispatch || 0) === 0 ? '-' : (record.dispatch).toFixed(2)}</td>
                                                <td className="px-3 py-3 border-r border-gray-300 text-gray-600">{(record.localSaleAndGratis || 0) === 0 ? '-' : (record.localSaleAndGratis).toFixed(2)}</td>

                                                <td className="px-3 py-3 border-r border-gray-300 font-bold text-gray-800 bg-orange-50/30">{(record.totalOut || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 border-r border-gray-300 text-red-600">{(record.returnAmount || 0) === 0 ? '-' : (record.returnAmount).toFixed(2)}</td>
                                                <td className="px-3 py-3 border-r border-gray-300 font-bold text-blue-800 bg-blue-50/30">{(record.factoryBalance || 0).toFixed(2)}</td>

                                                {/* ACTIONS CELL */}
                                                <td className="px-3 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleEditClick(record)}
                                                            className="p-1.5 text-gray-400 hover:text-[#1B6A31] hover:bg-[#8CC63F]/20 rounded transition-all"
                                                            title="Edit Record"
                                                        >
                                                            <MdOutlineEdit size={20} />
                                                        </button>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <button
                                                                    onClick={() => setRecordToDelete(record)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                                    title="Delete Record"
                                                                >
                                                                    <MdOutlineDeleteOutline size={20} />
                                                                </button>
                                                            </AlertDialogTrigger>

                                                            <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                                                                <AlertDialogHeader>
                                                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200">
                                                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                                                    </div>
                                                                    <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Factory Log</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-gray-500 text-base">
                                                                        Are you sure you want to permanently delete the log for <span className="font-bold text-gray-800 ml-1">{displayDay}</span>?<br /><br />
                                                                        This action cannot be undone and will affect running balances.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="mt-6">
                                                                    <AlertDialogCancel onClick={() => setRecordToDelete(null)} className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-6 font-semibold">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors">Delete Record</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="11" className="p-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <AlertCircle size={40} className="mb-3 opacity-20" />
                                                <p className="text-lg font-medium text-gray-500">No factory logs found between {startMonth} and {endMonth}</p>
                                                <p className="text-sm mt-1">Submit new data from the entry form.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}