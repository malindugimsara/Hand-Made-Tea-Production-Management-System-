import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Fan, Zap, Clock, AlertCircle, Calendar, RefreshCw, Leaf } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

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

import { useNavigate } from 'react-router-dom';

export default function ViewDehydratorRecords() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer';

    // Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [trialFilter, setTrialFilter] = useState('');

    const navigate = useNavigate(); 
    
    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRecords = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/dehydrator`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if(response.status === 401) {
                    throw new Error("Unauthorized. Please log in.");
                }
                throw new Error("Failed to fetch data");
            }

            const data = await response.json();
            
            // --- Process Data to check for edits ---
            const processedData = data.map(rec => {
                const createdTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const updatedTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
                
                // If updated timestamp is > 5 seconds after creation timestamp, it counts as edited
                const isEdited = createdTime > 0 && updatedTime > 0 && (updatedTime - createdTime) > 5000;
                const lastUpdatedDate = isEdited ? new Date(rec.updatedAt).toISOString().split('T')[0] : '';
                
                return {
                    ...rec,
                    isEdited,
                    lastUpdatedDate
                };
            });

            const sortedData = processedData.sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setRecords(sortedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRecords = records.filter(record => {
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const trialMatch = !trialFilter || record.trial.toLowerCase().includes(trialFilter.toLowerCase());
        return dateMatch && trialMatch;
    });

    const totalHours = filteredRecords.reduce((sum, record) => sum + (Number(record.timePeriodHours) || 0), 0);
    const totalUnits = filteredRecords.reduce((sum, record) => sum + (Number(record.totalUnits) || 0), 0);

    const handleEditClick = (record) => {
        navigate('/edit-dehydrator', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/dehydrator/${recordToDelete._id}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                toast.success("Record deleted successfully!", { id: toastId });
                fetchRecords(); 
            } else {
                if(response.status === 403) {
                     toast.error("Access Denied. Only Admins can delete.", { id: toastId });
                } else {
                     toast.error("Failed to delete record.", { id: toastId });
                }
            }
        } catch (error) {
            toast.error("Network error while deleting.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // Prepare PDF Data Function
    const getPdfData = () => {
        const tableRows = filteredRecords.map(record => {
            const baseDate = new Date(record.date).toISOString().split('T')[0];
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited: ${record.lastUpdatedDate})` : baseDate;

            return [
                pdfDateCell,
                record.trial,
                record.meterStart,
                record.meterEnd,
                record.totalUnits,
                record.timePeriodHours
            ];
        });

        tableRows.push([
            "GRAND TOTAL",
            "-",
            "-",
            "-",
            `${totalUnits} Pts`,
            `${totalHours.toFixed(1)} Hrs`
        ]);

        return tableRows;
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto font-sans relative">
            
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2"> <Leaf size={28} /> Dehydrator Machine Records</h2>
                    <p className="text-sm text-gray-500 mt-1">Overview of Dehydrator Electricity and Time Usage</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Dehydrator Machine Records"
                        subtitle={`Filters -> Date: ${startDate || 'All'} to ${endDate || 'All'} | Trial: ${trialFilter || 'All'}`}
                        headers={["Date", "Trial", "Start Meter", "End Meter", "Total Pts", "Time (Hrs)"]}
                        data={getPdfData()}
                        fileName={`Dehydrator_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="portrait"
                        disabled={loading || filteredRecords.length === 0}
                    />

                    <button 
                        onClick={fetchRecords}
                        disabled={loading}
                        className={`px-4 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8]'}`}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">FROM DATE</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded p-2 text-sm outline-none focus:border-[#8CC63F]" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">TO DATE</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded p-2 text-sm outline-none focus:border-[#8CC63F]" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">TRIAL (SEARCH ITEM)</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Mango, Kiwi..." 
                        value={trialFilter} 
                        onChange={(e) => setTrialFilter(e.target.value)} 
                        className="border rounded p-2 text-sm outline-none focus:border-[#8CC63F]" 
                    />
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden self-start w-full max-w-full">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading dehydrator records...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 align-bottom w-32">
                                        <div className="flex items-center gap-1"><Calendar size={14}/> Date</div>
                                    </th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 align-bottom w-40">
                                        <div className="flex items-center gap-1"><Fan size={14}/> Trial</div>
                                    </th>
                                    <th colSpan="3" className="px-4 py-2 font-bold text-orange-700 border-r border-gray-200 bg-orange-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Zap size={14}/> Electricity Meter Reading</div>
                                    </th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 align-bottom text-center w-32">
                                        <div className="flex flex-col items-center gap-1"><Clock size={14}/> Time Period<br/>(hours)</div>
                                    </th>
                                    {!isViewer && (
                                        <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50">Action</th>
                                    )}
                                </tr>
                                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60 w-28">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60 w-28">End</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200 w-28">Total Pts</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => (
                                        <tr key={record._id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-4 py-3 border-r border-gray-100 align-top">
                                                <div className="flex flex-col items-start gap-1 mt-1">
                                                    <span className="font-semibold text-gray-800">
                                                        {new Date(record.date).toISOString().split('T')[0]}
                                                    </span>
                                                    {record.isEdited && (
                                                        <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold w-max">
                                                            Edited: {record.lastUpdatedDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-gray-100 font-medium text-[#1B6A31]">
                                                {record.trial}
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-600">
                                                {record.meterStart}
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-600">
                                                {record.meterEnd}
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                <span className="font-bold text-orange-600">{record.totalUnits}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                <span className="font-bold text-blue-700">{record.timePeriodHours}</span>
                                            </td>
                                            
                                            {!isViewer && (
                                                <td className="px-3 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-[#1B6A31] hover:bg-[#8CC63F]/20 rounded transition-all">
                                                            <MdOutlineEdit size={20} />
                                                        </button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                                                                    <MdOutlineDeleteOutline size={20} />
                                                                </button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                                                                <AlertDialogHeader>
                                                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200">
                                                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                                                    </div>
                                                                    <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Record</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-gray-500 text-base">
                                                                        Are you sure you want to delete the dehydrator record for <span className="font-bold text-gray-800 ml-1">{record.trial}</span> on <span className="font-bold text-gray-800">{record.date}</span>?
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
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isViewer ? "6" : "7"} className="p-16 text-center text-gray-400">
                                            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-lg font-medium text-gray-500">No records found matching filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            
                            {/* Footer for Totals */}
                            {filteredRecords.length > 0 && (
                                <tfoot className="bg-gray-100/90 border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan="4" className="px-4 py-4 text-right font-bold text-gray-800 tracking-wider uppercase border-r border-gray-200">
                                            GRAND TOTAL
                                        </td>
                                        <td className="px-3 py-4 text-center font-black text-orange-700 text-lg border-r border-gray-200">
                                            {totalUnits} Pts
                                        </td>
                                        <td className="px-3 py-4 text-center font-black text-blue-700 text-lg border-r border-gray-200">
                                            {totalHours.toFixed(1)} Hrs
                                        </td>
                                        {!isViewer && <td></td>}
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