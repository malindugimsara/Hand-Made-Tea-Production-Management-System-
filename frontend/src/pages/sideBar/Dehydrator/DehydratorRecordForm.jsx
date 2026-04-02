import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // Toaster import kirima awashya natha (App.jsx eke thiyena nisa)
import { Fan, Zap, Clock } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

export default function DehydratorRecordForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);

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
            const response = await fetch(`${BACKEND_URL}/api/dehydrator`);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);

        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);
        const time = Number(formData.timePeriod);

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

        const toastId = toast.loading('Saving dehydrator record...');

        try {
            const payload = {
                date: formData.date,
                trial: formData.trial,
                meterStart: mStart,
                meterEnd: mEnd,
                totalUnits: totalUnits,
                timePeriodHours: time
            };

            const response = await fetch(`${BACKEND_URL}/api/dehydrator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record saved successfully!", { id: toastId });
                
                setFormData(prev => ({
                    ...prev,
                    trial: '',
                    meterStart: mEnd.toString(), 
                    meterEnd: '',
                    timePeriod: ''
                }));
                navigate('/view-dehydrator-records');
            } else {
                toast.error("Error saving record.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto font-sans">
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2 font-medium">Dehydrator Machine Records</p>
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
                                name="timePeriod" 
                                value={formData.timePeriod} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                placeholder="e.g., 3.5"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`w-full h-14 text-white font-bold rounded-lg mb-4 text-lg transition-all ${
                            showSpinner ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226] shadow-lg'
                        }`}
                        disabled={showSpinner}
                    >
                    {showSpinner ? "Saving Record..." : "Save Dehydrator Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}

