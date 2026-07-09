import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Truck, Store, RefreshCcw, ArrowLeft, Info, AlertTriangle, Tag, FileText, Save } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditDispatchLog() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Grab the record safely right away
    const record = location.state?.recordData || null;

    // 2. Initialize the state using the passed record
    const [formData, setFormData] = useState({
        date: record?.date ? new Date(record.date).toISOString().split('T')[0] : '',
        
        // Dispatch Fields
        invoiceNo: record?.invoiceNo || '',
        dispatchTeaType: record?.dispatchTeaType || '',
        dispatch: record?.dispatch || '',
        
        // Local Sale Fields
        localSaleTeaType: record?.localSaleTeaType || '',
        localSaleAndGratis: record?.localSaleAndGratis || record?.localSales || '',
        
        // Return Field
        returnAmount: record?.returnAmount || '',

        // HIDDEN FIELD: We MUST send the existing Green Leaf back to the backend, 
        // otherwise the backend will overwrite it to 0 during the update.
        greenLeafToday: record?.greenLeaf?.today || record?.greenLeafToday || 0,
    });

    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
        if (!record) {
            toast.error("No record data found to edit.");
            navigate(-1);
        }
    }, [record, navigate]);

    // Real-time calculation for Total Out
    const calculatedTotalOut = (Number(formData.dispatch) || 0) + (Number(formData.localSaleAndGratis) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Updating dispatch records...');

        try {
            const loggedInUser = localStorage.getItem('username') || 'System User';

            const payload = {
                date: formData.date,
                
                // Keep the original green leaf value unchanged
                greenLeafToday: Number(formData.greenLeafToday) || 0,
                
                // Updated Dispatch & Sales Data
                invoiceNo: formData.invoiceNo,
                dispatchTeaType: formData.dispatchTeaType,
                dispatch: Number(formData.dispatch) || 0,
                
                localSaleTeaType: formData.localSaleTeaType,
                localSaleAndGratis: Number(formData.localSaleAndGratis) || 0,
                
                returnAmount: Number(formData.returnAmount) || 0,
                
                username: loggedInUser,
                isExplicitEdit: true
            };

            const response = await fetch(`${BACKEND_URL}/api/factory-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Dispatch record updated successfully!', { id: toastId });
                setTimeout(() => {
                    navigate(-1); // Go back to the previous page (Dispatch View)
                }, 500);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to update record.', { id: toastId });
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
            <div className="flex flex-col items-center justify-center h-screen text-gray-500 bg-gray-50 dark:bg-gray-900">
                <AlertTriangle size={48} className="text-orange-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Data Missing</h2>
                <p className="mt-2 text-gray-500">Please go back to the table and click "Edit" again.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md">Go Back</button>
            </div>
        );
    }

    const inputStyles = "w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/30 focus:outline-none transition-all";

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto font-sans bg-[#f3faf7] dark:bg-gray-950 min-h-screen transition-colors duration-300">
            {/* Header & Back Button */}
            <div className="mb-8 relative flex flex-col items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-0 p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-full transition-all"
                    title="Go Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-teal-600 dark:text-teal-400 mb-3">
                    <Truck size={32} />
                </div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100">Edit Dispatch Log</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update invoice, types, and outgoing quantities</p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex items-start gap-3 text-sm shadow-sm">
                <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                    You are editing the dispatch record for <strong>{formData.date}</strong>. Note that modifying these weights will automatically recalculate the Factory Balance.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">

                {/* DATE SECTION (Locked) */}
                <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date (Locked)</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        disabled
                        className="w-full md:w-1/2 p-3 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-bold"
                    />
                </div>

                {/* 1. DISPATCH SECTION */}
                <div className="mb-6 bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-teal-700 dark:text-teal-400 mb-4 flex items-center gap-2 border-b border-teal-200/50 dark:border-teal-800/50 pb-3">
                        <Truck size={20} /> Dispatch Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Invoice No.</label>
                            <input
                                type="text" name="invoiceNo"
                                value={formData.invoiceNo} onChange={handleInputChange}
                                placeholder="E.g. INV-1002" className={inputStyles}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                            <div className="relative">
                                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" name="dispatchTeaType"
                                    value={formData.dispatchTeaType} onChange={handleInputChange}
                                    placeholder="E.g. BOPF" className={`${inputStyles} pl-10`}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Dispatch Quantity (kg)</label>
                        <input
                            type="number" step="0.01" min="0" name="dispatch"
                            value={formData.dispatch} onChange={handleInputChange}
                            onWheel={(e) => e.target.blur()}
                            placeholder="0.00 kg" className={inputStyles}
                        />
                    </div>
                </div>

                {/* 2. LOCAL SALES SECTION */}
                <div className="mb-6 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2 border-b border-orange-200/50 dark:border-orange-800/50 pb-3">
                        <Store size={20} /> Local Sales Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                            <div className="relative">
                                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" name="localSaleTeaType"
                                    value={formData.localSaleTeaType} onChange={handleInputChange}
                                    placeholder="E.g. Dust" className={`${inputStyles} pl-10`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Qty (kg)</label>
                            <input
                                type="number" step="0.01" min="0" name="localSaleAndGratis"
                                value={formData.localSaleAndGratis} onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()}
                                placeholder="0.00 kg" className={inputStyles}
                            />
                        </div>
                    </div>
                </div>

                {/* TOTAL OUT SUMMARY */}
                <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Out (Dispatch + Local Sales)</label>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">
                        {calculatedTotalOut > 0 ? calculatedTotalOut.toFixed(2) : '0.00'} <span className="text-sm text-gray-500">kg</span>
                    </div>
                </div>

                {/* 3. RETURNS */}
                <div className="mb-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/50 pb-3">
                        <RefreshCcw size={20} /> Returns
                    </h3>
                    <div className="w-full sm:w-1/2">
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Return Amount (kg)</label>
                        <input
                            type="number" step="0.01" min="0" name="returnAmount"
                            value={formData.returnAmount} onChange={handleInputChange}
                            onWheel={(e) => e.target.blur()}
                            placeholder="0.00 kg" className={inputStyles}
                        />
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className={`w-full h-14 text-white font-black rounded-xl mt-2 text-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${showSpinner
                            ? 'bg-teal-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-teal-600 to-teal-800 hover:-translate-y-0.5 hover:shadow-xl'
                        }`}
                    disabled={showSpinner}
                >
                    {showSpinner ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : (
                        <><Save size={22} /> Update Dispatch Record</>
                    )}
                </button>
            </form>
        </div>
    );
}