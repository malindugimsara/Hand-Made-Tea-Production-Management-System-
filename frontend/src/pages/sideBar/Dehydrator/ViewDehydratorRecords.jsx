import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Fan, Zap, Clock, AlertCircle, Calendar, RefreshCw, Scale, Droplets, Users, Banknote, FilterX } from "lucide-react";
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

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer';

    // --- FILTER STATES ---
    const [filterMonth, setFilterMonth] = useState('');
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
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401) throw new Error("Unauthorized. Please log in.");
                throw new Error("Failed to fetch data");
            }

            const data = await response.json();
            
            const processedData = data.map(rec => {
                const createdTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const updatedTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
                const isEdited = createdTime > 0 && updatedTime > 0 && (updatedTime - createdTime) > 5000;
                const lastUpdatedDate = isEdited ? new Date(rec.updatedAt).toISOString().split('T')[0] : '';
                
                const trialsArray = rec.trialsData && rec.trialsData.length > 0 
                    ? rec.trialsData 
                    : (rec.trial ? [{ 
                        trialName: rec.trial, 
                        startWeight: rec.startWeight, 
                        endWeight: rec.endWeight, 
                        moisturePercentage: rec.moisturePercentage 
                      }] : []);

                const searchString = trialsArray.map(t => t.trialName).join(' ');
                
                const trialNamesPDF = trialsArray.map(t => t.trialName).join('\n');
                const moisturesPDF = trialsArray.map(t => `${t.moisturePercentage}%`).join('\n');
                const startWeightsPDF = trialsArray.map(t => `${t.startWeight} kg`).join('\n');
                const endWeightsPDF = trialsArray.map(t => `${t.endWeight} kg`).join('\n');

                const totalStartWt = trialsArray.reduce((sum, t) => sum + (Number(t.startWeight) || 0), 0);
                const totalEndWt = trialsArray.reduce((sum, t) => sum + (Number(t.endWeight) || 0), 0);

                return {
                    ...rec,
                    trialsArray,
                    searchString,
                    trialNamesPDF,
                    moisturesPDF,
                    startWeightsPDF,
                    endWeightsPDF,
                    totalStartWt,
                    totalEndWt,
                    isEdited,
                    lastUpdatedDate,
                    editedBy: rec.updatedBy || rec.editorName || 'Unknown User' 
                };
            });

            // Default sorting for UI: Newest First
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

    const filteredRecords = records.filter(record => {
        const monthMatch = !filterMonth || record.date.startsWith(filterMonth);
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const trialMatch = !trialFilter || record.searchString.toLowerCase().includes(trialFilter.toLowerCase());
        return monthMatch && dateMatch && trialMatch;
    });

    const totalHours = filteredRecords.reduce((sum, record) => sum + (Number(record.timePeriodHours) || 0), 0);
    const totalUnits = filteredRecords.reduce((sum, record) => sum + (Number(record.totalUnits) || 0), 0);
    const totalStartWeight = filteredRecords.reduce((sum, record) => sum + (Number(record.totalStartWt) || 0), 0);
    const totalEndWeight = filteredRecords.reduce((sum, record) => sum + (Number(record.totalEndWt) || 0), 0);
    const totalLabourHours = filteredRecords.reduce((sum, record) => sum + (Number(record.labourHours) || 0), 0);
    const totalLabourCost = filteredRecords.reduce((sum, record) => sum + (Number(record.totalLabourCost) || 0), 0);
    const totalElecCost = filteredRecords.reduce((sum, record) => sum + (Number(record.totalElectricityCost) || 0), 0);

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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Record deleted successfully!", { id: toastId });
                fetchRecords(); 
            } else {
                if(response.status === 403) toast.error("Access Denied. Only Admins can delete.", { id: toastId });
                else toast.error("Failed to delete record.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error while deleting.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    const clearFilters = () => {
        setFilterMonth('');
        setStartDate('');
        setEndDate('');
        setTrialFilter('');
    };

    const getPdfData = () => {
        // --- FIX: Sort chronologically (Oldest to Newest) for the PDF ---
        const pdfSortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

        const tableRows = pdfSortedRecords.map(record => {
            const baseDate = new Date(record.date).toISOString().split('T')[0];
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited by ${record.editedBy} on ${record.lastUpdatedDate})` : baseDate;

            return [
                pdfDateCell,
                record.trialNamesPDF, 
                record.startWeightsPDF, 
                record.endWeightsPDF,   
                record.moisturesPDF, 
                record.meterStart,
                record.meterEnd,
                record.totalUnits?.toFixed(2) || 0,
                record.totalElectricityCost?.toFixed(2) || 0, 
                `${record.timePeriodHours} Hrs`,
                `${record.labourHours || 0} Hrs`,
                record.totalLabourCost?.toFixed(2) || 0
            ];
        });

        tableRows.push([
            "GRAND TOTAL",
            "-",
            `${totalStartWeight.toFixed(2)} kg`,
            `${totalEndWeight.toFixed(2)} kg`,
            "-",
            "-",
            "-",
            `${totalUnits.toFixed(2)} Pts`,
            totalElecCost.toFixed(2), 
            `${totalHours.toFixed(1)} Hrs`,
            `${totalLabourHours.toFixed(1)} Hrs`,
            totalLabourCost.toFixed(2)
        ]);
        return tableRows;
    };

    const uniqueCode = `HT/DM/${new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}.${new Date().getFullYear()}`;

    // Ensure To Date is not earlier than From Date
    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        if (endDate && e.target.value > endDate) {
            setEndDate(''); 
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">Dehydrator Machine Records</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of Dehydrator Yield, Electricity, and Labour</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Dehydrator Machine Records"
                        subtitle={`Filters -> Month: ${filterMonth || 'All'} | Date: ${startDate || 'All'} to ${endDate || 'All'} | Trial: ${trialFilter || 'All'}`}
                        headers={["Date", "Trial(s)", "RM-Wt", "Dried-Wt", "Moisture", "Elec Start", "Elec End", "Units", "Elec Cost", "Time (Hrs)", "Lab Hrs", "Lab Cost"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Dehydrator_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="landscape" 
                        disabled={loading || filteredRecords.length === 0}
                    />
                    <button onClick={fetchRecords} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 border border-[#8CC63F] dark:border-green-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                </div>
            </div>

            {/* --- REFINED FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</label>
                        <input 
                            type="month" 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={handleStartDateChange} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input 
                            type="date" 
                            min={startDate} 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            disabled={!startDate}
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Trial (Search Item)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Mango, Kiwi..." 
                            value={trialFilter} 
                            onChange={(e) => setTrialFilter(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors" 
                        />
                    </div>
                    <div className="flex items-end lg:justify-end">
                        <button 
                            onClick={clearFilters}
                            disabled={!filterMonth && !startDate && !endDate && !trialFilter}
                            className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${
                                filterMonth || startDate || endDate || trialFilter 
                                ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/50' 
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
                            }`}
                        >
                            <FilterX size={16} /> Clear Filters
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden self-start w-full max-w-full transition-colors duration-300">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-[#8CC63F] dark:border-green-700 border-t-[#1B6A31] dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading dehydrator records...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-800 align-bottom min-w-[140px]"><div className="flex items-center gap-1"><Calendar size={14}/> Date</div></th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-[#8CC63F]/10 dark:bg-green-900/20 align-bottom max-w-[200px]"><div className="flex items-center gap-1"><Fan size={14}/> Trial(s)</div></th>
                                    
                                    <th colSpan="3" className="px-4 py-2 font-bold text-teal-700 dark:text-teal-500 border-r border-gray-200 dark:border-zinc-800 bg-teal-50 dark:bg-teal-950/30 text-center"><div className="flex items-center justify-center gap-1"><Scale size={14}/> Yield Details</div></th>
                                    <th colSpan="4" className="px-4 py-2 font-bold text-orange-700 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center"><div className="flex items-center justify-center gap-1"><Zap size={14}/> Electricity</div></th>
                                    <th colSpan="3" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950/30 text-center"><div className="flex items-center justify-center gap-1"><Clock size={14}/> Time & Labour</div></th>
                                    
                                    {!isViewer && <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center bg-gray-50 dark:bg-zinc-950/50">Action</th>}
                                </tr>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-xs border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                    <th className="px-3 py-2 font-medium bg-teal-50/50 dark:bg-teal-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">RM Wt</th>
                                    <th className="px-3 py-2 font-medium bg-teal-50/50 dark:bg-teal-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">Dried Wt</th>
                                    <th className="px-3 py-2 font-medium bg-teal-50/50 dark:bg-teal-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800"><Droplets size={12} className="inline mr-1"/>Moisture</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">End</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">Total Pts</th>
                                    
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200 dark:border-zinc-800"><Banknote size={12} className="inline mr-1"/>Cost</th>
                                    
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800">Mach. Hrs</th>
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800"><Users size={12} className="inline mr-1"/>Lab. Hrs</th>
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-950/20 text-center border-r border-gray-200 dark:border-zinc-800"><Banknote size={12} className="inline mr-1"/>Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => (
                                        <tr key={record._id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                <div className="flex flex-col items-start gap-1 mt-1">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toISOString().split('T')[0]}</span>
                                                    {record.isEdited && (
                                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 px-1.5 py-0.5 rounded font-medium w-max">
                                                            Edited : {record.lastUpdatedDate}<br/><span className="text-[10px] opacity-80"> by {record.editedBy}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            {/* Stacked Trial Names */}
                                            <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 font-medium text-[#1B6A31] dark:text-green-400 whitespace-normal max-w-[200px] align-top">
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {record.trialsArray.map((t, i) => (
                                                        <span key={i} className="block whitespace-nowrap">{t.trialName}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            
                                            {/* Stacked Start Weights */}
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-teal-700 dark:text-teal-400 font-medium align-top">
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {record.trialsArray.map((t, i) => (
                                                        <span key={i} className="block whitespace-nowrap">{t.startWeight} kg</span>
                                                    ))}
                                                </div>
                                                {/* {record.trialsArray.length > 1 && (
                                                    <div className="mt-2 pt-1 border-t border-teal-100 dark:border-teal-900/50 text-xs font-bold text-teal-800 dark:text-teal-300" title="Batch Total RM Weight">
                                                        {record.totalStartWt.toFixed(2)} kg
                                                    </div>
                                                )} */}
                                            </td>

                                            {/* Stacked End Weights */}
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-teal-700 dark:text-teal-400 font-medium align-top">
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {record.trialsArray.map((t, i) => (
                                                        <span key={i} className="block whitespace-nowrap">{t.endWeight} kg</span>
                                                    ))}
                                                </div>
                                                {/* {record.trialsArray.length > 1 && (
                                                    <div className="mt-2 pt-1 border-t border-teal-100 dark:border-teal-900/50 text-xs font-bold text-teal-800 dark:text-teal-300" title="Batch Total Dried Weight">
                                                        {record.totalEndWt.toFixed(2)} kg
                                                    </div>
                                                )} */}
                                            </td>
                                            
                                            {/* Stacked Moistures */}
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 whitespace-normal max-w-[120px] align-top">
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {record.trialsArray.map((t, i) => (
                                                        <span key={i} className="block whitespace-nowrap">{t.moisturePercentage}%</span>
                                                    ))}
                                                </div>
                                            </td>

                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 align-top pt-4">{record.meterStart}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 align-top pt-4">{record.meterEnd}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 align-top pt-4"><span className="font-bold text-orange-600 dark:text-orange-400">{record.totalUnits?.toFixed(2) || 0}</span></td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 align-top pt-4"><span className="font-bold text-orange-700 dark:text-orange-300">{record.totalElectricityCost?.toFixed(2) || '0.00'}</span></td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 align-top pt-4"><span className="font-bold text-blue-700 dark:text-blue-400">{record.timePeriodHours}</span></td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 font-medium align-top pt-4">{record.labourHours || 0}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 align-top pt-4"><span className="font-bold text-purple-600 dark:text-purple-400">{record.totalLabourCost?.toFixed(2) || '0.00'}</span></td>
                                            
                                            {!isViewer && (
                                                <td className="px-3 py-3 text-center align-top pt-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-zinc-800 rounded transition-all"><MdOutlineEdit size={20} /></button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"><MdOutlineDeleteOutline size={20} /></button></AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md">
                                                                <AlertDialogHeader>
                                                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800"><AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                                                                    <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Record</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">Are you sure you want to delete this batch record?</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="mt-6">
                                                                    <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={isViewer ? "12" : "13"} className="p-16 text-center text-gray-400 dark:text-zinc-600"><AlertCircle size={40} className="mx-auto mb-3 opacity-20" /><p className="text-lg font-medium text-gray-500 dark:text-zinc-500">No records found</p></td></tr>
                                )}
                            </tbody>
                            {filteredRecords.length > 0 && (
                                <tfoot className="bg-gray-100/90 dark:bg-zinc-900/90 border-t-2 border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                                    <tr>
                                        <td colSpan="2" className="px-4 py-4 text-right font-bold text-gray-800 dark:text-gray-200 tracking-wider uppercase border-r border-gray-200 dark:border-zinc-800">GRAND TOTAL</td>
                                        <td className="px-3 py-4 text-center font-bold text-teal-700 dark:text-teal-500 border-r border-gray-200 dark:border-zinc-800">{totalStartWeight.toFixed(2)} kg</td>
                                        <td className="px-3 py-4 text-center font-bold text-teal-700 dark:text-teal-500 border-r border-gray-200 dark:border-zinc-800">{totalEndWeight.toFixed(2)} kg</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-center text-gray-500 font-bold">-</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-center text-gray-500 font-bold">-</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-center text-gray-500 font-bold">-</td>
                                        <td className="px-3 py-4 text-center font-black text-orange-700 dark:text-orange-500 text-lg border-r border-gray-200 dark:border-zinc-800">{totalUnits.toFixed(2)} Pts</td>
                                        <td className="px-3 py-4 text-center font-black text-orange-800 dark:text-orange-400 text-lg border-r border-gray-200 dark:border-zinc-800">{totalElecCost.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-black text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800">{totalHours.toFixed(1)} Hrs</td>
                                        <td className="px-3 py-4 text-center font-black text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800">{totalLabourHours.toFixed(1)} Hrs</td>
                                        <td className="px-3 py-4 text-center font-black text-purple-700 dark:text-purple-400 border-r border-gray-200 dark:border-zinc-800">{totalLabourCost.toFixed(2)}</td>
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
