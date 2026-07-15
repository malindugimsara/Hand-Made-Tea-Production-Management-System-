import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Package, ListPlus, Send, Trash2, AlertCircle } from "lucide-react";

// 1. Reusable input styles
const inputStyle = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all";

// 2. Helper component for the bag categories (Declared OUTSIDE to prevent focus loss)
const BagSection = ({ title, stateData, categoryStr, themeClass, onChange }) => (
    <div className="p-5 rounded-2xl border bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700">
        <h3 className={`text-sm font-black uppercase tracking-wider mb-4 ${themeClass}`}>{title}</h3>
        <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Received (Packs)
                </label>
                <input 
                    type="number" 
                    min="0"
                    value={stateData.received} 
                    onChange={(e) => onChange(categoryStr, 'received', e.target.value)} 
                    className={inputStyle} 
                    placeholder="0"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Used (Packs)
                </label>
                <input 
                    type="number" 
                    min="0"
                    value={stateData.used} 
                    onChange={(e) => onChange(categoryStr, 'used', e.target.value)} 
                    className={inputStyle} 
                    placeholder="0"
                />
            </div>
        </div>
    </div>
);

const FactoryPacking = () => {
    // --- Form State ---
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
    const [agSuper, setAgSuper] = useState({ received: "", used: "" });
    const [aGroup, setAGroup] = useState({ received: "", used: "" });
    const [sampleBags, setSampleBags] = useState({ received: "", used: "" });

    // --- Queue & Processing State ---
    const [queue, setQueue] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- Dark Mode State ---
    const [isDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || false);

    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDarkMode]);

    // --- Change Handler ---
    const handleChange = (category, field, value) => {
        const numValue = value === "" ? "" : Number(value);
        if (category === 'agSuper') setAgSuper({ ...agSuper, [field]: numValue });
        if (category === 'aGroup') setAGroup({ ...aGroup, [field]: numValue });
        if (category === 'sampleBags') setSampleBags({ ...sampleBags, [field]: numValue });
    };

    // --- Action: Add to Local Queue ---
    const handleAddToQueue = (e) => {
        e.preventDefault();

        if (!recordDate) return toast.error("Please select a record date.");
        
        // Prevent duplicate dates in the queue
        if (queue.some(item => item.date === recordDate)) {
            return toast.error(`An entry for ${recordDate} is already in the queue.`);
        }

        // Format payload to perfectly match the backend Ledger schema
        const payload = {
            id: Date.now().toString(), // temporary unique ID for the queue
            date: recordDate,
            agSuper: {
                received: Number(agSuper.received) || 0,
                used: Number(agSuper.used) || 0
            },
            aGroup: {
                received: Number(aGroup.received) || 0,
                used: Number(aGroup.used) || 0
            },
            sampleBags: {
                received: Number(sampleBags.received) || 0,
                used: Number(sampleBags.used) || 0
            }
        };

        setQueue([...queue, payload]);
        toast.success("Added to temporary queue");

        // Clear form inputs after adding
        setAgSuper({ received: "", used: "" });
        setAGroup({ received: "", used: "" });
        setSampleBags({ received: "", used: "" });
        
        // Optionally auto-increment the date for the next entry
        const nextDate = new Date(recordDate);
        nextDate.setDate(nextDate.getDate() + 1);
        setRecordDate(nextDate.toISOString().split('T')[0]);
    };

    // --- Action: Remove from Local Queue ---
    const handleRemoveFromQueue = (id) => {
        setQueue(queue.filter(item => item.id !== id));
    };

    // --- Action: Submit Queue to Database ---
    const handleSubmitQueue = async () => {
        if (queue.length === 0) return toast.error("The queue is empty.");

        setIsSaving(true);
        const toastId = toast.loading(`Saving ${queue.length} entries to database...`);

        try {
            // Process all queued items concurrently using Promise.all
            const promises = queue.map(async (item) => {
                // Remove the temporary 'id' before sending to backend
                const { id, ...dataToSend } = item;
                
                const response = await fetch('http://localhost:3000/api/factory-packs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to save ${item.date}: ${errorData.message}`);
                }
                return response.json();
            });

            await Promise.all(promises);

            toast.success("All queue entries saved successfully!", { id: toastId });
            setQueue([]); // Clear queue upon success
            window.dispatchEvent(new CustomEvent("factoryPackingUpdated"));

        } catch (error) {
            console.error("Batch Save Error:", error);
            toast.error(error.message || "Failed to save some items.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[1200px] mx-auto font-sans min-h-screen transition-colors duration-300">

            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-[#f0fdfa] dark:bg-teal-900/30 border-[#99f6e4] dark:border-teal-800 transition-colors">
                    <Package className="text-[#0d5e4d] dark:text-teal-400" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0d5e4d] dark:text-teal-400 tracking-tight transition-colors">Factory Packing Entry</h1>
                    <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase mt-0.5 transition-colors">
                        Daily Stock Ledger Inputs
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Input Form */}
                <div className="xl:col-span-7 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors h-fit">
                    <form onSubmit={handleAddToQueue} className="space-y-6">
                        
                        <div className="flex flex-col gap-2 mb-4 w-full md:w-1/2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                                Ledger Date
                            </label>
                            <input
                                type="date"
                                value={recordDate}
                                onChange={(e) => setRecordDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>

                        <BagSection title="A / G / Super" stateData={agSuper} categoryStr="agSuper" themeClass="text-teal-600 dark:text-teal-400" onChange={handleChange} />
                        <BagSection title="A / Group" stateData={aGroup} categoryStr="aGroup" themeClass="text-blue-600 dark:text-blue-400" onChange={handleChange} />
                        <BagSection title="Sample Bags" stateData={sampleBags} categoryStr="sampleBags" themeClass="text-indigo-600 dark:text-indigo-400" onChange={handleChange} />

                        <div className="flex flex-col-reverse sm:flex-row justify-end pt-6 border-t border-gray-100 dark:border-gray-700 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setAgSuper({ received: "", used: "" });
                                    setAGroup({ received: "", used: "" });
                                    setSampleBags({ received: "", used: "" });
                                }}
                                className="px-6 py-3.5 text-gray-500 dark:text-gray-400 font-bold text-sm tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl"
                            >
                                CLEAR
                            </button>

                            <button
                                type="submit"
                                className="flex items-center justify-center gap-2 px-8 py-3.5 text-white font-black text-sm tracking-widest uppercase rounded-2xl transition-all shadow-md hover:-translate-y-0.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                                <ListPlus size={18} />
                                Add To Queue
                            </button>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: Temporary Queue */}
                <div className="xl:col-span-5 flex flex-col gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden transition-colors">
                        
                        {/* Queue Header */}
                        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-gray-800 dark:text-gray-200 tracking-tight">Pending Queue</h2>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mt-1">
                                    {queue.length} {queue.length === 1 ? 'Entry' : 'Entries'} Ready
                                </p>
                            </div>
                        </div>

                        {/* Queue List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px] max-h-[500px]">
                            {queue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-70">
                                    <AlertCircle size={48} className="mb-3" />
                                    <p className="font-semibold text-sm">Queue is empty</p>
                                    <p className="text-xs mt-1">Add entries from the left panel.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {queue.map((item) => (
                                        <div key={item.id} className="relative group p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors shadow-sm">
                                            
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-black bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50">
                                                    {item.date}
                                                </span>
                                                <button 
                                                    onClick={() => handleRemoveFromQueue(item.id)}
                                                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Remove from queue"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <p className="text-teal-600 dark:text-teal-500 font-bold mb-1">A/G/S</p>
                                                    <p className="text-gray-700 dark:text-gray-300 font-semibold">{item.agSuper.received} / {item.agSuper.used}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <p className="text-blue-600 dark:text-blue-500 font-bold mb-1">A/Grp</p>
                                                    <p className="text-gray-700 dark:text-gray-300 font-semibold">{item.aGroup.received} / {item.aGroup.used}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <p className="text-indigo-600 dark:text-indigo-500 font-bold mb-1">Spl</p>
                                                    <p className="text-gray-700 dark:text-gray-300 font-semibold">{item.sampleBags.received} / {item.sampleBags.used}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit Action */}
                        <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                            <button
                                onClick={handleSubmitQueue}
                                disabled={queue.length === 0 || isSaving}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 text-white font-black text-sm tracking-widest uppercase rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 bg-gradient-to-br from-[#163d2e] via-[#0d5e4d] to-[#0f766e] dark:from-teal-700 dark:via-teal-600 dark:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                                {isSaving ? "Processing..." : "Submit All To Database"}
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default FactoryPacking;3 