import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Fan, Zap, Clock, PlusCircle, Trash2, ListChecks, Save, X } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

export default function DehydratorRecordForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);

    const [pendingRecords, setPendingRecords] = useState([]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        trial: '',
        meterStart: '',
        meterEnd: '',
        timePeriod: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchLastReading();
    }, []);

    const fetchLastReading = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/dehydrator`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    const lastRecord = sortedData[0];
                    
                    setFormData(prev => ({
                        ...prev,
                        meterStart: lastRecord.meterEnd ? lastRecord.meterEnd.toString() : '' 
                    }));
                }
            } else if (response.status === 401 || response.status === 403) {
                toast.error("Session expired. Please log in again.");
            }
        } catch (error) {
            console.error("Error fetching last reading:", error);
        }
    };

    // Auto-calculate Total Electricity Units
    const totalUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 1. Add to Pending List
    const handleAddToList = (e) => {
        e.preventDefault();

        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);
        const time = Number(formData.timePeriod);

        // Validations
        if (mEnd < mStart) {
            toast.error("End Reading must be greater than Start Reading!");
            return;
        }

        if (time <= 0) {
            toast.error("Time period must be greater than 0!");
            return;
        }

        const newRecord = { ...formData, totalUnits };
        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`${formData.trial} added to list!`);

        // Prepare form for the next entry
        setFormData(prev => ({
            ...prev,
            trial: '',
            meterStart: prev.meterEnd, // Auto-update meter start
            meterEnd: '',
            timePeriod: ''
        }));
    };

    // 2. Remove from List
    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

    // 3. Save All Records
    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("No records in the list to save!");
            return;
        }

        setShowSpinner(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const promises = pendingRecords.map(record => {
                const payload = {
                    date: record.date,
                    trial: record.trial,
                    meterStart: Number(record.meterStart),
                    meterEnd: Number(record.meterEnd),
                    totalUnits: record.totalUnits,
                    timePeriodHours: Number(record.timePeriod)
                };

                return fetch(`${BACKEND_URL}/api/dehydrator`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    if (!res.ok) {
                        if (res.status === 403) throw new Error('Access Denied');
                        throw new Error('Failed');
                    }
                    return res.json();
                });
            });

            await Promise.all(promises);

            toast.success("All records saved successfully!", { id: toastId });
            setPendingRecords([]);
            
            setTimeout(() => {
                navigate('/view-dehydrator-records');
            }, 1000);

        } catch (error) {
            console.error(error);
            if (error.message === 'Access Denied') {
                toast.error("Access Denied. You do not have permission to add records.", { id: toastId });
            } else {
                toast.error("Error saving some records. Please check.", { id: toastId });
            }
        } finally {
            setShowSpinner(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 text-center sm:text-left">
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500">Add Dehydrator Records</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Add multiple processing records and save them at once</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* --- 1. DATA ENTRY FORM (Left Side) --- */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                        
                        {/* General Info Section */}
                        <div className="mb-8 pb-6 border-b border-gray-100 dark:border-zinc-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Date</label>
                                    <input 
                                        type="date" 
                                        name="date" 
                                        value={formData.date} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <Fan size={18} className="text-[#1B6A31] dark:text-green-500" /> Trial (Item Name)
                                    </label>
                                    <input 
                                        type="text" 
                                        name="trial" 
                                        value={formData.trial} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g., Mango, Kiwi, Papaya" 
                                        required 
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Electricity Section */}
                        <div className="mb-8 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-6 transition-colors duration-300">
                            <h3 className="text-lg font-bold text-orange-600 dark:text-orange-500 mb-4 flex items-center gap-2">
                                <Zap size={20} /> Electricity Meter Reading
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Start Reading</label>
                                    <input 
                                        type="number" 
                                        name="meterStart" 
                                        value={formData.meterStart} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        className="w-full p-3 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">End Reading</label>
                                    <input 
                                        type="number" 
                                        name="meterEnd" 
                                        value={formData.meterEnd} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        className="w-full p-3 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Total Consumed</label>
                                    <div className="w-full p-3 border border-orange-300 dark:border-orange-700/50 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 font-bold rounded-md text-center transition-colors">
                                        {totalUnits > 0 ? totalUnits : 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Time Section */}
                        <div className="mb-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-6 transition-colors duration-300">
                            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                                <Clock size={20} /> Processing Time
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Time Period (Hours)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        name="timePeriod" 
                                        value={formData.timePeriod} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        placeholder="e.g., 3.5"
                                        className="w-full p-3 border border-blue-200 dark:border-blue-800/50 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-4 rounded-xl text-[#1B6A31] dark:text-green-400 bg-[#F8FAF8] dark:bg-green-900/30 border border-[#8CC63F] dark:border-green-700 font-bold flex justify-center items-center gap-2 hover:bg-[#eaf5e5] dark:hover:bg-green-900/50 transition-all"
                        >
                            <PlusCircle size={20} /> Add Record to List
                        </button>
                    </form>
                </div>

                {/* --- 2. PENDING LIST (Right Side) --- */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-blue-100 dark:border-blue-900/50 flex-1 flex flex-col sticky top-8 max-h-[80vh] transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-400">
                                    <ListChecks size={20} />
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Pending Records</h3>
                            </div>
                            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
                                {pendingRecords.length} Items
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {pendingRecords.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-16">
                                    <ListChecks size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">List is empty.</p>
                                    <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Fill the form and click 'Add to List'</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRecords.map((item, index) => (
                                        <div key={index} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                                            
                                            <button 
                                                onClick={() => handleRemoveFromList(index)}
                                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-800 dark:text-gray-200 text-lg">{item.trial}</span>
                                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase border border-blue-200 dark:border-blue-800/50">{item.timePeriod} Hrs</span>
                                                </div>
                                                
                                                <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-100 dark:border-zinc-700/50 text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors">
                                                    <span className="block text-gray-400 dark:text-gray-500 font-bold mb-0.5 text-[9px] uppercase">Electricity</span>
                                                    Units: <span className="font-bold text-orange-600 dark:text-orange-500">{item.totalUnits}</span>
                                                    <span className="ml-2 text-gray-400 dark:text-gray-500">({item.meterStart} - {item.meterEnd})</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={showSpinner}
                                className="w-full py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancel / Go Back
                            </button>

                            <button 
                                onClick={handleSaveAll}
                                disabled={showSpinner || pendingRecords.length === 0}
                                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                    showSpinner || pendingRecords.length === 0 
                                    ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                                    : 'bg-[#1B6A31] dark:bg-green-700 hover:bg-green-800 dark:hover:bg-green-600 hover:-translate-y-1'
                                }`}
                            >
                                <Save size={20} /> {showSpinner ? "Saving All..." : `Save All ${pendingRecords.length} Records`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}