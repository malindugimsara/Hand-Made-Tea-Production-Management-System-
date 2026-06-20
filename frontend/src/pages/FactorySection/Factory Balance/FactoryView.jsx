import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Download, FileSpreadsheet, FileText, AlertCircle, RefreshCcw, CalendarDays } from 'lucide-react';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

    // State Management
    const [records, setRecords] = useState([]);
    const [bfBalance, setBfBalance] = useState(0); // Dynamic Brought Forward Balance
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Default: Current Month

    // Fetch data from Database whenever the selected month changes
    useEffect(() => {
        fetchFactoryLogs();
    }, [selectedMonth]);

    const fetchFactoryLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token'); 

            // Added Auth Header to GET request to prevent 401 Unauthorized
            const response = await fetch(`${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`, {
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

            // Fixed Endpoint: Now properly points to factory-logs
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
            fetchFactoryLogs(); // Refresh the table

        } catch (error) {
            console.error("Delete Error:", error);
            toast.error(error.message || "Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // --- EXPORT TO EXCEL ---
    const exportToExcel = () => {
        const exportData = [
            {
                "Date": "B/F",
                "G/L - Today": "-", "G/L - To Date": "-",
                "M/T - Today": "-", "M/T - To Date": "-",
                "Dispatch": "-", "Local Sales & Gratis": "-", "Total Out": "-",
                "Return Invoice": "-", "Factory Balance": bfBalance
            },
            ...records.map(row => ({
                "Date": row.date ? row.date.split('T')[0].split('-')[2] : '-', 
                "G/L - Today": row.greenLeaf?.today || 0,
                "G/L - To Date": row.greenLeaf?.toDate || 0,
                "M/T - Today": row.madeTea?.today || 0,
                "M/T - To Date": row.madeTea?.toDate || 0,
                "Dispatch": row.dispatch || 0,
                "Local Sales & Gratis": row.localSaleAndGratis || 0,
                "Total Out": row.totalOut || 0,
                "Return Invoice": row.returnAmount || 0,
                "Factory Balance": row.factoryBalance || 0
            }))
        ];

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Factory View");
        XLSX.writeFile(workbook, `Factory_Logs_${selectedMonth}.xlsx`);
    };

    // --- EXPORT TO PDF ---
    const exportToPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text(`Factory View - ${selectedMonth}`, 14, 15);

        const tableBody = [
            ["B/F", "-", "-", "-", "-", "-", "-", "-", "-", bfBalance.toFixed(2)],
            ...records.map(r => [
                r.date ? r.date.split('T')[0].split('-')[2] : '-',
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

        doc.autoTable({
            startY: 20,
            head: [
                [{ content: 'Date', rowSpan: 2 }, { content: 'G/L', colSpan: 2, styles: { halign: 'center' } }, { content: 'M/T', colSpan: 2, styles: { halign: 'center' } }, { content: 'Dispatch', rowSpan: 2 }, { content: 'Local Sales & Gratis', rowSpan: 2 }, { content: 'Total Out', rowSpan: 2 }, { content: 'Return Invoice', rowSpan: 2 }, { content: 'Factory Balance', rowSpan: 2 }],
                ['Today', 'To Date', 'Today', 'To Date']
            ],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [27, 106, 49] },
            styles: { fontSize: 9, halign: 'center' },
            didParseCell: function (data) {
                if (data.row.index === 0 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.save(`Factory_Logs_${selectedMonth}.pdf`);
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
                    {/* Month Picker */}
                    <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm h-[40px]">
                        <CalendarDays size={18} className="text-gray-500 mr-2" />
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="outline-none text-sm font-semibold text-gray-700 bg-transparent cursor-pointer"
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
                        <p className="font-medium">Fetching logs for {selectedMonth}...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
                            
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-xs tracking-wider border-b border-gray-300">
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle w-16 bg-gray-200">Date</th>
                                    <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-[#8CC63F]/20 text-[#1B6A31]">G/L</th>
                                    <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-purple-100 text-purple-800">M/T</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50">Dispatch</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50 whitespace-normal min-w-[120px]">Local Sales &<br/>Gratis</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-900 bg-orange-100 font-extrabold whitespace-normal min-w-[140px]">Total<br/><span className="text-[10px] font-normal">(Local Sale + Dispatch)</span></th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-red-700 bg-red-50">Return<br/>Invoice</th>
                                    <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-blue-800 bg-blue-50 font-extrabold">Factory<br/>Balance</th>
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
                                        const displayDay = record.date ? record.date.split('T')[0].split('-')[2] : '';

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
                                                                    Are you sure you want to permanently delete the log for Day <span className="font-bold text-gray-800 ml-1">{displayDay}</span>?<br/><br/>
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
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan="11" className="p-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <AlertCircle size={40} className="mb-3 opacity-20" />
                                                <p className="text-lg font-medium text-gray-500">No factory logs found for {selectedMonth}</p>
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