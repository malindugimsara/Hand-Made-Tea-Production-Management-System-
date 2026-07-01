import React, { useState } from "react";
import toast from "react-hot-toast";
import { Package, Calendar, Save, Hash, Scale, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FactoryPacking = () => {
    const navigate = useNavigate();
    
    // --- State ---
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
    const [noOfBags, setNoOfBags] = useState("");
    const [quantityKg, setQuantityKg] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // --- Save Handler ---
    const handleSave = async (e) => {
        e.preventDefault();

        // Validation
        if (!recordDate) return toast.error("Please select a record date.");
        if (!noOfBags || Number(noOfBags) <= 0) return toast.error("Please enter a valid number of bags.");
        if (!quantityKg || Number(quantityKg) <= 0) return toast.error("Please enter a valid quantity in Kg.");

        setIsSaving(true);
        const toastId = toast.loading("Saving packing details...");

        try {
            const payload = {
                date: recordDate,
                noOfBags: Number(noOfBags),
                quantity: Number(quantityKg)
            };

            // TODO: Replace with your actual backend endpoint
            /*
            const response = await fetch('http://localhost:3000/api/factory-packing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to save data");
            */

            // Simulating API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success("Packing details saved successfully!", { id: toastId });
            
            // Clear form after success
            setNoOfBags("");
            setQuantityKg("");
            
        } catch (error) {
            console.error("Save Error:", error);
            toast.error(error.message || "Failed to save packing details.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-[1000px] mx-auto font-sans min-h-screen bg-[#f3faf7] text-gray-800">
            
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Go Back"
                >
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
                        <Package className="text-[#1B6A31]" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#1c4b3a] tracking-tight">Factory Packing</h1>
                        <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mt-0.5">
                            Daily Packing Records & Quantities
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form onSubmit={handleSave} className="space-y-8">
                    
                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Record Date */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                                Record Date
                            </label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={recordDate}
                                    onChange={(e) => setRecordDate(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#1B6A31] transition-colors"
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>

                        {/* No of Bags */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                                No of Bags (pic)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={noOfBags}
                                    onChange={(e) => setNoOfBags(e.target.value)}
                                    placeholder="e.g. 50"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#1B6A31] focus:ring-2 focus:ring-[#1B6A31]/10 transition-all"
                                />
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>

                        {/* Quantity (Kg) */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                                Quantity (Kg)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={quantityKg}
                                    onChange={(e) => setQuantityKg(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-3 bg-[#eef8f2] border border-[#a3d9b8] rounded-xl text-sm font-bold text-[#1c4b3a] outline-none focus:ring-2 focus:ring-[#1B6A31]/20 transition-all placeholder:text-[#1c4b3a]/50"
                                />
                                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c4b3a]/60" size={18} />
                            </div>
                        </div>

                    </div>

                    {/* Summary / Info Banner (Optional visual enhancement) */}
                    {(noOfBags || quantityKg) ? (
                        <div className="bg-[#f8fbf9] border border-gray-100 rounded-xl p-4 flex items-center gap-4 text-sm text-gray-600 font-medium">
                            <div className="w-2 h-2 rounded-full bg-[#1B6A31]"></div>
                            <p>
                                Ready to save: <span className="font-bold text-[#1c4b3a]">{noOfBags || 0}</span> bags 
                                totaling <span className="font-bold text-[#1c4b3a]">{quantityKg || 0} Kg</span> 
                                for {recordDate}.
                            </p>
                        </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={() => {
                                setNoOfBags("");
                                setQuantityKg("");
                            }}
                            className="px-6 py-3 text-gray-500 font-bold text-sm tracking-wide hover:text-gray-700 transition-colors mr-2"
                        >
                            CLEAR
                        </button>
                        
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-3 bg-[#809f94] hover:bg-[#6c8b7f] text-white font-bold text-sm tracking-widest uppercase rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Record
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default FactoryPacking;