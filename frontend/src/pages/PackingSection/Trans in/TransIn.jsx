import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, PackageCheck, AlertCircle, ArrowRightCircle, CheckCircle2, FileText, Calendar } from "lucide-react";

// Exact Colors
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p === 'bopf') return 'bg-[#fde047] text-yellow-900 border-yellow-500'; 
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p === 'dust') return 'bg-[#3b82f6] text-white border-blue-600'; 
    if (p === 'dust 1') return 'bg-[#06b6d4] text-white border-cyan-500'; 
    if (p.includes('premium')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awuru')) return 'bg-[#c084fc] text-white border-purple-500'; 
    if (p === 't/b 25') return 'bg-[#ef4444] text-white border-red-600'; 
    if (p === 't/b 100') return 'bg-[#78350f] text-white border-amber-900'; 
    if (p.includes('green')) return 'bg-[#4ade80] text-green-900 border-green-600'; 
    if (p.includes('labour')) return 'bg-gray-200 text-gray-800 border-gray-400'; 
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-600'; 
};

export default function TransIn() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [receivedInputs, setReceivedInputs] = useState({});
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPendingTransfers();
    }, []);

    const fetchPendingTransfers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // FIXED API ROUTE HERE -> /api/packing/transfers/pending
            const response = await fetch(`${BACKEND_URL}/api/packing/transfers/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch pending transfers");
            
            const data = await response.json();
            setPendingTransfers(data);
            setSelectedTransfer(null); 
        } catch (error) {
            console.error(error);
            toast.error("Could not load incoming stock.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTransfer = (transfer) => {
        setSelectedTransfer(transfer);
        setRemarks("");
        // Pre-fill actual received amount with the issued amount
        const initialInputs = {};
        transfer.items.forEach(item => {
            initialInputs[item._id] = item.issuedQtyKg;
        });
        setReceivedInputs(initialInputs);
    };

    const handleInputChange = (itemId, value) => {
        setReceivedInputs(prev => ({
            ...prev,
            [itemId]: value
        }));
    };

    const handleSubmitTransIn = async (e) => {
        e.preventDefault();
        
        for (let key in receivedInputs) {
            if (receivedInputs[key] === '' || Number(receivedInputs[key]) < 0) {
                toast.error("Please ensure all received quantities are valid numbers.");
                return;
            }
        }

        setSubmitting(true);
        const toastId = toast.loading("Processing Trans In...");

        try {
            const token = localStorage.getItem('token');
            const userName = localStorage.getItem('userName') || 'Packing Officer';

            const payload = {
                receivedBy: userName,
                remarks: remarks,
                receivedItems: selectedTransfer.items.map(item => ({
                    _id: item._id,
                    receivedQtyKg: Number(receivedInputs[item._id])
                }))
            };

            // FIXED API ROUTE HERE -> /api/packing/transfers/:id/receive
            const response = await fetch(`${BACKEND_URL}/api/packing/transfers/${selectedTransfer._id}/receive`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to process Trans In.");

            toast.success("Stock received successfully!", { id: toastId });
            fetchPendingTransfers(); 

        } catch (error) {
            console.error(error);
            toast.error("Error receiving stock.", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-3">
                        <ArrowRightCircle size={28} /> Trans In (Receive Stock)
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Verify and accept incoming bulk tea from Handmade Section.</p>
                </div>
                <button onClick={fetchPendingTransfers} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-teal-200 dark:border-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Check For New Stock
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT SIDE: PENDING TRANSFERS LIST */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                        <AlertCircle size={18} className="text-orange-500" /> Waiting For Packing Approval
                    </h3>
                    
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700">Loading incoming stock...</div>
                    ) : pendingTransfers.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                            <CheckCircle2 size={48} className="mb-4 text-[#0f766e] opacity-50" />
                            <p className="font-bold text-lg">All caught up!</p>
                            <p className="text-sm mt-1">No pending stock transfers from Handmade.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
                            {pendingTransfers.map((transfer) => (
                                <div 
                                    key={transfer._id} 
                                    onClick={() => handleSelectTransfer(transfer)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                                        selectedTransfer?._id === transfer._id 
                                        ? 'border-[#0f766e] dark:border-teal-500 bg-[#f0fdfa] dark:bg-teal-900/20' 
                                        : 'border-transparent bg-white dark:bg-zinc-900 hover:border-teal-200 dark:hover:border-zinc-600'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">ID: {transfer.transferId}</span>
                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">PENDING</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-3">
                                        <Calendar size={12}/> Issued: {new Date(transfer.dateIssued).toLocaleString()}
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {transfer.items.map((item, idx) => (
                                            <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded border shadow-sm ${getTeaColor(item.product)}`}>
                                                {item.product}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: VERIFICATION FORM */}
                <div className="lg:col-span-2">
                    {!selectedTransfer ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-8">
                            <PackageCheck size={64} className="mb-6 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">Select a transfer to verify</h3>
                            <p className="text-sm mt-2 max-w-md">Click on an incoming stock ticket on the left to review the weights and accept it into the Packing inventory.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitTransIn} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 flex flex-col transition-colors duration-300">
                            
                            <div className="border-b border-gray-100 dark:border-zinc-800 pb-5 mb-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400">Verify Incoming Stock</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">ID: {selectedTransfer.transferId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Issued By</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedTransfer.issuedBy}</p>
                                </div>
                            </div>

                            <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-teal-100/50 dark:bg-zinc-800/80 border-b border-teal-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200">
                                            <th className="px-4 py-3 font-bold">Product Type</th>
                                            <th className="px-4 py-3 font-bold text-center">Issued By Handmade (Kg)</th>
                                            <th className="px-4 py-3 font-bold text-center text-[#0f766e] dark:text-teal-400">Actual Received (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-100 dark:divide-zinc-700/50">
                                        {selectedTransfer.items.map((item) => {
                                            const issued = Number(item.issuedQtyKg);
                                            const received = Number(receivedInputs[item._id] || 0);
                                            const diff = received - issued;
                                            
                                            return (
                                                <tr key={item._id} className="hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-4 py-4 align-middle">
                                                        <span className={`font-bold border px-2.5 py-1 rounded shadow-sm text-xs ${getTeaColor(item.product)}`}>
                                                            {item.product}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center align-middle font-bold text-gray-600 dark:text-gray-300 text-lg">
                                                        {issued.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-4 align-middle bg-[#f0fdfa] dark:bg-teal-900/10">
                                                        <div className="flex flex-col items-center">
                                                            <div className="relative w-32">
                                                                <input 
                                                                    type="number"
                                                                    step="any"
                                                                    min="0"
                                                                    value={receivedInputs[item._id]}
                                                                    onChange={(e) => handleInputChange(item._id, e.target.value)}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    required
                                                                    className={`w-full p-2.5 pr-8 border rounded-lg text-center font-bold text-lg focus:ring-2 outline-none transition-colors ${
                                                                        diff === 0 
                                                                        ? 'border-gray-300 dark:border-zinc-600 focus:ring-[#2dd4bf]/50 bg-white dark:bg-zinc-900 dark:text-gray-100' 
                                                                        : 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 focus:ring-orange-400'
                                                                    }`}
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Kg</span>
                                                            </div>
                                                            
                                                            {/* Show variance alert if the numbers don't match */}
                                                            {diff !== 0 && (
                                                                <span className="text-[10px] font-bold mt-1 text-orange-600 dark:text-orange-400">
                                                                    Difference: {diff > 0 ? '+' : ''}{diff.toFixed(2)} Kg
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                    <FileText size={16}/> Notes / Variance Explanation (Optional)
                                </label>
                                <textarea 
                                    rows="2"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="If the actual received amount differs from the issued amount, please explain why here..."
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all mt-auto ${
                                    submitting 
                                    ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-[#0d9488]/40 hover:-translate-y-1'
                                }`}
                            >
                                <PackageCheck size={24} /> {submitting ? "Processing..." : "Confirm & Complete Trans In"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}