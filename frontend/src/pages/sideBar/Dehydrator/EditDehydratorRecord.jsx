import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Fan, Zap, Clock, ArrowLeft } from "lucide-react"; 
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
        timePeriodHours: ''
    });

    useEffect(() => {
        if (location.state && location.state.recordData) {
            const data = location.state.recordData;
            setRecordId(data._id);
            setFormData({
                date: data.date,
                trial: data.trial,
                meterStart: data.meterStart,
                meterEnd: data.meterEnd,
                timePeriodHours: data.timePeriodHours || data.timePeriod // handle prop name just in case
            });
        } else {
            toast.error("No record data found to edit.");
            navigate(-1); 
        }
    }, [location, navigate]);

    // Auto-calculate Total Electricity Units
    const totalUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
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
            const payload = {
                date: formData.date,
                trial: formData.trial,
                meterStart: mStart,
                meterEnd: mEnd,
                totalUnits: totalUnits,
                timePeriodHours: time
            };

            // UPDATE request to Backend (PUT method)
            const response = await fetch(`${BACKEND_URL}/api/dehydrator/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => {
                    navigate(-1);
                }, 500);
            } else {
                toast.error("Error updating record.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#1B6A31] transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to Records
            </button>
            
            <div className="mb-8 mt-10 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Edit Dehydrator Record</h2>
                <p className="text-gray-500 mt-2 font-medium">Update previously saved trial details</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                {/* General Info Section */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Date</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Fan size={18} className="text-[#1B6A31]" /> Trial (Item Name)
                            </label>
                            <input 
                                type="text" 
                                name="trial" 
                                value={formData.trial} 
                                onChange={handleInputChange} 
                                placeholder="e.g., Mango, Kiwi, Papaya" 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* Electricity Section */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Zap size={20} /> Electricity Meter Reading
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Start Reading</label>
                            <input 
                                type="number" 
                                name="meterStart" 
                                value={formData.meterStart} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">End Reading</label>
                            <input 
                                type="number" 
                                name="meterEnd" 
                                value={formData.meterEnd} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Total Consumed</label>
                            <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md text-center">
                                {totalUnits > 0 ? totalUnits : 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Section */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                        <Clock size={20} /> Processing Time
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Time Period (Hours)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                name="timePeriodHours" 
                                value={formData.timePeriodHours} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`w-2/3 h-14 text-white font-bold rounded-lg transition-all ${
                            showSpinner ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226] shadow-lg'
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