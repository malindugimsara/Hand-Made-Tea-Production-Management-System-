import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Package, Save, Hash, Scale, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FactoryPacking = () => {
    const navigate = useNavigate();
    
    // --- State ---
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
    const [noOfBags, setNoOfBags] = useState("");
    const [quantityKg, setQuantityKg] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // --- Dark Mode State ---
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || false;
    });

    // Dark Mode Toggle Effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

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

    // Reusable Input Styles
    const standardInputStyle = "w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-[#1B6A31] dark:focus:border-teal-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-teal-500/20 transition-all";
    const highlightedInputStyle = "w-full pl-10 pr-4 py-3.5 bg-[#eef8f2] dark:bg-teal-900/20 border border-[#a3d9b8] dark:border-teal-800 rounded-xl text-sm font-bold text-[#1c4b3a] dark:text-teal-300 outline-none focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-teal-400/20 transition-all placeholder:text-[#1c4b3a]/50 dark:placeholder:text-teal-300/50";

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[1200px] mx-auto font-sans min-h-screen bg-[#f3faf7] dark:bg-gray-900 transition-colors duration-300">
            
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8">
               
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-[#f0fdfa] dark:bg-teal-900/30 border-[#99f6e4] dark:border-teal-800 transition-colors">
                        <Package className="text-[#0d5e4d] dark:text-teal-400" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#0d5e4d] dark:text-teal-400 tracking-tight transition-colors">Factory Packing</h1>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase mt-0.5 transition-colors">
                            Daily Packing Records & Quantities
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
                <form onSubmit={handleSave} className="space-y-8">
                    
                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Record Date */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                                Record Date
                            </label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={recordDate}
                                    onChange={(e) => setRecordDate(e.target.value)}
                                    className={standardInputStyle}
                                />
                            </div>
                        </div>

                        {/* No of Bags */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                                No of Bags (pic)
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={noOfBags}
                                    onChange={(e) => setNoOfBags(e.target.value)}
                                    placeholder="e.g. 50"
                                    className={`${standardInputStyle} pl-10`}
                                />
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                            </div>
                        </div>

                        {/* Quantity (Kg) */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
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
                                    className={highlightedInputStyle}
                                />
                                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c4b3a]/60 dark:text-teal-400/60" size={18} />
                            </div>
                        </div>

                    </div>

                    {/* Summary / Info Banner */}
                    {(noOfBags || quantityKg) ? (
                        <div className="bg-[#f8fbf9] dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 font-medium transition-colors">
                            <div className="w-2 h-2 rounded-full bg-[#1B6A31] dark:bg-teal-500"></div>
                            <p>
                                Ready to save: <span className="font-bold text-[#1c4b3a] dark:text-teal-300">{noOfBags || 0}</span> bags 
                                totaling <span className="font-bold text-[#1c4b3a] dark:text-teal-300">{quantityKg || 0} Kg</span> 
                                for {recordDate}.
                            </p>
                        </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end pt-6 border-t border-gray-100 dark:border-gray-700 gap-3">
                        <button 
                            type="button"
                            onClick={() => {
                                setNoOfBags("");
                                setQuantityKg("");
                            }}
                            className="px-6 py-3.5 text-gray-500 dark:text-gray-400 font-bold text-sm tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
                        >
                            CLEAR
                        </button>
                        
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 text-white font-black text-sm tracking-widest uppercase rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 bg-gradient-to-br from-[#163d2e] via-[#0d5e4d] to-[#0f766e] dark:from-teal-700 dark:via-teal-600 dark:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSaving ? "Saving..." : "Save Record"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default FactoryPacking;