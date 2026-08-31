import React, { useState, useEffect } from 'react';
import { Calendar, Droplets, RefreshCw, AlertCircle, Trash2, Edit, Table as TableIcon, Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
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
import PDFDownloader from '@/components/PDFDownloader';
import { useNavigate } from 'react-router-dom';

// 💡 Time slots from 8:00 PM to 2:00 PM
const TIME_SLOTS = [
    "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM"
];

const TROUGHS = [1, 2, 3, 4, 5, 6];

export default function HydroMetersView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const currentUsername = localStorage.getItem("username") || "Unknown User";

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Deletion states
    const [isDeleting, setIsDeleting] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(false); // Clear All
    const [rowToDelete, setRowToDelete] = useState(null); // Clear Single Row

    // Edit/Add Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalTime, setModalTime] = useState("");
    const [modalData, setModalData] = useState({});

    const navigate= useNavigate();

    const initializeData = () => {
        const initial = {};
        TIME_SLOTS.forEach(time => {
            initial[time] = {};
            TROUGHS.forEach(trough => {
                initial[time][trough] = { dry: '', wet: '' };
            });
            initial[time].meta = null; 
        });
        return initial;
    };

    const [formData, setFormData] = useState(initializeData());

    // දත්ත ඇතුළත් කර ඇති Time Slots පමණක් වෙන් කර ගැනීම
    const rowHasData = (time) => TROUGHS.some(t => formData[time]?.[t]?.dry !== '' || formData[time]?.[t]?.wet !== '');
    const activeTimeSlots = TIME_SLOTS.filter(rowHasData);
    const hasData = activeTimeSlots.length > 0;

    // Fetch Data from Backend
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/get?date=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const result = await response.json();
            
            if (response.ok && result.data) {
                setFormData(result.data);
            } else {
                setFormData(initializeData());
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to load existing data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const calculateDifference = (dry, wet) => {
        const dryVal = parseFloat(dry);
        const wetVal = parseFloat(wet);
        if (!isNaN(dryVal) && !isNaN(wetVal)) {
            return (wetVal - dryVal).toFixed(2);
        }
        return '';
    };

   const openEditModal = (time) => {
        setModalTime(time);
        
        // Deep copy of the row data
        const rowDataCopy = JSON.parse(JSON.stringify(formData[time] || {}));
        TROUGHS.forEach(t => {
            if(!rowDataCopy[t]) rowDataCopy[t] = { dry: '', wet: '' };
        });
        
        setModalData(rowDataCopy);
        setIsModalOpen(true);
    };

    const handleModalInputChange = (trough, field, value) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
        setModalData(prev => ({
            ...prev,
            [trough]: {
                ...prev[trough],
                [field]: value
            }
        }));
    };

    const handleModalSave = async () => {
        if (!modalTime) return toast.error("Please select a time slot.");

        setIsSaving(true);
        const toastId = toast.loading("Saving changes...");

        try {
            // 1. Update local formData state
            const updatedFormData = { ...formData };
            updatedFormData[modalTime] = {
                ...modalData,
                meta: {
                    editedBy: currentUsername,
                    editedAt: new Date().toISOString()
                }
            };

            // 2. Save to Backend
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/save`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, formData: updatedFormData })
            });

            if (!response.ok) throw new Error("Failed to save record.");
            
            // 3. Success
            setFormData(updatedFormData);
            setIsModalOpen(false);
            toast.success("Row data saved successfully!", { id: toastId });
        } catch (error) {
            toast.error(error.message || "Error saving record.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // 💡 DELETE LOGIC (ALL & ROW)
    // ==========================================
    const handleDeleteRecord = async () => {
        setIsDeleting(true);
        const toastId = toast.loading("Deleting all records for the day...");
        try {
            const token = localStorage.getItem("token");
            const emptyData = initializeData();
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/save`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, formData: emptyData })
            });

            if (!response.ok) throw new Error("Failed to clear records.");
            
            setFormData(emptyData);
            toast.success("All records deleted successfully!", { id: toastId });
        } catch (error) {
            toast.error(error.message || "Error deleting records.", { id: toastId });
        } finally {
            setIsDeleting(false);
            setRecordToDelete(false);
        }
    };

    const confirmRowDelete = async () => {
        if (!rowToDelete) return;
        const toastId = toast.loading("Deleting row data...");

        try {
            const updatedFormData = { ...formData };
            const clearedRow = {};
            TROUGHS.forEach(t => { clearedRow[t] = { dry: '', wet: '' }; });
            
            updatedFormData[rowToDelete] = {
                ...clearedRow,
                meta: {
                    editedBy: currentUsername,
                    editedAt: new Date().toISOString()
                }
            };

            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/save`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, formData: updatedFormData })
            });

            if (!response.ok) throw new Error("Failed to delete row.");

            setFormData(updatedFormData);
            toast.success(`Row data for ${rowToDelete} deleted.`, { id: toastId });
        } catch (error) {
            toast.error(error.message || "Error deleting row.", { id: toastId });
        } finally {
            setRowToDelete(null);
        }
    };

    // ==========================================
    // 💡 Prepare PDF Data
    // ==========================================
    
    // Helper function to get active troughs for the day
    const getActiveTroughsForDay = () => {
        const activeTroughs = new Set();
        activeTimeSlots.forEach(time => {
            TROUGHS.forEach(t => {
                if (formData[time]?.[t]?.dry !== '' || formData[time]?.[t]?.wet !== '') {
                    activeTroughs.add(t);
                }
            });
        });
        return Array.from(activeTroughs).sort((a, b) => a - b);
    };

    const getPdfHeaders = () => {
        const borderColor = [167, 243, 208]; 
        const darkGreenText = [20, 83, 45];  
        
        const activeTroughs = getActiveTroughsForDay();

        const row1 = [{ 
            content: 'TIME', rowSpan: 2, 
            styles: { halign: 'center', valign: 'middle', fillColor: [220, 252, 231], textColor: darkGreenText, fontStyle: 'bold', lineWidth: 0.5, lineColor: borderColor } 
        }];
        
        activeTroughs.forEach(t => {
            row1.push({ 
                content: `Trough No ${String(t).padStart(2, '0')}`, colSpan: 3, 
                styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: darkGreenText, fontStyle: 'bold', lineWidth: 0.5, lineColor: borderColor } 
            });
        });
        
        const row2 = [];
        activeTroughs.forEach(() => {
            // 💡 WET BULB First, DRY BULB Second
            row2.push({ content: 'WET BULB', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [107, 114, 128], fontSize: 7, fontStyle: 'bold', lineWidth: 0.5, lineColor: borderColor } });
            row2.push({ content: 'DRY BULB', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [107, 114, 128], fontSize: 7, fontStyle: 'bold', lineWidth: 0.5, lineColor: borderColor } });
            row2.push({ content: 'DIFFERENCE', styles: { halign: 'center', fillColor: [220, 252, 231], textColor: darkGreenText, fontSize: 7, fontStyle: 'bold', lineWidth: 0.5, lineColor: borderColor } });
        });

        return [row1, row2];
    };

    const getPdfData = () => {
        const borderColor = [167, 243, 208]; 
        const activeTroughs = getActiveTroughsForDay();

        return activeTimeSlots.map(time => {
            const row = [{ 
                content: time, 
                styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [20, 83, 45], halign: 'center', valign: 'middle', lineColor: borderColor, lineWidth: 0.5 } 
            }];
            
            activeTroughs.forEach(t => {
                const dry = formData[time]?.[t]?.dry || '-';
                const wet = formData[time]?.[t]?.wet || '-';
                const diff = calculateDifference(dry, wet) || '-';
                
                const diffTextColor = (diff !== '-' && parseFloat(diff) < 0) ? [220, 38, 38] : [21, 128, 61];
                const normalStyle = { fillColor: [255, 255, 255], lineColor: borderColor, lineWidth: 0.5 };
                const diffStyle = { textColor: diffTextColor, fontStyle: 'bold', fillColor: [240, 253, 244], lineColor: borderColor, lineWidth: 0.5 };

                // 💡 WET BULB First, DRY BULB Second
                row.push(
                    { content: wet, styles: normalStyle },
                    { content: dry, styles: normalStyle },
                    { content: diff, styles: diffStyle }
                );
            });
            return row;
        });
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1800px] mx-auto font-sans min-h-screen flex flex-col bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-300 relative">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-6 flex flex-col gap-5 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2 uppercase tracking-wide">
                            <TableIcon size={26} className="text-green-600 dark:text-green-400" /> 
                            View Hydro Meters Chart
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Review, edit, or delete entered daily charts.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Calendar size={18} className="absolute left-3 top-3 text-green-600 dark:text-green-500" />
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-10 pr-4 py-2.5 border border-green-200 dark:border-zinc-700 rounded-lg text-sm font-bold outline-none bg-green-50/50 dark:bg-zinc-800 text-green-800 dark:text-green-400 focus:ring-2 focus:ring-green-500 cursor-pointer transition-colors"
                            />
                        </div>

                        <button 
                            onClick={fetchData} 
                            disabled={isLoading}
                            className="p-2.5 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-700 dark:hover:text-green-400 border border-transparent rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="w-full md:w-auto flex items-center">
                        {hasData ? (
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-4 py-1.5 rounded-full border border-green-200 dark:border-green-800/50">
                                <AlertCircle size={16} /> Data found for {activeTimeSlots.length} time slot(s).
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-4 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-800/50">
                                <AlertCircle size={16} /> No found data. Please add an entry.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        
                        <button 
                            onClick={() => navigate(`/manufacturer/bl-production/hydroMetersentry?date=${selectedDate}`)}                             
                            className="px-4 py-2.5 bg-green-50 dark:bg-blue-900/20 text-green-700 dark:text-blue-400 border border-green-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Plus size={18} /> Add Entry
                        </button>

                        <AlertDialog open={recordToDelete} onOpenChange={setRecordToDelete}>
                            <AlertDialogTrigger asChild>
                                <button 
                                    disabled={!hasData || isDeleting}
                                    className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                                >
                                    <Trash2 size={18} /> Total Delete
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                                <AlertDialogHeader>
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <AlertDialogTitle className="dark:text-white">Delete Entire Record</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to permanently delete ALL records for <strong>{selectedDate}</strong>? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="dark:bg-zinc-800 dark:text-gray-300">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteRecord} className="bg-red-600 hover:bg-red-800 text-white">Delete Permanently</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <PDFDownloader 
                            title="HYDRO METERS CHART"
                            subtitle={`Date: ${selectedDate}`}
                            headers={getPdfHeaders()}
                            data={getPdfData()}
                            fileName={`Hydro_Meters_${selectedDate}.pdf`}
                            orientation="landscape"
                            uniqueCode={`HMC-${selectedDate.replace(/-/g, '')}`}
                            disabled={isLoading || !hasData}
                        />
                    </div>
                </div>
            </div>

            {/* --- MAIN DATA TABLE VIEW --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800 overflow-hidden transition-colors duration-300 relative flex-1 flex flex-col">
                
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 z-50 flex items-center justify-center backdrop-blur-[1px]">
                        <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                )}

                {!hasData && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
                        <Droplets className="w-20 h-20 text-yellow-100 dark:text-zinc-800 mb-4" />                        
                    <p className="text-gray-400 dark:text-zinc-500 mt-2 text-sm font-medium">There are no entries for the selected date.</p>
                        <button 
                            onClick={() => navigate(`/manufacturer/bl-production/hydroMetersentry?date=${selectedDate}`)} 
                            className="mt-6 px-6 py-2.5 bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400 font-bold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} /> Add First Entry
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar flex-1 max-h-[65vh]">
                        <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1650px]">
                            <thead className="sticky top-0 z-20 shadow-sm">
                                <tr className="bg-green-50 dark:bg-green-900/20">
                                    <th rowSpan={2} className="p-3 border border-green-200 dark:border-zinc-700 sticky left-0 z-30 bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100 font-black uppercase text-sm tracking-wider w-[100px]">
                                        Time
                                    </th>
                                    {TROUGHS.map(trough => (
                                        <th key={trough} colSpan={3} className="p-3 border border-green-200 dark:border-zinc-700 font-black text-green-800 dark:text-green-200 text-sm tracking-widest bg-[#f8fafc] dark:bg-zinc-800/80">
                                            Trough No {String(trough).padStart(2, '0')}
                                        </th>
                                    ))}
                                    <th rowSpan={2} className="p-3 border border-green-200 dark:border-zinc-700 bg-[#f8fafc] dark:bg-zinc-800/80 text-green-800 dark:text-green-200 font-black uppercase text-sm tracking-wider w-[120px]">
                                        Last Updated
                                    </th>
                                    <th rowSpan={2} className="p-3 border border-green-200 dark:border-zinc-700 sticky right-0 z-30 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-black uppercase text-sm tracking-wider w-[100px]">
                                        Actions
                                    </th>
                                </tr>
                                <tr className="bg-[#f1f5f9] dark:bg-zinc-800/50">
                                    {TROUGHS.map(trough => (
                                        <React.Fragment key={`sub-${trough}`}>
                                            {/* 💡 WET BULB First, DRY BULB Second */}
                                            <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[60px]">WET BULB</th>
                                            <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[60px]">DRY BULB</th>
                                            <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-green-700 dark:text-green-400 w-[60px] bg-green-50/50 dark:bg-green-900/10">DIFFERENCE</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-sm">
                                {activeTimeSlots.map((time) => {
                                    return (
                                        <tr key={time} className={`hover:bg-green-50/30 dark:hover:bg-zinc-800/30 transition-colors bg-white dark:bg-zinc-950`}>
                                            
                                            <td className={`p-0 border border-green-200 dark:border-zinc-700 sticky left-0 z-10 font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-950`}>
                                                <div className="flex items-center justify-center gap-2 w-full h-full py-2 bg-green-50/30 dark:bg-green-900/10">
                                                    {time}
                                                </div>
                                            </td>

                                            {TROUGHS.map((trough) => {
                                                const dryVal = formData[time]?.[trough]?.dry || '';
                                                const wetVal = formData[time]?.[trough]?.wet || '';
                                                const diffVal = calculateDifference(dryVal, wetVal);
                                                const isNegative = diffVal !== '' && parseFloat(diffVal) < 0;

                                                return (
                                                    <React.Fragment key={`${time}-${trough}`}>
                                                        {/* 💡 WET BULB First */}
                                                        <td className="p-2 border border-green-200 dark:border-zinc-700 text-center font-bold text-gray-800 dark:text-gray-200">
                                                            {wetVal || '-'}
                                                        </td>
                                                        {/* 💡 DRY BULB Second */}
                                                        <td className="p-2 border border-green-200 dark:border-zinc-700 text-center font-bold text-gray-800 dark:text-gray-200">
                                                            {dryVal || '-'}
                                                        </td>
                                                        <td className={`p-2 border border-green-200 dark:border-zinc-700 text-center font-black bg-green-50/50 dark:bg-green-900/10
                                                            ${isNegative ? 'text-yellow-600 dark:text-yellow-500' : 'text-green-700 dark:text-green-400'}
                                                        `}>
                                                            {diffVal || '-'}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}

                                            <td className="p-1 border border-green-200 dark:border-zinc-700 text-center align-middle">
                                                {formData[time]?.meta?.editedBy ? (
                                                    <div className="flex flex-col items-center justify-center text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                                                        <span className="font-bold text-green-700 dark:text-green-500">{formData[time].meta.editedBy}</span>
                                                        <span>{new Date(formData[time].meta.editedAt).toLocaleDateString()}</span>
                                                        <span>{new Date(formData[time].meta.editedAt).toLocaleTimeString()}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-zinc-700">-</span>
                                                )}
                                            </td>

                                            <td className="p-0 border border-green-200 dark:border-zinc-700 sticky right-0 z-10 bg-white dark:bg-zinc-950">
                                                <div className="flex items-center justify-center gap-2 w-full h-full py-2 px-2 bg-green-50/30 dark:bg-green-900/10">
                                                    <button
                                                        onClick={() => openEditModal(time)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Edit Row Data"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setRowToDelete(time)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* 💡 EDIT MODAL (In-Page Popup) */}
            {/* ========================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-zinc-800">
                        
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2">
                                <Edit size={24} /> Edit Entry: {modalTime}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {TROUGHS.map((trough, idx) => {
                                    const dryVal = modalData[trough]?.dry || '';
                                    const wetVal = modalData[trough]?.wet || '';
                                    const diffVal = calculateDifference(dryVal, wetVal);
                                    const isNegative = diffVal !== '' && parseFloat(diffVal) < 0;

                                    return (
                                        <div key={trough} className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 flex flex-col gap-4 shadow-sm hover:border-green-300 dark:hover:border-green-800 transition-colors">
                                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-2">
                                                <h4 className="font-bold text-gray-700 dark:text-gray-300">Trough {String(trough).padStart(2, '0')}</h4>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${diffVal === '' ? 'text-gray-400' : isNegative ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-green-100 text-green-700 dark:bg-green-900/30'}`}>
                                                    Diff: {diffVal || '-'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* 💡 WET BULB First */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Wet Bulb</label>
                                                    <input 
                                                        id={`modal-wet-${idx}`}
                                                        type="text" 
                                                        value={wetVal}
                                                        onChange={(e) => handleModalInputChange(trough, 'wet', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') document.getElementById(`modal-dry-${idx}`)?.focus();
                                                        }}
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-center font-bold text-gray-800 dark:text-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none"
                                                        placeholder="-"
                                                    />
                                                </div>
                                                {/* 💡 DRY BULB Second */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Dry Bulb</label>
                                                    <input 
                                                        id={`modal-dry-${idx}`}
                                                        type="text" 
                                                        value={dryVal}
                                                        onChange={(e) => handleModalInputChange(trough, 'dry', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && idx < TROUGHS.length - 1) document.getElementById(`modal-wet-${idx+1}`)?.focus();
                                                        }}
                                                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-2.5 text-center font-bold text-gray-800 dark:text-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none"
                                                        placeholder="-"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button 
                                onClick={handleModalSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} 
                                Save Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ROW CLEAR CONFIRMATION DIALOG */}
            <AlertDialog open={!!rowToDelete} onOpenChange={() => setRowToDelete(null)}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="dark:text-white text-red-600 flex items-center gap-2">
                            <Trash2 size={20}/> Delete Row Data
                        </AlertDialogTitle>
                        <AlertDialogDescription className="dark:text-white">
                            Are you sure you want to permanently delete data for the <strong>{rowToDelete}</strong> time slot?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRowToDelete(null)} className="dark:bg-zinc-800 dark:text-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRowDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Row</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
        </div>
    );
}