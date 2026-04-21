import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Zap, Clock, PlusCircle, Trash2, ListChecks, Save, Scale, Droplets, Users, Banknote, X, Tag } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

export default function DehydratorRecordForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);

    const [pendingRecords, setPendingRecords] = useState([]);

    // Global Form Data (Machine usage & costs)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        meterStart: '',
        meterEnd: '',
        timePeriod: '',
        labourHours: '',
        labourCostPer8Hours: '',
        electricityRate: '20' 
    });

    // --- NEW: Dynamic State for Multiple Trials & Moisture Details ---
    const [trialsList, setTrialsList] = useState([
        { id: Date.now(), trialName: '', startWeight: '', endWeight: '', moisturePercentage: '' }
    ]);

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

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddTrialRow = () => {
        setTrialsList([...trialsList, { id: Date.now(), trialName: '', startWeight: '', endWeight: '', moisturePercentage: '' }]);
    };

    const handleRemoveTrialRow = (idToRemove) => {
        if (trialsList.length === 1) return; 
        setTrialsList(trialsList.filter(row => row.id !== idToRemove));
    };

    const handleTrialChange = (id, field, value) => {
        // Prevent negative values for numeric fields
        if (field !== 'trialName' && value !== '' && (Number(value) < 0 || value.includes('-'))) {
            return;
        }

        setTrialsList(trialsList.map(row => 
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    // Calculate Totals dynamically for display
    const totalStartWeight = trialsList.reduce((sum, row) => sum + (Number(row.startWeight) || 0), 0);
    const totalEndWeight = trialsList.reduce((sum, row) => sum + (Number(row.endWeight) || 0), 0);

    // Auto-Calculations for Costs
    const totalUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);
    
    const calculatedLabourCost = formData.labourCostPer8Hours && formData.labourHours
        ? (Number(formData.labourCostPer8Hours) / 8) * Number(formData.labourHours)
        : 0;

    const calculatedElectricityCost = formData.electricityRate && totalUnits > 0
        ? totalUnits * Number(formData.electricityRate)
        : 0;

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        const numericFields = ['meterStart', 'meterEnd', 'timePeriod', 'labourHours', 'labourCostPer8Hours', 'electricityRate'];
        if (numericFields.includes(name)) {
            if (value !== '' && (Number(value) < 0 || value.includes('-'))) {
                return; 
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddToList = (e) => {
        e.preventDefault();

        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);
        const time = Number(formData.timePeriod);

        if (mEnd < mStart) {
            toast.error("End Reading must be greater than Start Reading!");
            return;
        }
        if (time <= 0) {
            toast.error("Time period must be greater than 0!");
            return;
        }

        // Validate that all dynamic rows are filled
        const hasEmptyTrial = trialsList.some(row => !row.trialName || row.startWeight === '' || row.endWeight === '' || row.moisturePercentage === '');
        if (hasEmptyTrial) {
            toast.error("Please fill out all Trial & Moisture details completely!");
            return;
        }

        const newRecord = { 
            ...formData, 
            trials: trialsList, // Save the array of trials
            totalStartWeight,
            totalEndWeight,
            totalUnits, 
            calculatedLabourCost, 
            calculatedElectricityCost 
        };

        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`Record added to list!`);

        // Reset form for next entry
        setFormData(prev => ({
            ...prev,
            meterStart: prev.meterEnd,
            meterEnd: '',
            timePeriod: '',
            labourHours: '',
            labourCostPer8Hours: prev.labourCostPer8Hours, 
            electricityRate: prev.electricityRate 
        }));
        
        // Reset dynamic rows
        setTrialsList([{ id: Date.now(), trialName: '', startWeight: '', endWeight: '', moisturePercentage: '' }]);
    };

    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

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
                    meterStart: Number(record.meterStart),
                    meterEnd: Number(record.meterEnd),
                    totalUnits: record.totalUnits,
                    timePeriodHours: Number(record.timePeriod),
                    labourHours: Number(record.labourHours),
                    labourCostPer8Hours: Number(record.labourCostPer8Hours), 
                    totalLabourCost: record.calculatedLabourCost,            
                    electricityRate: Number(record.electricityRate),          
                    totalElectricityCost: record.calculatedElectricityCost,
                    trialsData: record.trials // The array of [{trialName, startWeight, endWeight, moisturePercentage}]
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
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Log dehydrator cycles with multiple items and moisture details</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                <div className="lg:col-span-3">
                    <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                        
                        {/* GENERAL DATE */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Processing Date</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full md:w-1/2 p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>

                        {/* --- DYNAMIC TRIALS & MOISTURE SECTION --- */}
                        <div className="mb-8 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-teal-700 dark:text-teal-500 flex items-center gap-2">
                                    <Scale size={20} /> Items & Moisture Details
                                </h3>
                                <button 
                                    type="button" 
                                    onClick={handleAddTrialRow}
                                    className="text-sm font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-800/60 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <PlusCircle size={16} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-6">
                                {trialsList.map((row, index) => (
                                    <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-teal-100 dark:border-teal-900/40 shadow-sm">
                                        
                                        {/* Remove Button (Hide if only 1 row exists) */}
                                        {trialsList.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveTrialRow(row.id)}
                                                className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                                title="Remove Item"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="lg:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Tag size={12} className="text-teal-600 dark:text-teal-400"/> Item Name
                                                </label>
                                                <input 
                                                    type="text" 
                                                    value={row.trialName}
                                                    onChange={(e) => handleTrialChange(row.id, 'trialName', e.target.value)}
                                                    required
                                                    placeholder="e.g., Mango"
                                                    className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-gray-50 dark:bg-zinc-900 dark:text-gray-100 transition-colors"
                                                />
                                            </div>

                                            <div className="lg:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Start Wt (kg)</label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    value={row.startWeight} 
                                                    onChange={(e) => handleTrialChange(row.id, 'startWeight', e.target.value)}
                                                    onWheel={(e) => e.target.blur()} 
                                                    required 
                                                    placeholder="50.5"
                                                    className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                            </div>

                                            <div className="lg:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">End Wt (kg)</label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    value={row.endWeight} 
                                                    onChange={(e) => handleTrialChange(row.id, 'endWeight', e.target.value)}
                                                    onWheel={(e) => e.target.blur()} 
                                                    required 
                                                    placeholder="12.2"
                                                    className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                            </div>

                                            <div className="lg:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    Moisture <Droplets size={12} className="text-teal-600 dark:text-teal-400"/> (%)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    max="100"
                                                    value={row.moisturePercentage} 
                                                    onChange={(e) => handleTrialChange(row.id, 'moisturePercentage', e.target.value)}
                                                    onWheel={(e) => e.target.blur()} 
                                                    required 
                                                    placeholder="4.5"
                                                    className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Batch Totals */}
                            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-teal-200/50 dark:border-teal-800/30 pt-4">
                                <div className="text-sm font-medium text-teal-800 dark:text-teal-300">
                                    Total Start: <span className="font-bold">{totalStartWeight.toFixed(2)} kg</span>
                                </div>
                                <div className="text-sm font-medium text-teal-800 dark:text-teal-300">
                                    Total End: <span className="font-bold">{totalEndWeight.toFixed(2)} kg</span>
                                </div>
                            </div>
                        </div>

                        {/* Electricity Section */}
                        <div className="mb-8 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-6 transition-colors duration-300">
                            <h3 className="text-lg font-bold text-orange-600 dark:text-orange-500 mb-4 flex items-center gap-2">
                                <Zap size={20} /> Electricity Meter & Cost
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Start Reading</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="meterStart" 
                                        value={formData.meterStart} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        className="w-full p-2 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">End Reading</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="meterEnd" 
                                        value={formData.meterEnd} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        className="w-full p-2 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Units Used</label>
                                    <div className="w-full p-2 border border-orange-300 dark:border-orange-700/50 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 font-bold rounded-md text-center transition-colors">
                                        {totalUnits > 0 ? totalUnits.toFixed(2) : 0}
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">Rate <Banknote size={10} className="text-orange-600 dark:text-orange-400"/></label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="electricityRate" 
                                        value={formData.electricityRate} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        placeholder="e.g. 50"
                                        className="w-full p-2 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Elec Cost</label>
                                    <div className="w-full p-2 border border-orange-400 dark:border-orange-600/50 bg-orange-200 dark:bg-orange-800/40 text-orange-900 dark:text-orange-300 font-bold rounded-md text-center transition-colors">
                                        {calculatedElectricityCost > 0 ? calculatedElectricityCost.toFixed(2) : "0.00"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Time & Labour Section */}
                        <div className="mb-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-6 transition-colors duration-300">
                            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                                <Clock size={20} /> Time & Labour Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Time Period (Hours)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="timePeriod" 
                                        value={formData.timePeriod} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        placeholder="e.g., 3.5"
                                        className="w-full p-3 border border-blue-200 dark:border-blue-800/50 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                        Labour Hours Worked <Users size={12} className="text-blue-600 dark:text-blue-400"/>
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="labourHours" 
                                        value={formData.labourHours} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        placeholder="e.g., 4"
                                        className="w-full p-3 border border-blue-200 dark:border-blue-800/50 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                        Labour Rate (Per 8 Hours) <Banknote size={12} className="text-blue-600 dark:text-blue-400"/>
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        name="labourCostPer8Hours" 
                                        value={formData.labourCostPer8Hours} 
                                        onChange={handleInputChange} 
                                        onWheel={(e) => e.target.blur()} 
                                        required 
                                        placeholder="e.g., 2000"
                                        className="w-full p-3 border border-blue-200 dark:border-blue-800/50 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Calculated Labour Cost</label>
                                    <div className="w-full p-3 border border-blue-300 dark:border-blue-700/50 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 font-bold rounded-md text-center transition-colors">
                                        {calculatedLabourCost > 0 ? calculatedLabourCost.toFixed(2) : "0.00"}
                                    </div>
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

                                            <div className="flex flex-col gap-2 pr-8">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Join all trial names for a quick summary */}
                                                    <span className="font-black text-gray-800 dark:text-gray-200 text-lg">
                                                        {item.trials.map(t => t.trialName).join(', ')}
                                                    </span>
                                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase border border-blue-200 dark:border-blue-800/50">{item.timePeriod} Hrs</span>
                                                </div>
                                                
                                                <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-gray-100 dark:border-zinc-700/50 text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors grid grid-cols-2 gap-2">
                                                    
                                                    <div>
                                                        <span className="block text-gray-400 dark:text-gray-500 font-bold mb-0.5 text-[9px] uppercase">Total Yield</span>
                                                        <div className="flex items-center gap-1 font-medium">
                                                            <span className="text-teal-600 dark:text-teal-400">{item.totalStartWeight.toFixed(2)}kg</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span className="text-teal-600 dark:text-teal-400">{item.totalEndWeight.toFixed(2)}kg</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">Items: <span className="font-bold">{item.trials.length}</span></div>
                                                    </div>

                                                    <div>
                                                        <span className="block text-gray-400 dark:text-gray-500 font-bold mb-0.5 text-[9px] uppercase">Electricity</span>
                                                        <div className="font-medium">
                                                            Cost: <span className="font-bold text-orange-600 dark:text-orange-500">{item.calculatedElectricityCost.toFixed(2)}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">Units: <span className="font-bold">{item.totalUnits.toFixed(2)}</span></div>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <span className="block text-gray-400 dark:text-gray-500 font-bold mb-0.5 text-[9px] uppercase">Labour</span>
                                                        <div className="font-medium flex gap-4">
                                                            <span>Cost: <span className="font-bold text-blue-600 dark:text-blue-400">{item.calculatedLabourCost.toFixed(2)}</span></span>
                                                            <span className="text-gray-500">Hours: <span className="font-bold text-gray-600 dark:text-gray-300">{item.labourHours}</span></span>
                                                        </div>
                                                    </div>

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