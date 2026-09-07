import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Leaf, Package, ArrowLeft, Info, AlertTriangle, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditFactoryLog() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Grab the record safely
    const record = location.state?.recordData || null;

    // Safely parse the date to avoid Timezone shift issues
    const safeDate = record?.date 
        ? (record.date.includes('T') ? record.date.split('T')[0] : record.date) 
        : '';

    // =========================================================================
    // 💡 අලුත්: පැරණි (Legacy) දත්ත නිවැරදිව Brought Leaf එකට Map කිරීම
    // =========================================================================
    let initialEstate = record?.greenLeaf?.estateLeaf?.today ?? record?.greenLeaf?.estate ?? 0;
    let initialBrought = record?.greenLeaf?.broughtLeaf?.today ?? record?.greenLeaf?.brought ?? 0;
    
    // පරණ දත්තවල ඇති මුළු අගය ලබා ගැනීම
    const legacyTotal = record?.greenLeaf?.today ?? record?.greenLeafToday ?? 0;

    // පරණ මාසවල දත්ත නම් (Estate සහ Brought දෙකම 0 නම්, නමුත් පරණ Total එකක් තියෙනවා නම්)
    // එය ස්වයංක්‍රීයව Brought Leaf එකට ඇතුළත් කරයි.
    if (initialEstate === 0 && initialBrought === 0 && legacyTotal > 0) {
        initialBrought = legacyTotal;
    }

    // 2. Initialize the state IMMEDIATELY using the passed record
    const [formData, setFormData] = useState({
        date: safeDate,
        
        // 0 අගයන් Inputs වල හිස්ව (Empty string) පෙන්වීමට
        estateLeafToday: initialEstate > 0 ? initialEstate : '',
        broughtLeafToday: initialBrought > 0 ? initialBrought : '',
        
        // Dispatch & Sales data (Locked in UI, but needed for payload)
        dispatch: record?.dispatch || '',
        localSaleAndGratis: record?.localSaleAndGratis || record?.localSales || '',
        returnAmount: record?.returnAmount || '',
        
        // Keep the dispatch fields in state so they don't get wiped out
        invoiceNo: record?.invoiceNo || '',
        dispatchTeaType: record?.dispatchTeaType || '',
        localSaleTeaType: record?.localSaleTeaType || ''
    });

    const [showSpinner, setShowSpinner] = useState(false);

    // 3. If no record was passed, bounce them back
    useEffect(() => {
        if (!record) {
            toast.error("No record data found to edit.");
            navigate(-1);
        }
    }, [record, navigate]);

    // --- DYNAMIC CALCULATION LOGIC ---
    // Extract month from the selected date (1-12)
    const selectedMonthNumber = formData.date ? parseInt(formData.date.split('-')[1], 10) : new Date().getMonth() + 1;
    
    // April(4), May(5), June(6), September(9), October(10), November(11), December(12)
    const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
    
    // Determine conversion rate based on the month
    const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
    
    // Real-time calculations (Total එක සහ Made Tea එක)
    const totalGreenLeafToday = (Number(formData.estateLeafToday) || 0) + (Number(formData.broughtLeafToday) || 0);
    const calculatedMadeTea = totalGreenLeafToday * conversionRate;
    const calculatedTotalOut = (Number(formData.dispatch) || 0) + (Number(formData.localSaleAndGratis) || 0);
    // -------------------------------------

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please log in again.');
            navigate('/login');
            return;
        }

        setShowSpinner(true);
        const toastId = toast.loading('Updating factory log...');

        try {
            const loggedInUser = localStorage.getItem('username') || 'System User';
            
            const payload = {
                date: formData.date,
                
                // Backend Payload එකට Estate සහ Brought යැවීම
                estateLeafToday: Number(formData.estateLeafToday) || 0,
                broughtLeafToday: Number(formData.broughtLeafToday) || 0,
                greenLeafToday: totalGreenLeafToday, // Fallback

                dispatch: Number(formData.dispatch) || 0,
                localSaleAndGratis: Number(formData.localSaleAndGratis) || 0,
                returnAmount: Number(formData.returnAmount) || 0,
                
                // Send these back to the backend so they are not overwritten with ""
                invoiceNo: formData.invoiceNo,
                dispatchTeaType: formData.dispatchTeaType,
                localSaleTeaType: formData.localSaleTeaType,

                username: loggedInUser,
                isExplicitEdit: true
            };

            const response = await fetch(`${BACKEND_URL}/api/factory-logs`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Factory log updated successfully!', { id: toastId });
                setTimeout(() => {
                    // Navigate back to the Factory View page, passing the month of the edited record
                    const editMonth = formData.date.substring(0, 7);
                    navigate('/factory/view', { state: { returnMonth: editMonth } });
                }, 500);
            } else {
                const errorData = await response.json();
                if (response.status === 401 || response.status === 403) {
                    toast.error('Unauthorized access. Please log in again.', { id: toastId });
                    localStorage.removeItem('token');
                    navigate('/login');
                } else {
                    toast.error(errorData.message || 'Failed to update factory log.', { id: toastId });
                }
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
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-gray-500 dark:text-gray-400">
                <AlertTriangle size={48} className="text-orange-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Data Missing</h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Please go back to the table and click "Edit" again.</p>
                <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-[#1B6A31] dark:bg-teal-700 text-white rounded-lg hover:bg-[#145325] dark:hover:bg-teal-600 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto font-sans animate-fade-in transition-colors duration-300">
            {/* Header & Back Button */}
            <div className="mb-8 relative flex flex-col items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-1 p-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-all"
                    title="Go Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-400">Edit Factory Log</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Modify existing daily production data</p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex items-start gap-3 text-sm shadow-sm transition-colors">
                <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                    You are editing the record for <strong className="font-semibold">{formData.date}</strong>. The date field is locked to prevent accidentally modifying a different day's data.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">

                {/* DATE SECTION (Locked) */}
                <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Record Date</label>
                    <div className="relative w-full md:w-1/2">
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            disabled
                            className="w-full p-3 pl-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed transition-colors"
                        />
                        <Lock size={16} className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500" />
                    </div>
                </div>

                {/* 1. GREEN LEAF & MADE TEA */}
                <div className="mb-8 bg-[#F8FAF8] dark:bg-green-900/10 border border-[#A3D9A5] dark:border-green-800/40 rounded-xl p-6 transition-colors">
                    <h3 className="text-lg font-bold text-[#1B6A31] dark:text-green-400 mb-5 flex items-center gap-2">
                        <Leaf size={20} /> Green Leaf & Production
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estate Leaf (kg)</label>
                            <input
                                type="number" 
                                step="0.01" 
                                name="estateLeafToday"
                                value={formData.estateLeafToday} 
                                onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-500/50 focus:border-[#8CC63F] dark:focus:border-green-500 transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Brought Leaf (kg)</label>
                            <input
                                type="number" 
                                step="0.01" 
                                name="broughtLeafToday"
                                value={formData.broughtLeafToday} 
                                onChange={handleInputChange}
                                onWheel={(e) => e.target.blur()} 
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-500/50 focus:border-[#8CC63F] dark:focus:border-green-500 transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Green Leaf (kg)</label>
                            <div className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold rounded-lg flex items-center h-[50px] transition-colors">
                                {totalGreenLeafToday > 0 ? totalGreenLeafToday.toFixed(2) : '0.00'} kg
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Est. Made Tea <span className="text-[#1B6A31] dark:text-green-500">({conversionRate === 0.21 ? '21%' : '21.5%'})</span>
                            </label>
                            <div className="w-full p-3 border border-[#A3D9A5] dark:border-green-700/50 bg-white dark:bg-gray-700/50 text-[#1B6A31] dark:text-green-400 font-bold rounded-lg flex items-center h-[50px] shadow-sm transition-colors">
                                {calculatedMadeTea > 0 ? calculatedMadeTea.toFixed(3) : '0.000'} kg
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DISPATCH, LOCAL SALES & RETURNS (LOCKED) */}
                <div className="mb-8 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative overflow-hidden transition-colors">
                    
                    {/* Lock Overlay Banner */}
                    <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300 p-3.5 rounded-lg flex items-start gap-3 text-sm shadow-sm transition-colors">
                        <Lock size={18} className="mt-0.5 flex-shrink-0 text-orange-500 dark:text-orange-400" />
                        <p>
                            Dispatch, Local Sales, and Returns editing is locked here. If you need to modify these records, please update them via the <strong>Dispatch Records</strong> page.
                        </p>
                    </div>

                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-5 flex items-center gap-2">
                        <Package size={20} /> Dispatch, Sales & Returns (View Only)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Total Dispatch</label>
                            <input
                                type="number" 
                                value={formData.dispatch} 
                                disabled
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Local Sales & Gratis</label>
                            <input
                                type="number" 
                                value={formData.localSaleAndGratis} 
                                disabled
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Total Out</label>
                            <div className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-gray-200/70 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold rounded-lg flex items-center h-[50px] transition-colors">
                                {calculatedTotalOut > 0 ? calculatedTotalOut.toFixed(2) : '0.00'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Total Returns</label>
                            <input
                                type="number" 
                                value={formData.returnAmount} 
                                disabled
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className={`w-full h-14 text-white font-bold rounded-xl mt-4 text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                        showSpinner
                            ? 'bg-[#4A9E46] cursor-not-allowed opacity-90'
                            : 'bg-[#1B6A31] hover:bg-[#145325] dark:bg-teal-700 dark:hover:bg-teal-600 hover:-translate-y-0.5 shadow-lg hover:shadow-xl'
                    }`}
                    disabled={showSpinner}
                >
                    {showSpinner ? (
                        <>
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving Changes...
                        </>
                    ) : (
                        "Update Factory Log"
                    )}
                </button>
            </form>
        </div>
    );
}