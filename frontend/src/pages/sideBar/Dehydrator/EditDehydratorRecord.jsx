import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Fan, Zap, Clock, ArrowLeft, Scale, Droplets, Users, Banknote } from "lucide-react"; 
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditDehydratorRecord() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    const [showSpinner, setShowSpinner] = useState(false);
    const [recordId, setRecordId] = useState(null);

    const [formData, setFormData] = useState({
        date: '',
        trial: '',
        meterStart: '',
        meterEnd: '',
        timePeriodHours: '',
        startWeight: '',
        endWeight: '',
        labourHours: '',
        labourCostPer8Hours: '', 
        moisturePercentage: '',
        electricityRate: ''
    });

    useEffect(() => {
        if (location.state && location.state.recordData) {
            const data = location.state.recordData;
            setRecordId(data._id);
            setFormData({
                date: data.date || '',
                trial: data.trial || '',
                meterStart: data.meterStart || '',
                meterEnd: data.meterEnd || '',
                timePeriodHours: data.timePeriodHours || data.timePeriod || '', 
                startWeight: data.startWeight || '',
                endWeight: data.endWeight || '',
                labourHours: data.labourHours || '',
                labourCostPer8Hours: data.labourCostPer8Hours || '',
                moisturePercentage: data.moisturePercentage || '',
                electricityRate: data.electricityRate || ''
            });
        } else {
            toast.error("No record data found to edit.");
            navigate(-1); 
        }
    }, [location, navigate]);

    // Auto-Calculations for UI display
    const totalUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);
    
    const calculatedLabourCost = formData.labourCostPer8Hours && formData.labourHours
        ? (Number(formData.labourCostPer8Hours) / 8) * Number(formData.labourHours)
        : 0;

    const calculatedElectricityCost = formData.electricityRate && totalUnits > 0
        ? totalUnits * Number(formData.electricityRate)
        : 0;

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Prevent negative values for numeric fields
        const numericFields = ['meterStart', 'meterEnd', 'timePeriodHours', 'startWeight', 'endWeight', 'labourHours', 'labourCostPer8Hours', 'moisturePercentage', 'electricityRate'];
        if (numericFields.includes(name)) {
            if (value !== '' && (Number(value) < 0 || value.includes('-'))) {
                return; 
            }
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);

        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);
        const time = Number(formData.timePeriodHours);

        // Validations
        if (mEnd < mStart) {
            toast.error("End Reading must be greater than Start Reading!");
            setShowSpinner(false);
            return;
        }

        if (time <= 0) {
            toast.error("Time period must be greater than 0!");
            setShowSpinner(false);
            return;
        }

        const toastId = toast.loading('Updating dehydrator record...');

        try {
            const token = localStorage.getItem('token');
            const currentUsername = localStorage.getItem('username') || 'Unknown User';

            const payload = {
                date: formData.date,
                trial: formData.trial,
                meterStart: mStart,
                meterEnd: mEnd,
                totalUnits: totalUnits,
                timePeriodHours: time,
                startWeight: Number(formData.startWeight),
                endWeight: Number(formData.endWeight),
                labourHours: Number(formData.labourHours),
                labourCostPer8Hours: Number(formData.labourCostPer8Hours),
                moisturePercentage: Number(formData.moisturePercentage),
                electricityRate: Number(formData.electricityRate),
                updatedBy: currentUsername // <-- This updates the "Edited by" column in your table!
            };

            // UPDATE request to Backend (PUT method)
            const response = await fetch(`${BACKEND_URL}/api/dehydrator/${recordId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => {
                    navigate(-1);
                }, 500);
            } else {
                if (response.status === 403) {
                    toast.error("Access Denied. You do not have permission.", { id: toastId });
                } else {
                    toast.error("Error updating record.", { id: toastId });
                }
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
  
            
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to Records
            </button>
            
            <div className="mb-8 mt-10 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500">Edit Dehydrator Record</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously saved trial details</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                
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

                {/* Weight & Moisture Section */}
                <div className="mb-8 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                    <h3 className="text-lg font-bold text-teal-700 dark:text-teal-500 mb-4 flex items-center gap-2">
                        <Scale size={20} /> Weight & Moisture Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Start Weight (kg)</label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                name="startWeight" 
                                value={formData.startWeight} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">End Weight (kg)</label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                name="endWeight" 
                                value={formData.endWeight} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                Moisture <Droplets size={12} className="text-teal-600 dark:text-teal-400"/> (%)
                            </label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                max="100"
                                name="moisturePercentage" 
                                value={formData.moisturePercentage} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-teal-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                    </div>
                </div>

                {/* Electricity Section */}
                <div className="mb-8 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-6 transition-colors duration-300">
                    <h3 className="text-lg font-bold text-orange-600 dark:text-orange-500 mb-4 flex items-center gap-2">
                        <Zap size={20} /> Electricity Meter & Cost
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                                step="any"
                                min="0"
                                name="timePeriodHours" 
                                value={formData.timePeriodHours} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
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

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`w-2/3 h-14 text-white font-bold rounded-lg transition-all ${
                            showSpinner ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-[#1B6A31] dark:bg-green-700 hover:bg-[#145226] dark:hover:bg-green-600 shadow-lg'
                        }`}
                        disabled={showSpinner}
                    >
                        {showSpinner ? "Updating..." : "Update Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}