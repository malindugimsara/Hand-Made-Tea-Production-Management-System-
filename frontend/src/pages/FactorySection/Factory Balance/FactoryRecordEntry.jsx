import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function FactoryRecordEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        glToday: '',
        glToDate: '',
        mtToday: '',
        mtToDate: '',
        dispatch: '',
        localSales: '',
        returnInvoice: '',
        factoryBalance: ''
    });

    // Automatically calculate the Total (Dispatch + Local Sales)
    const calculatedTotalSales = (Number(formData.dispatch) || 0) + (Number(formData.localSales) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Saving production summary...');

        try {
            // Prepare payload
            const payload = {
                ...formData,
                totalSales: calculatedTotalSales // Include the auto-calculated total
            };

            // 👉 Replace this URL with your actual backend route when ready
            const response = await fetch(`${BACKEND_URL}/api/production-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Summary saved successfully!', { id: toastId });
                
                // Clear the form (except the date, which users might want to keep or change manually)
                setFormData({
                    ...formData,
                    glToday: '', glToDate: '', mtToday: '', mtToDate: '', 
                    dispatch: '', localSales: '', returnInvoice: '', factoryBalance: ''
                });
            } else {
                toast.error('Failed to save summary.', { id: toastId });
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error('Network error. Please check your connection.', { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto font-sans">
            <Toaster position="top-right" />
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2">Daily Production Summary Entry</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                {/* DATE SECTION */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Record Date</label>
                    <input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleInputChange} 
                        required 
                        className="w-full md:w-1/3 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" 
                    />
                </div>

                {/* 1. GREEN LEAF (G/L) */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2"><span>🌱</span> Green Leaf (G/L)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Today (kg)</label>
                            <input type="number" step="0.01" name="glToday" value={formData.glToday} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">To Date (kg)</label>
                            <input type="number" step="0.01" name="glToDate" value={formData.glToDate} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                    </div>
                </div>

                {/* 2. MADE TEA (M/T) */}
                <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2"><span>🫖</span> Made Tea (M/T)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Today (kg)</label>
                            <input type="number" step="0.01" name="mtToday" value={formData.mtToday} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">To Date (kg)</label>
                            <input type="number" step="0.01" name="mtToDate" value={formData.mtToDate} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400" />
                        </div>
                    </div>
                </div>

                {/* 3. DISPATCH & SALES */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2"><span>📦</span> Dispatch & Local Sales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dispatch</label>
                            <input type="number" step="0.01" name="dispatch" value={formData.dispatch} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Local Sales & Gratis</label>
                            <input type="number" step="0.01" name="localSales" value={formData.localSales} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total (Calculated)</label>
                            <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md flex items-center h-[50px]">
                                {calculatedTotalSales > 0 ? calculatedTotalSales.toFixed(2) : '0.00'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. BALANCES */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2"><span>⚖️</span> Returns & Balances</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Return Invoice</label>
                            <input type="number" step="0.01" name="returnInvoice" value={formData.returnInvoice} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Factory Balance</label>
                            <input type="number" step="0.01" name="factoryBalance" value={formData.factoryBalance} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className={`w-full h-14 text-white font-bold rounded-lg mb-4 text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
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
                            Saving Summary...
                        </>
                    ) : (
                        "Save Production Summary"
                    )}
                </button> 
            </form>
        </div>
    );
}