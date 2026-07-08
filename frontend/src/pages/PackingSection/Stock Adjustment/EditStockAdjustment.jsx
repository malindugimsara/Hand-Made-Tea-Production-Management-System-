import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Edit3, ArrowDownCircle, ArrowUpCircle, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const THEME = {
    pageBg: '#f3faf7',
    textPrimary: '#0d5e4d',
    btnGradient: 'linear-gradient(135deg,#163d2e 0%,#0d5e4d 45%,#0f766e 100%)',
    dangerGradient: 'linear-gradient(135deg,#7f1d1d 0%,#991b1b 45%,#b91c1c 100%)',
};

export default function EditStockAdjustment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form States
    const [date, setDate] = useState('');
    const [activeTab, setActiveTab] = useState('tea');
    const [selectedItem, setSelectedItem] = useState('');
    const [adjustmentType, setAdjustmentType] = useState('add');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchAdjustmentDetails();
    }, [id]);

    const fetchAdjustmentDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/stock-adjustment/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Failed to fetch log details");
            const resData = await res.json();

            // Handle both { data: {...} } and {...} formats commonly used in Express/Nest backends
            const data = resData.data || resData;

            // Use the actual 'date' field if available, fallback to 'createdAt'
            if (data.date) {
                setDate(data.date.split('T')[0]);
            } else if (data.createdAt) {
                setDate(new Date(data.createdAt).toISOString().split('T')[0]);
            } else {
                setDate(new Date().toISOString().split('T')[0]);
            }
            
            setActiveTab(data.itemType || 'tea');
            setSelectedItem(data.itemName || '');
            setAdjustmentType(data.action || 'add');
            setAmount(data.amount || '');
            setReason(data.reason || '');

        } catch (error) {
            console.error(error);
            toast.error("Error loading adjustment details");
            navigate('/packing/stock-adjustment-view');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Updating adjustment and stock...");

        try {
            const token = localStorage.getItem('token');
            const payload = {
                _id: id, // Including ID in the body (Sometimes required by specific backends)
                date,
                itemType: activeTab,
                itemName: selectedItem,
                action: adjustmentType,
                amount: Number(amount),
                reason
            };

            const res = await fetch(`${BACKEND_URL}/api/stock-adjustment/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errorMessage = "Update failed";
                try {
                    // Try to parse the backend error message
                    const errData = await res.json();
                    errorMessage = errData.message || errData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Error ${res.status}: Details could not be fetched`;
                }
                throw new Error(errorMessage);
            }

            toast.success("Adjustment Updated Successfully!", { id: toastId });
            
            setTimeout(() => navigate('/packing/stock-adjustment-view'), 1000);
            
        } catch (error) {
            toast.error(error.message || "Error updating stock.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyles = "w-full p-3.5 bg-gray-50 border border-teal-200 rounded-xl font-medium text-gray-700 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all";

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f3faf7]">
                <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans" style={{ backgroundColor: THEME.pageBg }}>    
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate('/packing/stock-adjustment-view')}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors border border-gray-200 text-[#0d5e4d]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-white border-teal-200 text-[#0d5e4d]">
                        <Edit3 size={25} />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d]">Edit Adjustment</h2>
                        <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-[#0f766e]">Correct existing inventory record</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* DATE SELECTION */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Calendar size={14} /> Adjustment Date
                                </label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)} 
                                    required 
                                    className={inputStyles}
                                />
                            </div>

                            {/* ITEM NAME (LOCKED) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Item Selected (Locked)
                                </label>
                                <div className="w-full p-3.5 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed flex justify-between items-center">
                                    <span>{selectedItem}</span>
                                    <span className={`text-[10px] px-2 py-1 rounded uppercase ${activeTab === 'tea' ? 'bg-[#bbf7d0] text-teal-800' : 'bg-[#fed7aa] text-orange-800'}`}>
                                        {activeTab}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">* Delete this record if you selected the wrong item.</p>
                            </div>
                        </div>

                        {/* ACTION TYPE */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adjustment Action</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${adjustmentType === 'add' ? 'border-[#0d5e4d] bg-[#f0fdfa]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                    <input type="radio" name="action" value="add" checked={adjustmentType === 'add'} onChange={() => setAdjustmentType('add')} className="hidden" />
                                    <ArrowDownCircle size={24} className={adjustmentType === 'add' ? 'text-[#0d5e4d]' : 'text-gray-400'} />
                                    <div>
                                        <p className={`font-bold ${adjustmentType === 'add' ? 'text-[#0d5e4d]' : 'text-gray-600'}`}>Trans In (Add)</p>
                                    </div>
                                </label>
                                
                                <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${adjustmentType === 'remove' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                    <input type="radio" name="action" value="remove" checked={adjustmentType === 'remove'} onChange={() => setAdjustmentType('remove')} className="hidden" />
                                    <ArrowUpCircle size={24} className={adjustmentType === 'remove' ? 'text-red-600' : 'text-gray-400'} />
                                    <div>
                                        <p className={`font-bold ${adjustmentType === 'remove' ? 'text-red-600' : 'text-gray-600'}`}>Issue (Remove)</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* AMOUNT & REASON */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Adjustment Amount</label>
                                <input 
                                    type="number" step="0.001" min="0" 
                                    value={amount} onChange={(e) => setAmount(e.target.value)} 
                                    required 
                                    className={inputStyles} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason (Optional)</label>
                                <textarea 
                                    value={reason} 
                                    onChange={(e) => setReason(e.target.value)} 
                                    className={`${inputStyles} resize-none`} 
                                    rows="2"
                                ></textarea>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-2xl text-white font-black text-lg uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
                            style={{ background: adjustmentType === 'add' ? THEME.btnGradient : THEME.dangerGradient }}
                        >
                            {isSubmitting ? "Updating..." : `Update to ${adjustmentType === 'add' ? 'Addition' : 'Issue'}`}
                        </button>
                        
                    </form>
                </div>
            </div>
        </div>
    );
}