import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Leaf, Zap, Scale, Package } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

export default function GreenLeafRecordForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        receivedTotal: '',
        receivedSelected: '',
        returnToMain: '0', // Defaulting to 0 based on the table
        madeTeaType: '',
        madeTeaKg: '',
        meterStart: '',
        meterEnd: ''
    });
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchLastReading();
    }, []);

    const fetchLastReading = async () => {
        try {
            // Adjust the API endpoint to your green leaf routes
            const response = await fetch(`${BACKEND_URL}/api/greenleaf`);
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

    // Auto-calculate Total Meter Points (Dryer)
    const meterPoints = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);

        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);

        // Validations
        if (formData.meterEnd && mEnd < mStart) {
            toast.error("End Reading must be greater than Start Reading!");
            setShowSpinner(false);
            return;
        }

        const toastId = toast.loading('Saving green leaf record...');

        try {
            const payload = {
                date: formData.date,
                receivedTotal: Number(formData.receivedTotal),
                receivedSelected: Number(formData.receivedSelected),
                returnToMain: Number(formData.returnToMain),
                madeTeaType: formData.madeTeaType,
                madeTeaKg: Number(formData.madeTeaKg),
                meterStart: mStart,
                meterEnd: mEnd,
                meterPoints: meterPoints
            };

            const response = await fetch(`${BACKEND_URL}/api/greenleaf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record saved successfully!", { id: toastId });
                
                setFormData(prev => ({
                    ...prev,
                    receivedTotal: '',
                    receivedSelected: '',
                    returnToMain: '0',
                    madeTeaType: '',
                    madeTeaKg: '',
                    meterStart: mEnd ? mEnd.toString() : '', 
                    meterEnd: ''
                }));
                navigate('/view-greenleaf-records'); // Adjust navigation route as needed
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
        <div className="p-8 max-w-4xl mx-auto font-sans">
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2 font-medium">Green Leaf Record Form</p>
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
                    </div>
                </div>

                {/* Green Leaf Intake Section */}
                <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                        <Leaf size={20} /> Green Leaf Details (kg)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Received Total (kg)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                name="receivedTotal" 
                                value={formData.receivedTotal} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Selected (kg)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                name="receivedSelected" 
                                value={formData.receivedSelected} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Return to Main Factory</label>
                            <input 
                                type="number" 
                                step="0.01"
                                name="returnToMain" 
                                value={formData.returnToMain} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-400 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* Made Tea Output Section */}
                <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
                        <Package size={20} /> Made Tea Output
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Type of Tea</label>
                            <select 
                                name="madeTeaType" 
                                value={formData.madeTeaType} 
                                onChange={handleInputChange} 
                                required
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                            >
                                <option value="" disabled>Select Tea Type</option>
                                <option value="Purple Tea">Purple Tea</option>
                                <option value="Silver Green">Silver Green</option>
                                <option value="Golden Tips">Golden Tips</option>
                                <option value="Pink Tea">Pink Tea</option>
                                <option value="White Tea">White Tea</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                                <Scale size={14}/> Amount (kg)
                            </label>
                            <input 
                                type="number" 
                                step="0.001"
                                name="madeTeaKg" 
                                value={formData.madeTeaKg} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* Dryer Meter Reading Section */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Zap size={20} /> Dryer Meter Reading
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
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Total Points</label>
                            <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md text-center">
                                {meterPoints > 0 ? meterPoints : 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
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
                        className={`w-full h-14 text-white font-bold rounded-lg text-lg transition-all ${
                            showSpinner ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226] shadow-lg'
                        }`}
                        disabled={showSpinner}
                    >
                    {showSpinner ? "Saving Record..." : "Save Green Leaf Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}