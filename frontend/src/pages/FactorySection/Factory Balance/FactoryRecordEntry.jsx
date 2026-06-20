import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Leaf, Package, RefreshCcw, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <-- 1. Import useNavigate

export default function FactoryDataEntryForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate(); // <-- 2. Initialize navigate
    const [showSpinner, setShowSpinner] = useState(false);
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        greenLeafToday: '',
        dispatch: '',
        localSaleAndGratis: '',
        returnAmount: '',
        username: '' // For tracking who edited/entered the record
    });

    // Real-time calculations to show the user before they submit
    const calculatedMadeTea = (Number(formData.greenLeafToday) || 0) * 0.215;
    const calculatedTotalOut = (Number(formData.dispatch) || 0) + (Number(formData.localSaleAndGratis) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Saving factory log...');

        try {
            // Ensure numbers are properly formatted before sending to your backend
            const payload = {
                date: formData.date,
                greenLeafToday: Number(formData.greenLeafToday) || 0,
                dispatch: Number(formData.dispatch) || 0,
                localSaleAndGratis: Number(formData.localSaleAndGratis) || 0,
                returnAmount: Number(formData.returnAmount) || 0,
                username: formData.username || 'System User'
            };

            const token = localStorage.getItem('token'); // Grab token for auth

            // Make the POST request
            const response = await fetch(`${BACKEND_URL}/api/factory-logs`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // <-- Prevents 401 Unauthorized errors
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Factory log saved successfully!', { id: toastId });
                
                // <-- 3. Redirect to the view page after 1.5 seconds
                setTimeout(() => {
                    navigate('/factory/view'); 
                }, 1500);

            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to save factory log.', { id: toastId });
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error('Network error. Please check your connection.', { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto font-sans">
            <Toaster position="top-right" />
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Main Factory Log</h2>
                <p className="text-gray-500 mt-2">Daily Data Entry & Edit System</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                {/* DATE & USER SECTION */}
                <div className="mb-8 pb-6 border-b border-gray-100 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Record Date</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleInputChange} 
                            required 
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" 
                        />
                    </div>
                </div>

                {/* 1. GREEN LEAF & MADE TEA */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2">
                        <Leaf size={20}/> Green Leaf & Production
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Green Leaf Today (kg)</label>
                            <input 
                                type="number" step="0.01" name="greenLeafToday" 
                                value={formData.greenLeafToday} onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Est. Made Tea (21.5%)</label>
                            <div className="w-full p-3 border border-[#A3D9A5] bg-white text-[#1B6A31] font-bold rounded-md flex items-center h-[50px]">
                                {calculatedMadeTea > 0 ? calculatedMadeTea.toFixed(3) : '0.000'} kg
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Calculated automatically by server.</p>
                        </div>
                    </div>
                </div>

                {/* 2. DISPATCH & LOCAL SALES */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Package size={20}/> Dispatch & Sales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dispatch</label>
                            <input 
                                type="number" step="0.01" name="dispatch" 
                                value={formData.dispatch} onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Local Sales & Gratis</label>
                            <input 
                                type="number" step="0.01" name="localSaleAndGratis" 
                                value={formData.localSaleAndGratis} onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} required 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Out</label>
                            <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md flex items-center h-[50px]">
                                {calculatedTotalOut > 0 ? calculatedTotalOut.toFixed(2) : '0.00'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. RETURNS */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                        <RefreshCcw size={20}/> Returns
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Return Amount</label>
                            <input 
                                type="number" step="0.01" name="returnAmount" 
                                value={formData.returnAmount} onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400" 
                            />
                        </div>
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className={`w-full h-14 text-white font-bold rounded-lg mt-2 text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                        showSpinner
                        ? 'bg-blue-400 cursor-not-allowed opacity-90'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
                    disabled={showSpinner}
                >
                    {showSpinner ? (
                        <>
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving Record...
                        </>
                    ) : (
                        "Save Factory Log"
                    )}
                </button> 
            </form>
        </div>
    );
}