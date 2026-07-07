import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // Removed { Toaster } from import
import { Leaf, Package, RefreshCcw, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditFactoryLog() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Grab the record safely right away
    const record = location.state?.recordData || null;

    // 2. Initialize the state IMMEDIATELY using the passed record
    // Username is removed from here since we don't need user input for it anymore
    const [formData, setFormData] = useState({
        date: record?.date ? new Date(record.date).toISOString().split('T')[0] : '',
        greenLeafToday: record?.greenLeaf?.today || record?.greenLeafToday || '',
        dispatch: record?.dispatch || '',
        localSaleAndGratis: record?.localSaleAndGratis || record?.localSales || '',
        returnAmount: record?.returnAmount || ''
    });

    const [showSpinner, setShowSpinner] = useState(false);

    // 3. If no record was passed at all, show an error and bounce them back
    useEffect(() => {
        if (!record) {
            console.error("DEBUG: No location.state.recordData found!", location);
            toast.error("No record data found to edit.");
            navigate(-1);
        }
    }, [record, navigate, location]);

    // Real-time calculations
    const calculatedMadeTea = (Number(formData.greenLeafToday) || 0) * 0.215;
    const calculatedTotalOut = (Number(formData.dispatch) || 0) + (Number(formData.localSaleAndGratis) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Updating factory log...');

        try {
            // AUTO CAPTURE USERNAME:
            // ඔයාගේ Auth system එක අනුව මෙතන වෙනස් කරගන්න. 
            // උදාහරණයක් විදියට localStorage එකේ 'username' කියලා තියෙනවා නම්:
            const loggedInUser = localStorage.getItem('username') || 'System User';

            const payload = {
                date: formData.date,
                greenLeafToday: Number(formData.greenLeafToday) || 0,
                dispatch: Number(formData.dispatch) || 0,
                localSaleAndGratis: Number(formData.localSaleAndGratis) || 0,
                returnAmount: Number(formData.returnAmount) || 0,
                username: loggedInUser, // Automatically pass the editor's name
                isExplicitEdit: true
            };

            const response = await fetch(`${BACKEND_URL}/api/factory-logs`, {
                method: 'POST', // (Make sure your backend expects POST for updates, or change to PUT if needed)
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Factory log updated successfully!', { id: toastId });
                setTimeout(() => {
                    navigate(-1);
                }, 1500);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to update factory log.', { id: toastId });
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error('Network error. Please check your connection.', { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    if (!record || !formData.date) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-gray-500">
                <AlertTriangle size={48} className="text-orange-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-700">Data Missing</h2>
                <p className="mt-2">Please go back to the table and click "Edit" again.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#1B6A31] text-white rounded-md">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto font-sans">
            {/* Header & Back Button */}
            <div className="mb-8 relative flex flex-col items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-0 p-2 text-gray-500 hover:text-[#1B6A31] hover:bg-gray-100 rounded-full transition-all"
                    title="Go Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-3xl font-bold text-[#1B6A31]"> Factory Log</h2>
                <p className="text-gray-500 mt-2">Modify existing daily production data</p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p>
                    You are editing the record for <strong>{formData.date}</strong>. The date field is locked to prevent accidentally creating duplicate records.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">

                {/* DATE SECTION (Editor Input Removed) */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Record Date (Locked)</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        disabled
                        className="w-full md:w-1/2 p-3 border border-gray-200 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                    />
                </div>

                {/* 1. GREEN LEAF & MADE TEA */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2">
                        <Leaf size={20} /> Green Leaf & Production
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Green Leaf Today (kg)</label>
                            <input
                                type="number" step="0.01" name="greenLeafToday"
                                value={formData.greenLeafToday} onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Est. Made Tea (21.5%)</label>
                            <div className="w-full p-3 border border-[#A3D9A5] bg-white text-[#1B6A31] font-bold rounded-md flex items-center h-[50px]">
                                {calculatedMadeTea > 0 ? calculatedMadeTea.toFixed(3) : '0.000'} kg
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DISPATCH & LOCAL SALES */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Package size={20} /> Dispatch & Sales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dispatch</label>
                            <input
                                type="number" step="0.01" name="dispatch"
                                value={formData.dispatch} onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Local Sales & Gratis</label>
                            <input
                                type="number" step="0.01" name="localSaleAndGratis"
                                value={formData.localSaleAndGratis} onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()} 
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
                        <RefreshCcw size={20} /> Returns
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
                    className={`w-full h-14 text-white font-bold rounded-lg mt-2 text-lg transition-all duration-300 flex items-center justify-center gap-3 ${showSpinner
                            ? 'bg-[#4A9E46] cursor-not-allowed opacity-90'
                            : 'bg-[#1B6A31] hover:bg-[#145325] shadow-md hover:shadow-lg'
                        }`}
                    disabled={showSpinner}
                >
                    {showSpinner ? (
                        <>
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating Record...
                        </>
                    ) : (
                        "Update Factory Log"
                    )}
                </button>
            </form>
        </div>
    );
}