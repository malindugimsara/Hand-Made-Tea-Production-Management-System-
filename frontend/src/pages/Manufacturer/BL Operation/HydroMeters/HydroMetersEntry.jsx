import React, { useState, useEffect, useRef } from 'react';
import { Save, Calendar, Droplets, RefreshCw, AlertCircle, Trash2, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

// 💡 Time slots from 8:00 PM to 2:00 PM
const TIME_SLOTS = [
    "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM"
];

const TROUGHS = [1, 2, 3, 4, 5, 6];

export default function HydroMetersEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const currentUsername = localStorage.getItem("username") || "Unknown User"; 

    // URL එකේ '?date=YYYY-MM-DD' ලෙස ආවොත් එය ගනී, නැත්නම් අද දිනය ගනී.
    const [selectedDate, setSelectedDate] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);
        return queryParams.get('date') || new Date().toISOString().split('T')[0];
    });

    const [activeTimeIndex, setActiveTimeIndex] = useState(null); 
    const activeTime = activeTimeIndex !== null ? TIME_SLOTS[activeTimeIndex] : null;
    
    const timeScrollRef = useRef(null); // Auto-scroll සඳහා Ref එක

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    
    const [isDirty, setIsDirty] = useState(false);

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
    const [originalData, setOriginalData] = useState(initializeData());

    const navigate = useNavigate();

    // Active Time වෙනස් වන විට ස්වයංක්‍රීයව Scroll වීම
    useEffect(() => {
        if (timeScrollRef.current && activeTimeIndex !== null) {
            const activeBtn = timeScrollRef.current.children[activeTimeIndex];
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeTimeIndex]);

    // Fetch Data
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
                    setOriginalData(result.data);
                } else {
                    const emptyInit = initializeData();
                    setFormData(emptyInit);
                    setOriginalData(emptyInit);
                }
                setIsDirty(false); 
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Failed to load existing data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    // Handle Input Changes
    const handleInputChange = (trough, field, value) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        setFormData(prev => {
            const origVal = originalData[activeTime]?.[trough]?.[field];
            const isEditingExisting = origVal && origVal !== '' && origVal !== value;

            let newMeta = prev[activeTime]?.meta || null;

            if (isEditingExisting) {
                newMeta = {
                    editedBy: currentUsername,
                    editedAt: new Date().toISOString()
                };
            }

            return {
                ...prev,
                [activeTime]: {
                    ...prev[activeTime],
                    [trough]: {
                        ...prev[activeTime]?.[trough],
                        [field]: value
                    },
                    meta: newMeta
                }
            };
        });
        setIsDirty(true); 
    };

    // Enter / Arrow Key Navigation
    const handleKeyDown = (e, troughIndex, field) => {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            let nextId = null;

            if (field === 'wet') {
                nextId = `input-dry-${troughIndex}`;
            } else if (field === 'dry' && troughIndex < TROUGHS.length - 1) {
                nextId = `input-wet-${troughIndex + 1}`;
            }

            if (nextId) {
                const nextInput = document.getElementById(nextId);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            let prevId = null;

            if (field === 'dry') {
                prevId = `input-wet-${troughIndex}`;
            } else if (field === 'wet' && troughIndex > 0) {
                prevId = `input-dry-${troughIndex - 1}`;
            }

            if (prevId) {
                const prevInput = document.getElementById(prevId);
                if (prevInput) {
                    prevInput.focus();
                    prevInput.select();
                }
            }
        }
    };

    // 💡 Update: DIFFERENCE = WET - DRY
    const calculateDifference = (dry, wet) => {
        const dryVal = parseFloat(dry);
        const wetVal = parseFloat(wet);
        if (!isNaN(dryVal) && !isNaN(wetVal)) {
            return (wetVal - dryVal).toFixed(2);
        }
        return '';
    };

    const hasData = (time) => {
        return TROUGHS.some(t => formData[time]?.[t]?.dry !== '' || formData[time]?.[t]?.wet !== '');
    };

   const handleNextTime = () => {
        if (activeTimeIndex !== null && activeTimeIndex < TIME_SLOTS.length - 1) {
            setActiveTimeIndex(prev => prev + 1);
        }
    };

    const handlePrevTime = () => {
        if (activeTimeIndex !== null && activeTimeIndex > 0) {
            setActiveTimeIndex(prev => prev - 1);
        }
    };

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
                body: JSON.stringify({ date: selectedDate, formData: formData })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            setOriginalData(formData); 
            setIsDirty(false); 
            toast.success("Data saved successfully!", { id: toastId });
            navigate("/manufacturer/bl-production/hydroMeterview")
        } catch (error) {
            toast.error(error.message || "Failed to save data.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearAll = async () => {
        setIsClearing(true);
        const toastId = toast.loading("Clearing data...");
        try {
            const emptyData = initializeData();
            setFormData(emptyData);
            setOriginalData(emptyData); 

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

    return (
        <div className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans min-h-screen flex flex-col bg-[#f8fafc] dark:bg-zinc-950 transition-colors duration-300">
            
            {/* UNSAVED CHANGES WARNING */}
            {isDirty && (
                <div className="mb-4 flex items-center justify-between gap-4 bg-red-100 dark:bg-red-900/40 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] p-4 rounded-2xl animate-pulse transition-all">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={28} className="text-red-600 dark:text-red-400 animate-bounce" />
                        <div>
                            <h3 className="text-red-800 dark:text-red-300 font-black text-sm sm:text-base uppercase tracking-wider">Unsaved Changes Detected!</h3>
                            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold">Please save your data to prevent data loss before changing dates.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Save Now
                    </button>
                </div>
            )}

            {/* --- HEADER SECTION --- */}
            <div className="mb-6 flex flex-col gap-5 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2 uppercase tracking-wide">
                            <Droplets size={26} className="text-green-600 dark:text-green-400" /> 
                            Enter Hydro Meters Data
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Select a time slot below and enter the trough readings.
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
                                    className="p-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Trash2 size={18} /> Clear All
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                                <AlertDialogHeader>
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
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

                        {/* Standard Save Button */}
                        {!isDirty && (
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving || isLoading} 
                                className="p-2.5 px-6 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-md shadow-green-500/20 transition-all active:scale-95"
                            >
                                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                                Saved
                            </button>
                        )}
                    </div>
                </div>

                {/* TIME SLOT SELECTOR WITH REF */}
                <div ref={timeScrollRef} className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar items-center scroll-smooth">
                    {TIME_SLOTS.map((time, idx) => (
                        <button
                            key={time}
                            onClick={() => setActiveTimeIndex(idx)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all flex-shrink-0
                                ${activeTimeIndex === idx 
                                    ? 'bg-green-600 text-white shadow-md shadow-green-600/30' 
                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700'
                                }
                            `}
                        >
                            {hasData(time) && <CheckCircle2 size={14} className={activeTimeIndex === idx ? "text-green-200" : "text-green-500"} />}
                            {time}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- DATA ENTRY CARDS --- */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-green-600 animate-spin" />
                </div>
            ) : activeTimeIndex === null ? (
                // 💡 වේලාවක් තෝරාගෙන නැතිවිට පෙන්වන පණිවිඩය
                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800 text-center">
                    <Calendar className="w-16 h-16 text-green-100 dark:text-green-900/40 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-500 dark:text-gray-400">No Time Slot Selected</h3>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-2">Please select a time slot from the top menu to enter trough readings.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6 relative">
                    
                    {/* Active Time Header */}
                    <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-green-100 dark:border-zinc-800 shadow-sm">
                        <button 
                            onClick={handlePrevTime} disabled={activeTimeIndex === 0}
                            className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-400 text-center">
                            Time: <span className="bg-green-100 dark:bg-green-900/40 px-4 py-1 rounded-lg ml-2">{activeTime}</span>
                        </h3>
                        
                        <button 
                            onClick={handleNextTime} disabled={activeTimeIndex === TIME_SLOTS.length - 1}
                            className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* ඉතිරි TROUGHS.map කොටස කලින් ආකාරයටම තබන්න */}
                        {TROUGHS.map((trough, idx) => {
                            const wetVal = formData[activeTime]?.[trough]?.wet || '';
                            const dryVal = formData[activeTime]?.[trough]?.dry || '';
                            const diffVal = calculateDifference(dryVal, wetVal);
                            const isNegative = diffVal !== '' && parseFloat(diffVal) < 0;

                            return (
                                <div key={`trough-${trough}`} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col gap-5 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                                    
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                                        <h4 className="text-lg font-black text-gray-800 dark:text-gray-200 uppercase">Trough {String(trough).padStart(2, '0')}</h4>
                                        <div className={`px-3 py-1 rounded-lg font-bold text-sm
                                            ${diffVal === '' ? 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400' :
                                              isNegative ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                                        `}>
                                            Diff: {diffVal || '-'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        
                                        {/* WET BULB */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">WET BULB</label>
                                            <input 
                                                id={`input-wet-${idx}`}
                                                type="text" 
                                                value={wetVal}
                                                onChange={(e) => handleInputChange(trough, 'wet', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, 'wet')}
                                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-center font-bold text-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-300 dark:placeholder-zinc-700"
                                                placeholder="-"
                                            />
                                        </div>

                                        {/* DRY BULB */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">DRY BULB</label>
                                            <input 
                                                id={`input-dry-${idx}`}
                                                type="text" 
                                                value={dryVal}
                                                onChange={(e) => handleInputChange(trough, 'dry', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, 'dry')}
                                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-center font-bold text-lg text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder-gray-300 dark:placeholder-zinc-700"
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                </div>
            )}
        </div>
    );
}