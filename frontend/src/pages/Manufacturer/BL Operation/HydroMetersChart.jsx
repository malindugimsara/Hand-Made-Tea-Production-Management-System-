import React, { useState } from 'react';
import { Save, Calendar, Droplets, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// 💡 Time slots from 6:00 PM to 12:00 Noon (Next Day)
const TIME_SLOTS = [
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM"
];

const TROUGHS = [1, 2, 3, 4, 5, 6];

export default function HydroMetersChart() {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false); // 💡 Clear Animation State

    // 💡 Initialize Empty Data Grid State
    const initializeData = () => {
        const initial = {};
        TIME_SLOTS.forEach(time => {
            initial[time] = {};
            TROUGHS.forEach(trough => {
                initial[time][trough] = { dry: '', wet: '' };
            });
        });
        return initial;
    };

    const [formData, setFormData] = useState(initializeData());

    // 💡 Handle Input Changes
    const handleInputChange = (time, trough, field, value) => {
        // Allow only numbers and decimals
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        setFormData(prev => ({
            ...prev,
            [time]: {
                ...prev[time],
                [trough]: {
                    ...prev[time][trough],
                    [field]: value
                }
            }
        }));
    };

    // 💡 Keyboard Navigation Logic (Enter & Arrow Keys)
    const handleKeyDown = (e, rowIndex, troughIndex, field) => {
        const columnsPerRow = 12; // 6 Troughs * 2 Inputs (Dry & Wet)
        const currentIndex = (rowIndex * columnsPerRow) + (troughIndex * 2) + (field === 'dry' ? 0 : 1);
        let nextIndex = null;

        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            nextIndex = currentIndex + 1; // Right
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nextIndex = currentIndex - 1; // Left
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = currentIndex + columnsPerRow; // Down
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = currentIndex - columnsPerRow; // Up
        }

        if (nextIndex !== null) {
            const nextInput = document.querySelector(`input[data-index="${nextIndex}"]`);
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
    };

    // 💡 Calculate Difference (Dry - Wet)
    const calculateDifference = (dry, wet) => {
        const dryVal = parseFloat(dry);
        const wetVal = parseFloat(wet);
        if (!isNaN(dryVal) && !isNaN(wetVal)) {
            return (dryVal - wetVal).toFixed(2);
        }
        return '';
    };

    // 💡 Handle Save Action (Mock)
    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading("Saving Hydro Meter Data...");
        
        try {
            console.log("Saving Data for Date:", selectedDate, formData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Data saved successfully!", { id: toastId });
        } catch (error) {
            toast.error("Failed to save data.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    // 💡 Clear Data with Animation
    const handleClear = () => {
        if(window.confirm("Are you sure you want to clear all entered data for this date?")) {
            setIsClearing(true); // Start animation
            setFormData(initializeData()); // Clear data
            
            // Stop animation after 600ms
            setTimeout(() => {
                setIsClearing(false);
            }, 600);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1800px] mx-auto font-sans min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
                <div>
                    <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-500 flex items-center gap-2 uppercase tracking-wide">
                        <Droplets size={26} className="text-blue-600 dark:text-blue-400" /> 
                        Hydro Meters Chart
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Hourly intervals from 6:00 PM to 12:00 Noon
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Calendar size={18} className="absolute left-3 top-3 text-blue-600 dark:text-blue-500" />
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2.5 border border-blue-200 dark:border-zinc-700 rounded-lg text-sm font-bold outline-none bg-blue-50/50 dark:bg-zinc-800 text-blue-800 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                        />
                    </div>

                    {/* 💡 Animated Clear Button */}
                    <button 
                        onClick={handleClear}
                        disabled={isClearing}
                        className="group p-2.5 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-red-600 dark:hover:text-red-400 border border-transparent rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw 
                            size={18} 
                            className={`transition-transform duration-500 ease-in-out ${isClearing ? 'animate-spin text-red-500' : 'group-hover:-rotate-180'}`} 
                        /> 
                        Clear
                    </button>

                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="p-2.5 px-5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} 
                        Save Data
                    </button>
                </div>
            </div>

            {/* --- MAIN DATA ENTRY TABLE --- */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto custom-scrollbar max-h-[75vh]">
                    <table className="w-full text-center border-collapse whitespace-nowrap min-w-[1400px]">
                        
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr className="bg-blue-50 dark:bg-blue-900/20">
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 sticky left-0 z-30 bg-blue-100 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100 font-black uppercase text-sm tracking-wider w-[100px]">
                                    Time
                                </th>
                                {TROUGHS.map(trough => (
                                    <th key={trough} colSpan={3} className="p-3 border border-gray-300 dark:border-zinc-700 font-black text-gray-800 dark:text-gray-200 text-sm tracking-widest bg-[#f8fafc] dark:bg-zinc-800/80">
                                        Trough No {String(trough).padStart(2, '0')}
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-[#f1f5f9] dark:bg-zinc-800/50">
                                {TROUGHS.map(trough => (
                                    <React.Fragment key={`sub-${trough}`}>
                                        <th className="p-2 border border-gray-300 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[70px]">DRY BULK</th>
                                        <th className="p-2 border border-gray-300 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 w-[70px]">WET BULK</th>
                                        <th className="p-2 border border-gray-300 dark:border-zinc-700 text-[11px] font-bold text-blue-600 dark:text-blue-400 w-[70px] bg-blue-50/50 dark:bg-blue-900/10">DIFFERENCE</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-sm">
                            {TIME_SLOTS.map((time, rowIndex) => {
                                const isDivider = time === "12:00 AM" || time === "12:00 PM";
                                
                                return (
                                    <tr key={time} className={`hover:bg-blue-50/30 dark:hover:bg-zinc-800/30 transition-colors ${isDivider ? 'bg-gray-50 dark:bg-zinc-900/60' : 'bg-white dark:bg-zinc-950'}`}>
                                        
                                        {/* Time Column (Sticky) */}
                                        <td className={`p-0 border border-gray-300 dark:border-zinc-700 sticky left-0 z-10 font-bold text-gray-700 dark:text-gray-300 ${isDivider ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-950'}`}>
                                            <div className="flex items-center justify-center gap-2 w-full h-full py-2">
                                                {time}
                                            </div>
                                        </td>

                                        {/* Trough Data Columns */}
                                        {TROUGHS.map((trough, troughIndex) => {
                                            const dryVal = formData[time]?.[trough]?.dry || '';
                                            const wetVal = formData[time]?.[trough]?.wet || '';
                                            const diffVal = calculateDifference(dryVal, wetVal);
                                            const isNegative = diffVal !== '' && parseFloat(diffVal) < 0;

                                            // Unique data index calculation
                                            const dryIndex = (rowIndex * 12) + (troughIndex * 2);
                                            const wetIndex = (rowIndex * 12) + (troughIndex * 2) + 1;

                                            return (
                                                <React.Fragment key={`${time}-${trough}`}>
                                                    <td className="p-0 border border-gray-300 dark:border-zinc-700 relative">
                                                        <input 
                                                            data-index={dryIndex}
                                                            type="text" 
                                                            value={dryVal}
                                                            onChange={(e) => handleInputChange(time, trough, 'dry', e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, troughIndex, 'dry')}
                                                            className="w-full h-full p-2.5 text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-zinc-600"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    
                                                    <td className="p-0 border border-gray-300 dark:border-zinc-700 relative">
                                                        <input 
                                                            data-index={wetIndex}
                                                            type="text" 
                                                            value={wetVal}
                                                            onChange={(e) => handleInputChange(time, trough, 'wet', e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, rowIndex, troughIndex, 'wet')}
                                                            className="w-full h-full p-2.5 text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-zinc-600"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    
                                                    {/* DIFFERENCE */}
                                                    <td className={`p-2 border border-gray-300 dark:border-zinc-700 font-bold bg-gray-50/50 dark:bg-zinc-900/30
                                                        ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}
                                                    `}>
                                                        {diffVal}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
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