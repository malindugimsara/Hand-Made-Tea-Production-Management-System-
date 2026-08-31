import React, { useState, useEffect } from 'react';
import { Save, Calendar, Droplets, RefreshCw, AlertCircle, Trash2, Edit, FileDown } from 'lucide-react';
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
import { FaWhatsapp } from 'react-icons/fa';

// 💡 Time slots from 6:00 PM to 12:00 Noon
const TIME_SLOTS = [
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM"
];

const TROUGHS = [1, 2, 3, 4, 5, 6];

export default function HydroMetersChart() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const currentUsername = localStorage.getItem("username") || "Unknown User"; 

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    
    const [isDirty, setIsDirty] = useState(false);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    const [rowToDelete, setRowToDelete] = useState(null);

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
    
    // 💡 Store the original saved DB state to detect actual "Edits" vs "New Additions"
    const [originalData, setOriginalData] = useState(initializeData());

    useEffect(() => {
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
                    setOriginalData(result.data); // 💡 Save snapshot of the DB
                } else {
                    const emptyInit = initializeData();
                    setFormData(emptyInit);
                    setOriginalData(emptyInit);
                }
                setIsDirty(false); 
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Failed to load existing data.");
                const emptyInit = initializeData();
                setFormData(emptyInit);
                setOriginalData(emptyInit);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    // 💡 Handle Input Changes
    const handleInputChange = (time, trough, field, value) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        setFormData(prev => {
            // 💡 Check if the user is editing an ALREADY SAVED value
            const origVal = originalData[time]?.[trough]?.[field];
            const isEditingExisting = origVal && origVal !== '' && origVal !== value;

            let newMeta = prev[time]?.meta || null;

            // Only update "Last Updated" if it's an edit of existing data, not a new addition
            if (isEditingExisting) {
                newMeta = {
                    editedBy: currentUsername,
                    editedAt: new Date().toISOString()
                };
            }

            return {
                ...prev,
                [time]: {
                    ...prev[time],
                    [trough]: {
                        ...prev[time]?.[trough],
                        [field]: value
                    },
                    meta: newMeta
                }
            };
        });
        setIsDirty(true); 
    };

    // 💡 Row Level Actions
    const handleRowEdit = (rowIndex) => {
        const firstInputIndex = rowIndex * (TROUGHS.length * 2);
        const input = document.querySelector(`input[data-index="${firstInputIndex}"]`);
        if (input) {
            input.focus();
            input.select();
        }
    };

    const confirmRowDelete = () => {
        if (!rowToDelete) return;
        
        setFormData(prev => {
            const clearedRow = {};
            let isEditingExisting = false;

            TROUGHS.forEach(trough => {
                clearedRow[trough] = { dry: '', wet: '' };
                // 💡 If the row had saved data and we clear it, it counts as an edit
                const origDry = originalData[rowToDelete]?.[trough]?.dry;
                const origWet = originalData[rowToDelete]?.[trough]?.wet;
                if ((origDry && origDry !== '') || (origWet && origWet !== '')) {
                    isEditingExisting = true;
                }
            });

            let newMeta = prev[rowToDelete]?.meta || null;
            if (isEditingExisting) {
                newMeta = {
                    editedBy: currentUsername,
                    editedAt: new Date().toISOString()
                };
            }

            return { 
                ...prev, 
                [rowToDelete]: {
                    ...clearedRow,
                    meta: newMeta
                } 
            };
        });
        
        setIsDirty(true);
        setRowToDelete(null);
        toast.success(`Data for ${rowToDelete} cleared.`);
    };

    // 💡 Keyboard Navigation Logic
    const handleKeyDown = (e, rowIndex, troughIndex, field) => {
        const columnsPerRow = 12; 
        const currentIndex = (rowIndex * columnsPerRow) + (troughIndex * 2) + (field === 'dry' ? 0 : 1);
        let nextIndex = null;

        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            nextIndex = currentIndex + 1; 
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nextIndex = currentIndex - 1; 
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = currentIndex + columnsPerRow; 
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = currentIndex - columnsPerRow; 
        }

        if (nextIndex !== null) {
            const nextInput = document.querySelector(`input[data-index="${nextIndex}"]`);
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
    };

    const calculateDifference = (dry, wet) => {
        const dryVal = parseFloat(dry);
        const wetVal = parseFloat(wet);
        if (!isNaN(dryVal) && !isNaN(wetVal)) {
            return (dryVal - wetVal).toFixed(2);
        }
        return '';
    };

    // 💡 Save Data
    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading("Saving Hydro Meter Data...");
        
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/save`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    date: selectedDate,
                    formData: formData 
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            setOriginalData(formData); // 💡 Update snapshot after save
            setIsDirty(false); 
            setShowUnsavedPrompt(false);
            toast.success("Data saved successfully!", { id: toastId });
        } catch (error) {
            toast.error(error.message || "Failed to save data.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    // 💡 Clear All Data
    const handleClearAll = async () => {
        setIsClearing(true);
        const toastId = toast.loading("Clearing data...");
        try {
            const emptyData = initializeData();
            setFormData(emptyData);
            setOriginalData(emptyData); // 💡 Update snapshot

            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/hydro-meters/save`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, formData: emptyData })
            });

            if (!response.ok) throw new Error("Failed to clear data on server");
            setIsDirty(false);
            toast.success("Data cleared successfully!", { id: toastId });
        } catch (error) {
            toast.error(error.message || "Error clearing data.", { id: toastId });
        } finally {
            setIsClearing(false);
        }
    };

    // ===============================================================
    // 💡 Prepare PDF Data & Image-Matched Header Styling
    // ===============================================================
    const getPdfHeaders = () => {
        const borderColor = [201, 201, 201]; // ලා කොළ පැහැති බෝඩර් එක
        const darkGreenText = [20, 83, 45];  // තද කොළ අකුරු

        // පේළිය 1 (TIME සහ Trough Numbers)
        const row1 = [{ 
            content: 'TIME', 
            rowSpan: 2, 
            styles: { 
                halign: 'center', 
                valign: 'middle', 
                fillColor: [240, 240, 240], 
                textColor: darkGreenText,
                fontStyle: 'bold',
                lineWidth: 0.5, 
                lineColor: borderColor
            } 
        }];
        
        TROUGHS.forEach(t => {
            row1.push({ 
                content: `Trough No ${String(t).padStart(2, '0')}`, 
                colSpan: 3, 
                styles: { 
                    halign: 'center', 
                    valign: 'middle',
                    fillColor: [240, 240, 240], // White Background
                    textColor: darkGreenText,
                    fontStyle: 'bold',
                    lineWidth: 0.5, 
                    lineColor: borderColor 
                } 
            });
        });
        
        // පේළිය 2 (DRY BULK, WET BULK, DIFFERENCE)
        const row2 = [];
        TROUGHS.forEach(() => {
            row2.push({ 
                content: 'DRY BULK', 
                styles: { 
                    halign: 'center', 
                    fillColor: [240, 240, 240], // Very Light Grey Background
                    textColor: [107, 114, 128], // Grey Text
                    fontSize: 7, 
                    fontStyle: 'bold',
                    lineWidth: 0.5, 
                    lineColor: borderColor 
                } 
            });
            row2.push({ 
                content: 'WET BULK', 
                styles: { 
                    halign: 'center', 
                    fillColor: [240, 240, 240], // Very Light Grey Background
                    textColor: [107, 114, 128], // Grey Text
                    fontSize: 7, 
                    fontStyle: 'bold',
                    lineWidth: 0.5, 
                    lineColor: borderColor 
                } 
            });
            row2.push({ 
                content: 'DIFF', 
                styles: { 
                    halign: 'center', 
                    fillColor: [220, 252, 231], // Light Green Background (Matches Diff Column)
                    textColor: darkGreenText,   // Dark Green Text
                    fontSize: 7, 
                    fontStyle: 'bold', 
                    lineWidth: 0.5, 
                    lineColor: borderColor 
                } 
            });
        });

        return [row1, row2];
    };

    const getPdfData = () => {
        const borderColor = [201, 201, 201]; // Light green border for body too

        return TIME_SLOTS.map(time => {
            // පළමු තීරුවට (Time) Header එකට සමාන ලා කොළ පැහැති පසුබිමක්
            const row = [{ 
                content: time, 
                styles: { 
                    fontStyle: 'bold', 
                    fillColor: [255, 255, 255], 
                    textColor: [20, 83, 45],
                    halign: 'center',
                    valign: 'middle',
                    lineColor: borderColor,
                    lineWidth: 0.5
                } 
            }];
            
            TROUGHS.forEach(t => {
                const dry = formData[time]?.[t]?.dry || '-';
                const wet = formData[time]?.[t]?.wet || '-';
                const diff = calculateDifference(dry, wet) || '-';
                
                // Difference එක සෘණ (Negative) නම් රතු පාටින්, නැත්නම් කොළ පාටින්.
                const diffTextColor = (diff !== '-' && parseFloat(diff) < 0) ? [220, 38, 38] : [21, 128, 61];
                
                // Normal cell style
                const normalStyle = { fillColor: [255, 255, 255], lineColor: borderColor, lineWidth: 0.5 };

                // 💡 Diff තීරුවට සම්පූර්ණයෙන්ම ලා කොළ පැහැති පසුබිමක් (Column Highlight)
                const diffStyle = { 
                    textColor: diffTextColor, 
                    fontStyle: 'bold',
                    fillColor: [240, 253, 244], // Very Light Green Background
                    lineColor: borderColor, 
                    lineWidth: 0.5
                };

                row.push(
                    { content: dry, styles: normalStyle },
                    { content: wet, styles: normalStyle },
                    { content: diff, styles: diffStyle }
                );
            });
            return row;
        });
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1800px] mx-auto font-sans min-h-screen flex flex-col bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-6 flex flex-col gap-5 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
                
                {/* ROW 1: Title, Date, Global Clear */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2 uppercase tracking-wide">
                            <Droplets size={26} className="text-green-600 dark:text-green-400" /> 
                            Hydro Meters Chart
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Hourly intervals from 6:00 PM to 12:00 Noon
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

                        {/* Global Clear Dialog */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button 
                                    disabled={isClearing || isLoading}
                                    className="group p-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Trash2 size={18} className={`transition-transform duration-500 ${isClearing ? 'animate-pulse' : 'group-hover:scale-110'}`} /> 
                                    Clear All
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                                <AlertDialogHeader>
                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <AlertDialogTitle className="dark:text-white">Clear All Data</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to clear all data for {selectedDate}?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="dark:bg-zinc-800 dark:text-gray-300">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">Clear Data</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* ROW 2: Unsaved Reminder, Download, Share, Save */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    {/* Unsaved Changes Reminder */}
                    <div className="w-full md:w-auto h-8 flex items-center">
                        {isDirty && (
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-4 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-800/50 animate-pulse">
                                <AlertCircle size={16} /> 
                                <span>Warning: Unsaved changes! Please save to DB.</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-7 w-full md:w-auto justify-end">
                        
                        {/* PDF Download Wrapper */}
                        {isDirty ? (
                            <button onClick={() => setShowUnsavedPrompt(true)} className="px-4 py-2.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:bg-green-100 dark:hover:bg-green-900/50">
                                <FileDown size={18} /> Download PDF
                            </button>
                        ) : (
                            <PDFDownloader 
                                title="HYDRO METERS CHART"
                                subtitle={`Date: ${selectedDate}`}
                                headers={getPdfHeaders()}
                                data={getPdfData()}
                                fileName={`Hydro_Meters_${selectedDate}.pdf`}
                                orientation="landscape"
                                uniqueCode={`HMC-${selectedDate.replace(/-/g, '')}`}
                                disabled={isLoading}
                            />
                        )}

                        {/* WhatsApp Share Wrapper */}
                        {isDirty ? (
                            <button onClick={() => setShowUnsavedPrompt(true)} className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                                <FaWhatsapp size={18} /> Share WhatsApp
                            </button>
                        ) : (
                            <PDFDownloader 
                                isWhatsApp={true}
                                title="HYDRO METERS CHART"
                                subtitle={`Date: ${selectedDate}`}
                                headers={getPdfHeaders()}
                                data={getPdfData()}
                                fileName={`Hydro_Meters_${selectedDate}.pdf`}
                                orientation="landscape"
                                disabled={isLoading}
                            />
                        )}

                        {/* Save to DB */}
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || isLoading} 
                            className={`p-2.5 px-6 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95
                                ${isDirty 
                                    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 animate-pulse shadow-red-500/30' 
                                    : 'bg-[#16A34A] hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 shadow-green-500/20'
                                }
                            `}
                        >
                            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} 
                            {isDirty ? 'Save Changes' : 'Save to DB'}
                        </button>
                    </div>
                </div>
            </div>

            {/* UNSAVED CHANGES DIALOG (For PDF/WhatsApp) */}
            <AlertDialog open={showUnsavedPrompt} onOpenChange={setShowUnsavedPrompt}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4 border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <AlertDialogTitle className="dark:text-white">Save Changes Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes in the table. Please save the data to the database before downloading or sharing the PDF.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowUnsavedPrompt(false)} className="dark:bg-zinc-800 dark:text-gray-300">Close</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave} className="bg-green-600 hover:bg-green-700">Save Data Now</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ROW CLEAR CONFIRMATION DIALOG */}
            <AlertDialog open={!!rowToDelete} onOpenChange={() => setRowToDelete(null)}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="dark:text-white text-red-600 flex items-center gap-2">
                            <Trash2 size={20}/> Clear Row Data
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to clear all trough data for the <strong>{rowToDelete}</strong> time slot?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRowToDelete(null)} className="dark:bg-zinc-800 dark:text-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRowDelete} className="bg-red-600 hover:bg-red-700">Clear Row</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* --- MAIN DATA ENTRY TABLE --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800 overflow-hidden transition-colors duration-300 relative">
                
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 z-50 flex items-center justify-center backdrop-blur-[1px]">
                        <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                )}

                <div className="overflow-x-auto custom-scrollbar max-h-[65vh]">
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
                                <th rowSpan={2} className="p-3 border border-green-200 dark:border-zinc-700 bg-[#f8fafc] dark:bg-zinc-800/80 text-green-800 dark:text-green-200 font-black uppercase text-sm tracking-wider w-[80px]">
                                    Actions
                                </th>
                            </tr>
                            <tr className="bg-[#f1f5f9] dark:bg-zinc-800/50">
                                {TROUGHS.map(trough => (
                                    <React.Fragment key={`sub-${trough}`}>
                                        <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[60px]">DRY BULK</th>
                                        <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[60px]">WET BULK</th>
                                        <th className="p-2 border border-green-200 dark:border-zinc-700 text-[11px] font-bold text-green-700 dark:text-green-400 w-[60px] bg-green-50/50 dark:bg-green-900/10">DIFFERENCE</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-sm">
                            {TIME_SLOTS.map((time, rowIndex) => {
                                const isDivider = time === "12:00 AM" || time === "12:00 PM";
                                
                                return (
                                    <tr key={time} className={`hover:bg-green-50/30 dark:hover:bg-zinc-800/30 transition-colors ${isDivider ? 'bg-gray-50 dark:bg-zinc-900/60' : 'bg-white dark:bg-zinc-950'}`}>
                                        
                                        <td className={`p-0 border border-green-200 dark:border-zinc-700 sticky left-0 z-10 font-bold text-gray-700 dark:text-gray-300 ${isDivider ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-950'}`}>
                                            <div className="flex items-center justify-center gap-2 w-full h-full py-2">
                                                {time}
                                            </div>
                                        </td>

                                        {TROUGHS.map((trough, troughIndex) => {
                                            const dryVal = formData[time]?.[trough]?.dry || '';
                                            const wetVal = formData[time]?.[trough]?.wet || '';
                                            const diffVal = calculateDifference(dryVal, wetVal);
                                            const isNegative = diffVal !== '' && parseFloat(diffVal) < 0;

                                            const dryIndex = (rowIndex * 12) + (troughIndex * 2);
                                            const wetIndex = (rowIndex * 12) + (troughIndex * 2) + 1;

                                            return (
                                                <React.Fragment key={`${time}-${trough}`}>
                                                    <td className="p-0 border border-green-200 dark:border-zinc-700 relative">
                                                        <input 
                                                            data-index={dryIndex}
                                                            type="text" 
                                                            value={dryVal}
                                                            onChange={(e) => handleInputChange(time, trough, 'dry', e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, troughIndex, 'dry')}
                                                            className="w-full h-full p-2.5 text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 font-medium text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-zinc-600"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    
                                                    <td className="p-0 border border-green-200 dark:border-zinc-700 relative">
                                                        <input 
                                                            data-index={wetIndex}
                                                            type="text" 
                                                            value={wetVal}
                                                            onChange={(e) => handleInputChange(time, trough, 'wet', e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, troughIndex, 'wet')}
                                                            className="w-full h-full p-2.5 text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 font-medium text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-zinc-600"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    
                                                    <td className={`p-2 border border-green-200 dark:border-zinc-700 font-bold bg-gray-50/50 dark:bg-zinc-900/30
                                                        ${isNegative ? 'text-yellow-600 dark:text-yellow-500 bg-yellow-100/50 dark:bg-green-900/10' : 'text-green-700 dark:text-green-400 bg-green-100/50 dark:bg-green-900/10'}
                                                    `}>
                                                        {diffVal}
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

                                        <td className={`p-0 border border-green-200 dark:border-zinc-700`}>
                                            <div className="flex items-center justify-center gap-2 w-full h-full py-2 px-2">
                                                <button
                                                    onClick={() => handleRowEdit(rowIndex)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                                                    title="Edit Row"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setRowToDelete(time)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    title="Clear Row"
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
            </div>
            
        </div>
    );
}