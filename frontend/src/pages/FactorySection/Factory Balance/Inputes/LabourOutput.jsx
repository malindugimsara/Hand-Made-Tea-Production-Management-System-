import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Users, Clock, Activity, Plus, Trash2, Calculator, Calendar, Eraser } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LabourOutput() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const navigate = useNavigate();

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || false;
    });

    const username = localStorage.getItem('username') || 'Unknown User';
    const userRole = localStorage.getItem('userRole') || '';
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

    const [formData, setFormData] = useState({
        section: '',
        noOfLabours: '',
        otHours: '',
    });

    // Initialize the queue from local storage if it exists
    const [pendingRecords, setPendingRecords] = useState(() => {
        const savedQueue = localStorage.getItem('labourOutputQueue');
        return savedQueue ? JSON.parse(savedQueue) : [];
    });

    const [madeTeaToday, setMadeTeaToday] = useState(0);
    const [isLoadingTea, setIsLoadingTea] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);

    // Sync pending records to local storage whenever they change
    useEffect(() => {
        localStorage.setItem('labourOutputQueue', JSON.stringify(pendingRecords));
    }, [pendingRecords]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        const fetchMadeTeaForDate = async () => {
            setIsLoadingTea(true);
            try {
                const token = localStorage.getItem('token');
                const month = recordDate.slice(0, 7);
                const res = await fetch(`${BACKEND_URL}/api/factory-logs?month=${month}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const recordsArray = Array.isArray(data) ? data : (data.records || []);

                    const todaysRecord = recordsArray.find(r => {
                        const cleanRecordDate = r.date.includes('T') ? r.date.split('T')[0] : r.date;
                        return cleanRecordDate === recordDate;
                    });

                    if (todaysRecord && todaysRecord.greenLeaf && todaysRecord.greenLeaf.today) {
                        const selectedMonthNumber = parseInt(recordDate.split('-')[1], 10);
                        const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
                        const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;

                        const calculatedMadeTea = todaysRecord.greenLeaf.today * conversionRate;
                        setMadeTeaToday(calculatedMadeTea);
                    } else {
                        setMadeTeaToday(0);
                    }
                }
            } catch (error) {
                toast.error("Network error fetching Made Tea.");
                setMadeTeaToday(0);
            } finally {
                setIsLoadingTea(false);
            }
        };

        fetchMadeTeaForDate();
    }, [recordDate, BACKEND_URL]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddToList = (e) => {
        e.preventDefault();
        if (isViewer) {
            toast.error("Viewers cannot add records.");
            return;
        }
        if (!formData.section) {
            toast.error("Please select a section.");
            return;
        }

        const isDuplicate = pendingRecords.some(r => r.section === formData.section);
        if (isDuplicate) {
            toast.error(`${formData.section} section is already in the queue!`);
            return;
        }

        const labours = Number(formData.noOfLabours) || 0;
        const otHours = Number(formData.otHours) || 0;

        const newRecord = {
            section: formData.section,
            noOfLabours: labours,
            otHours: otHours,
        };

        setPendingRecords([...pendingRecords, newRecord]);
        setFormData({ section: '', noOfLabours: '', otHours: '' });
    };

    const handleRemoveFromList = (indexToRemove) => {
        setPendingRecords(pendingRecords.filter((_, index) => index !== indexToRemove));
    };

    const handleClearQueue = () => {
        setPendingRecords([]);
        localStorage.removeItem('labourOutputQueue');
        toast.success("Temporary queue cleared.");
    };

    // --- Live Calculations ---
    const currentLabours = Number(formData.noOfLabours) || 0;
    const currentOtHours = Number(formData.otHours) || 0;

    const listLabours = pendingRecords.reduce((sum, item) => sum + item.noOfLabours, 0);
    const listOtHours = pendingRecords.reduce((sum, item) => sum + item.otHours, 0);

    const totalLabours = listLabours + currentLabours;
    const totalOtHours = listOtHours + currentOtHours;

    const otShifts = totalOtHours / 5.5;
    const totalShifts = totalLabours + otShifts;
    const labourOutput = totalShifts > 0 ? (madeTeaToday / totalShifts) : 0;
    // ------------------------------------------------

    // --- Bulk Save Handler ---
    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("Please add at least one section to the queue.");
            return;
        }
        setIsSavingAll(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} queued records...`);

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            const finalLabourOutput = totalShifts > 0 ? (madeTeaToday / totalShifts) : 0;

            const recordsToSave = pendingRecords.map(record => {
                const recOtShifts = record.otHours / 5.5;
                const recTotalShifts = record.noOfLabours + recOtShifts;

                return {
                    date: recordDate,
                    madeTea: madeTeaToday,
                    section: record.section,
                    noOfLabours: record.noOfLabours,
                    otHours: record.otHours,
                    totalShifts: recTotalShifts,
                    labourOutput: finalLabourOutput,
                    username
                };
            });

            const res = await fetch(`${BACKEND_URL}/api/labour-output`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ records: recordsToSave })
            });

            if (!res.ok) throw new Error("Failed to save records to the database.");

            toast.success("All queued records saved successfully!", { id: toastId });
            
            // Clear state and local storage on success
            setPendingRecords([]);
            localStorage.removeItem('labourOutputQueue');
            
            // --- REDIRECT HAPPENS HERE ---
            setTimeout(() => {
                navigate("/factory/labouroutputlist");
            }, 600);

        } catch (error) {
            toast.error(error.message || "Error saving records.", { id: toastId });
        } finally {
            setIsSavingAll(false);
        }
    };

    const inputStyles = "w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-400/20 focus:outline-none transition-all";

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 bg-[#f3faf7] dark:bg-gray-900">
            <div className="max-w-[1200px] mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border bg-white dark:bg-gray-800 border-teal-100 dark:border-teal-900 text-[#235b4e] dark:text-teal-400 transition-colors">
                        <Users size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-[#235b4e] dark:text-teal-400 transition-colors">Labour Output</h2>
                        <p className="font-bold mt-1 uppercase tracking-widest text-xs text-[#3a8372] dark:text-teal-500 transition-colors">Shift & Efficiency Tracking</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                    {/* LEFT SIDE (Form & List) */}
                    <div className="xl:col-span-7">
                        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">

                            {/* DATE & MADE TEA */}
                            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Record Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={recordDate}
                                            onChange={(e) => setRecordDate(e.target.value)}
                                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                            className={`${inputStyles} pl-4 pr-10 cursor-pointer`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Made Tea (kg)</label>
                                    <div className={`w-full p-3 border rounded-xl flex items-center h-[50px] font-black transition-colors ${isLoadingTea ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200' : 'bg-[#f0fdf4] dark:bg-green-900/20 border-[#bbf7d0] dark:border-green-800 text-[#166534] dark:text-green-400'}`}>
                                        {isLoadingTea ? 'Fetching...' : madeTeaToday.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* INPUT FIELDS SECTION */}
                            <div className="bg-[#f8fafc] dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 mb-8 transition-colors">
                                <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-[#235b4e] dark:text-teal-400">
                                    <Activity size={20} /> Input Fields
                                </h3>

                                <form onSubmit={handleAddToList} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                                            Select or Type Section
                                        </label>
                                        <input
                                            type="text"
                                            list="section-options"
                                            name="section"
                                            value={formData.section}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="-- Select or Type Section --"
                                            className={`${inputStyles} text-sm w-full`}
                                            autoComplete="off"
                                        />
                                        <datalist id="section-options">
                                            <option value="Withering" />
                                            <option value="Rolling" />
                                            <option value="Drying" />
                                            <option value="Sifting" />
                                            <option value="Packing" />
                                            <option value="Firewood" />
                                        </datalist>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <Users size={12} /> No. of Labours
                                        </label>
                                        <input
                                            type="number" min="0" step="1" name="noOfLabours"
                                            value={formData.noOfLabours} onChange={handleInputChange}
                                            onWheel={(e) => e.target.blur()} required placeholder="e.g. 12"
                                            className={`${inputStyles} text-sm`}
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <Clock size={12} /> O/T Hours
                                        </label>
                                        <input
                                            type="number" min="0" step="0.5" name="otHours"
                                            value={formData.otHours} onChange={handleInputChange}
                                            onWheel={(e) => e.target.blur()}  placeholder="e.g. 11"
                                            className={`${inputStyles} text-sm`}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={isViewer || madeTeaToday === 0}
                                            className="w-full h-[50px] bg-[#3a8372] hover:bg-[#2c6557] disabled:bg-gray-300 text-white font-black rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                </form>

                                {/* LIST JUST BELOW INPUTS */}
                                {pendingRecords.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Temporary Queue ({pendingRecords.length})</span>
                                            <button 
                                                onClick={handleClearQueue}
                                                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                            >
                                                <Eraser size={12} /> Clear Queue
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {pendingRecords.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                                    <div className="grid grid-cols-3 w-full gap-4 items-center">
                                                        <span className="font-bold text-sm text-[#235b4e] dark:text-teal-400 truncate">{item.section}</span>
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1"><Users size={12} /> {item.noOfLabours} Labours</span>
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1"><Clock size={12} /> {item.otHours} hrs OT</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveFromList(index)} className="ml-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* MAIN SAVE BUTTON */}
                            <button
                                onClick={handleSaveAll}
                                disabled={isViewer || pendingRecords.length === 0 || isSavingAll}
                                className="w-full py-4 rounded-xl text-white font-black text-lg uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-all hover:bg-[#1a4a3e] bg-[#235b4e] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={22} /> {isSavingAll ? "Saving..." : "Save Record"}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT SIDE (Live Calculations matching image) */}
                    <div className="xl:col-span-5">
                        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 sticky top-6 overflow-hidden transition-colors">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300">
                                    <Calculator size={20} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">Live Calculations</h3>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-gray-700">
                                    <div>
                                        <span className="block text-sm font-bold text-gray-600 dark:text-gray-300">O/T Shifts</span>
                                        <span className="block text-[10px] font-medium text-gray-400 mt-1">(O/T Hours ÷ 5.5)</span>
                                    </div>
                                    <span className="text-2xl font-black text-[#1e293b] dark:text-gray-200">{otShifts > 0 ? otShifts.toFixed(2) : '0.00'}</span>
                                </div>

                                <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-gray-700">
                                    <div>
                                        <span className="block text-sm font-bold text-gray-600 dark:text-gray-300">Total Equivalent Shifts</span>
                                        <span className="block text-[10px] font-medium text-gray-400 mt-1">(Labours + O/T Shifts)</span>
                                    </div>
                                    <span className="text-2xl font-black text-[#1e293b] dark:text-gray-200">{totalShifts > 0 ? totalShifts.toFixed(2) : '0.00'}</span>
                                </div>

                                <div className="pt-2">
                                    <div className="mb-4">
                                        <span className="block text-sm font-bold text-gray-600 dark:text-gray-300">Final Labour Output</span>
                                        <span className="block text-[10px] font-medium text-gray-400 mt-1">(Made Tea ÷ Total Shifts)</span>
                                    </div>

                                    <div className={`w-full py-8 rounded-2xl flex flex-col items-center justify-center border-2 transition-colors ${labourOutput >= 30
                                            ? 'bg-[#f0fdf4] dark:bg-green-900/20 border-[#bbf7d0] dark:border-green-800 text-[#166534] dark:text-green-500'
                                            : labourOutput > 0
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-500'
                                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                        }`}>
                                        <span className="text-[3.5rem] leading-none font-black">
                                            {labourOutput > 0 ? labourOutput.toFixed(2) : '0.00'}
                                        </span>
                                        <span className="text-xs font-black mt-3 uppercase tracking-widest">kg / shift</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}