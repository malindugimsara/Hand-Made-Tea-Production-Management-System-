import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Search, Leaf, Edit, AlertCircle, FilterX, Zap, DollarSign } from "lucide-react";
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
import { MdOutlineDeleteOutline, MdOutlineEdit } from 'react-icons/md';

export default function ViewRawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    
    // Filter States
    const [filterDate, setFilterDate] = useState('');
    const [filterMaterial, setFilterMaterial] = useState('');

    // Delete Confirmation සඳහා අවශ්‍ය State එක
    const [recordToDelete, setRecordToDelete] = useState(null);

    const materialOptions = ["Heenbowitiya", "Moringa", "Gotukola", "Karapincha", "Iramusu", "Polpala", "Other"];

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
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
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost/${recordToDelete._id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success("Deleted successfully!", { id: toastId });
                fetchRecords(); // Table එක refresh කිරීම
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error("Error deleting record", { id: toastId });
        } finally {
            setRecordToDelete(null); // Alert එක වැසීමට
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

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 min-h-screen">
            
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center gap-2">
                        <Leaf size={28} /> View Raw Material Costs
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium">History of all herbal material processing costs</p>
                </div>
                <button 
                    onClick={fetchRecords}
                    className="px-5 py-2.5 bg-white border border-green-600 text-green-700 rounded-lg hover:bg-green-50 font-bold shadow-sm transition-all"
                >
                    Refresh Data
                </button>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Filter by Date</label>
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white" 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Filter by Material</label>
                    <select 
                        value={filterMaterial} 
                        onChange={(e) => setFilterMaterial(e.target.value)} 
                        className="border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white"
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
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <FilterX size={16} /> Clear Filters
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500"/> Recent Records
                    </h3>
                    <span className="text-sm font-bold bg-green-100 text-green-800 px-4 py-1.5 rounded-full">
                        {filteredRecords.length} Entries Found
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-16 text-center text-gray-400 font-medium">Loading records...</div>
                    ) : filteredRecords.length > 0 ? (
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 align-bottom w-28">Date</th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 align-bottom w-32">Material</th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-gray-700 border-r border-gray-200 align-bottom text-right">Dry (g)</th>
                                    
                                    <th colSpan="2" className="px-4 py-2 font-bold text-orange-700 border-r border-gray-200 bg-orange-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Zap size={14}/> Meter Reading</div>
                                    </th>
                                    
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-orange-700 border-r border-gray-200 bg-orange-100/50 align-bottom text-center">Total Points</th>
                                    
                                    <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><DollarSign size={14}/> Costs (Rs)</div>
                                    </th>
                                    
                                    <th rowSpan="2" className="px-4 py-3 font-black text-green-700 border-r border-gray-200 bg-green-50/50 align-bottom text-right">Total Cost</th>
                                    <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50">Action</th>
                                </tr>
                                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60 w-24">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200 w-24">End</th>
                                    
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 text-right border-r border-gray-200/60">Raw Material</th>
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 text-right border-r border-gray-200">Electricity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.map((rec) => (
                                    <tr key={rec._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-4 py-3 border-r border-gray-100 font-medium text-gray-600">
                                            {new Date(rec.date).toISOString().split('T')[0]}
                                        </td>
                                        <td className="px-4 py-3 border-r border-gray-100 font-bold text-gray-800">
                                            <span className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs">{rec.materialType}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 font-medium">
                                            {rec.dryWeight}
                                        </td>
                                        <td className="px-3 py-3 text-center bg-orange-50/20 border-r border-gray-100 text-gray-500">
                                            {rec.meterStart}
                                        </td>
                                        <td className="px-3 py-3 text-center bg-orange-50/20 border-r border-gray-100 text-gray-500">
                                            {rec.meterEnd}
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-orange-600 bg-orange-50/50 border-r border-gray-100">
                                            {rec.totalPoints}
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 text-gray-600">
                                            {rec.rawMaterialCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-4 py-3 text-right border-r border-gray-100 text-gray-600">
                                            {rec.electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-green-700 bg-green-50/20 border-r border-gray-100">
                                            {rec.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        
                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => handleEdit(rec)}
                                                    className="p-1.5 text-gray-500 hover:text-[#1B6A31] hover:bg-[#8CC63F]/20 rounded transition-all"
                                                    title="Edit Record"
                                                >
                                                    <MdOutlineEdit size={20} />
                                                </button>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button 
                                                            onClick={() => setRecordToDelete(rec)} 
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
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
                                                            <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Record</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-gray-500 text-base">
                                                                Are you sure you want to permanently delete the <span className="font-bold text-gray-800 ml-1">{rec.materialType}</span> record for <span className="font-bold text-gray-800">{new Date(rec.date).toISOString().split('T')[0]}</span>?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-6">
                                                            <AlertDialogCancel 
                                                                onClick={() => setRecordToDelete(null)} 
                                                                className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-6 font-semibold"
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
                                        
                                    </tr>
                                ))}
                            </tbody>

                            {/* --- TOTAL ROW --- */}
                            {filteredRecords.length > 0 && (
                                <tfoot className="bg-gray-100/90 border-t-[3px] border-gray-300 font-black text-gray-900 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <td colSpan="2" className="px-4 py-4 border-r border-gray-200 text-right uppercase tracking-wider text-sm">Total</td>
                                        <td className="px-4 py-4 border-r border-gray-200 text-[#1B6A31] text-base text-right">{totalDryWeight.toFixed(2)}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 bg-orange-50/20">-</td>
                                        <td className="px-4 py-4 border-r border-gray-200 bg-orange-50/20">-</td>
                                        <td className="px-4 py-4 border-r border-gray-200 text-orange-600 text-base bg-orange-50/50">{totalPoints}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 text-right">{totalRawCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 text-right">{totalElecCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-4 border-r border-gray-200 text-green-700 text-lg text-right bg-green-50/20">{grandTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-4"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3 border border-gray-100">
                                <Search size={30} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No records found matching the criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}