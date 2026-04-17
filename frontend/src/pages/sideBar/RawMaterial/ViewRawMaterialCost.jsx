import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Calendar, Trash2, Search, Leaf, Edit, AlertCircle, FilterX, Zap, DollarSign, RefreshCw } from "lucide-react";
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

export default function ViewRawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    
    // Filter States
    const [filterDate, setFilterDate] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('');

    // Delete Confirmation
    const [recordToDelete, setRecordToDelete] = useState(null);

    const materialOptions = ["Heenbowitiya", "Moringa", "Gotukola", "Karapincha", "Iramusu", "Polpala", "Other"];

    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                
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

                const sortedData = processedData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setRecords(sortedData);
            } else {
                if (res.status === 401) {
                    toast.error("Unauthorized. Please log in.");
                } else {
                    throw new Error('Failed to fetch');
                }
            }
        } catch (error) {
            toast.error("Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        navigate('/edit-raw-material-cost', { state: { record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;

        const toastId = toast.loading('Deleting...');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost/${recordToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast.success("Deleted successfully!", { id: toastId });
                fetchRecords(); // Refresh Table
            } else {
                if(res.status === 403) {
                    toast.error("Access Denied. Only Admins can delete.", { id: toastId });
                } else {
                    throw new Error('Failed to delete');
                }
            }
        } catch (error) {
            toast.error("Error deleting record", { id: toastId });
        } finally {
            setRecordToDelete(null); 
        }
    };

    const clearFilters = () => {
        setFilterDate('');
        setFilterMaterial('');
    };

    // -------------------------------------------------------------
    // Filtering Logic
    // -------------------------------------------------------------
    const filteredRecords = records.filter(rec => {
        const recDate = new Date(rec.date).toISOString().split('T')[0];
        const matchDate = filterDate ? recDate === filterDate : true;
        const matchMaterial = filterMaterial ? rec.materialType === filterMaterial : true;
        return matchDate && matchMaterial;
    });

    // -------------------------------------------------------------
    // Total Calculations (Grand Totals for the footer)
    // -------------------------------------------------------------
    const totalDryWeight = filteredRecords.reduce((sum, rec) => sum + (Number(rec.dryWeight) || 0), 0);
    const totalPoints = filteredRecords.reduce((sum, rec) => sum + (Number(rec.totalPoints) || 0), 0);
    const totalRawCost = filteredRecords.reduce((sum, rec) => sum + (Number(rec.rawMaterialCost) || 0), 0);
    const totalElecCost = filteredRecords.reduce((sum, rec) => sum + (Number(rec.electricityCost) || 0), 0);
    const grandTotalCost = filteredRecords.reduce((sum, rec) => sum + (Number(rec.totalCost) || 0), 0);

    // -------------------------------------------------------------
    // PREPARE PDF DATA
    // -------------------------------------------------------------
    const getPdfData = () => {
        const tableRows = filteredRecords.map(rec => {
            const baseDate = new Date(rec.date).toISOString().split('T')[0];
            const pdfDateCell = rec.isEdited ? `${baseDate}\n(Edited: ${rec.lastUpdatedDate})` : baseDate;

            return [
                pdfDateCell,
                rec.materialType,
                rec.dryWeight,
                rec.meterStart,
                rec.meterEnd,
                rec.totalPoints,
                rec.rawMaterialCost.toLocaleString(undefined, {minimumFractionDigits: 2}),
                rec.electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2}),
                rec.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ];
        });

        tableRows.push([
            "GRAND TOTAL",
            "-",
            totalDryWeight.toFixed(2),
            "-",
            "-",
            totalPoints,
            totalRawCost.toLocaleString(undefined, {minimumFractionDigits: 2}),
            totalElecCost.toLocaleString(undefined, {minimumFractionDigits: 2}),
            grandTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2})
        ]);

        return tableRows;
    };

    const getCurrentMonthCode = () => {
        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `HT/RMC/${month}.${year}`; // Result: HT/RMC/APRIL.2026
    };

    const uniqueCode = getCurrentMonthCode();

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
                        <Leaf size={28} /> View Raw Material Costs
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">History of all herbal material processing costs</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Raw Material Cost Records"
                        subtitle={`Filters -> Date: ${filterDate || 'All'} | Material: ${filterMaterial || 'All'}`}
                        headers={["Date", "Material", "Dry Weight (g)", "Meter Start", "Meter End", "Total Pts", "Raw Cost (Rs)", "Elec Cost (Rs)", "Total Cost (Rs)"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Raw_Material_Cost_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="landscape"
                        disabled={loading || filteredRecords.length === 0}
                    />

                    <button 
                        onClick={fetchRecords}
                        disabled={loading}
                        className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 border border-[#8CC63F] dark:border-green-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-800'}`}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Filter by Date</label>
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 transition-colors" 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Filter by Material</label>
                    <select 
                        value={filterMaterial} 
                        onChange={(e) => setFilterMaterial(e.target.value)} 
                        className="border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 transition-colors"
                    >
                        <option value="">All Materials</option>
                        {materialOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={clearFilters}
                        disabled={!filterDate && !filterMaterial}
                        className={`px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${
                            filterDate || filterMaterial 
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/50' 
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
                        }`}
                    >
                        <FilterX size={16} /> Clear Filters
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-950/50 transition-colors duration-300">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500 dark:text-gray-400"/> Recent Records
                    </h3>
                    <span className="text-sm font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-1.5 rounded-full">
                        {filteredRecords.length} Entries Found
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-16 text-center text-gray-400 dark:text-gray-500 font-medium flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[#8CC63F] dark:border-green-700 border-t-[#1B6A31] dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
                            Loading records...
                        </div>
                    ) : filteredRecords.length > 0 ? (
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-800 align-bottom w-28">Date</th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-[#8CC63F]/10 dark:bg-green-900/20 align-bottom w-32">Material</th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-zinc-800 align-bottom text-right">Dry (g)</th>
                                    
                                    <th colSpan="2" className="px-4 py-2 font-bold text-orange-700 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center">
                                        <div className="flex items-center justify-center gap-1"><Zap size={14}/> Meter Reading</div>
                                    </th>
                                    
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-orange-700 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-100/50 dark:bg-orange-900/20 align-bottom text-center">Total Pts</th>
                                    
                                    <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950/30 text-center">
                                        <div className="flex items-center justify-center gap-1"><DollarSign size={14}/> Costs (Rs)</div>
                                    </th>
                                    
                                    <th rowSpan="2" className="px-4 py-3 font-black text-green-700 dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-green-50/50 dark:bg-green-900/20 align-bottom text-right">Total Cost</th>
                                    
                                    {!isViewer && (
                                        <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50 dark:bg-zinc-950/50 border-gray-200 dark:border-zinc-800">Action</th>
                                    )}
                                </tr>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-xs border-b border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200/60 dark:border-zinc-800 w-24">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-950/20 text-center border-r border-gray-200 dark:border-zinc-800 w-24">End</th>
                                    
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-950/20 text-right border-r border-gray-200/60 dark:border-zinc-800">Raw Material</th>
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-950/20 text-right border-r border-gray-200 dark:border-zinc-800">Electricity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {filteredRecords.map((rec) => (
                                    <tr key={rec._id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 font-medium text-gray-600 dark:text-gray-300 align-top">
                                            <div className="flex flex-col items-start gap-1 mt-1">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                    {new Date(rec.date).toISOString().split('T')[0]}
                                                </span>
                                                {rec.isEdited && (
                                                    <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 px-1.5 py-0.5 rounded font-bold w-max">
                                                        Edited: {rec.lastUpdatedDate}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 font-bold text-gray-800 dark:text-gray-200 align-top">
                                            <div className="mt-1">
                                                <span className="px-3 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-xs transition-colors">{rec.materialType}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 dark:border-zinc-800 font-medium text-gray-800 dark:text-gray-300 align-top">
                                            <div className="mt-1">{rec.dryWeight}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center bg-orange-50/20 dark:bg-orange-950/10 border-r border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 align-top">
                                            <div className="mt-1">{rec.meterStart}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center bg-orange-50/20 dark:bg-orange-950/10 border-r border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400 align-top">
                                            <div className="mt-1">{rec.meterEnd}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20 border-r border-gray-100 dark:border-zinc-800 align-top">
                                            <div className="mt-1">{rec.totalPoints}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 align-top">
                                            <div className="mt-1">{rec.rawMaterialCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 align-top">
                                            <div className="mt-1">{rec.electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-green-700 dark:text-green-500 bg-green-50/20 dark:bg-green-900/10 border-r border-gray-100 dark:border-zinc-800 align-top">
                                            <div className="mt-1">{rec.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                        </td>
                                        
                                        {!isViewer && (
                                            <td className="px-3 py-3 text-center align-top border-gray-100 dark:border-zinc-800">
                                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                                    <button 
                                                        onClick={() => handleEdit(rec)}
                                                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-zinc-800 rounded transition-all"
                                                        title="Edit Record"
                                                    >
                                                        <MdOutlineEdit size={20} />
                                                    </button>
                                                    
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button 
                                                                onClick={() => setRecordToDelete(rec)} 
                                                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                                                title="Delete Record"
                                                            >
                                                                <MdOutlineDeleteOutline size={20} />
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md">
                                                            <AlertDialogHeader>
                                                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                                                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                                </div>
                                                                <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Record</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                                                    Are you sure you want to permanently delete the <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">{rec.materialType}</span> record for <span className="font-bold text-gray-800 dark:text-gray-200">{new Date(rec.date).toISOString().split('T')[0]}</span>?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-6">
                                                                <AlertDialogCancel 
                                                                    onClick={() => setRecordToDelete(null)} 
                                                                    className="border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-6 font-semibold"
                                                                >
                                                                    Cancel
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={handleConfirmDelete} 
                                                                    className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                                                                >
                                                                    Delete Record
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        )}
                                        
                                    </tr>
                                ))}
                            </tbody>

                            {/* --- TOTAL ROW --- */}
                            {filteredRecords.length > 0 && (
                                <tfoot className="bg-gray-100/90 dark:bg-zinc-900/90 border-t-[3px] border-gray-300 dark:border-zinc-700 font-black text-gray-900 dark:text-gray-100 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors duration-300">
                                    <tr>
                                        <td colSpan="2" className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-right uppercase tracking-wider text-sm">Total</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-[#1B6A31] dark:text-green-500 text-base text-right">{totalDryWeight.toFixed(2)}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 bg-orange-50/20 dark:bg-orange-950/10">-</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 bg-orange-50/20 dark:bg-orange-950/10">-</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-orange-600 dark:text-orange-500 text-base bg-orange-50/50 dark:bg-orange-950/20">{totalPoints}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-right dark:text-gray-300">{totalRawCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-right dark:text-gray-300">{totalElecCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-green-700 dark:text-green-400 text-lg text-right bg-green-50/20 dark:bg-green-900/10">{grandTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        
                                        {/* HIDE ACTION FOOTER CELL FOR VIEWERS */}
                                        {!isViewer && <td className="px-4 py-4 dark:border-zinc-800"></td>}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="inline-flex p-4 bg-gray-50 dark:bg-zinc-800 rounded-full mb-3 border border-gray-100 dark:border-zinc-700 transition-colors">
                                <Search size={30} className="text-gray-300 dark:text-zinc-500" />
                            </div>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">No records found matching the criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}