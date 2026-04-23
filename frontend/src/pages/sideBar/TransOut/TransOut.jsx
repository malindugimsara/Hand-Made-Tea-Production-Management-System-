import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Send, PackageOpen, Tag, Weight, X, Clock, FileText } from "lucide-react"; 

// Exact Colors based on your image (Kept specific product colors intact for identification)
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

// Combined tea types
const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags", "Pitigala tea 400g",
    "Awurudu Special", "Labour drinking tea,green tea bags"
];

export default function TransOut() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [submitting, setSubmitting] = useState(false);
    const [pendingOutTransfers, setPendingOutTransfers] = useState([]);
    
    // Dynamic rows for bulk tea being sent
    const [itemsList, setItemsList] = useState([
        { id: Date.now(), product: '', issuedQtyKg: '' }
    ]);
    const [remarks, setRemarks] = useState("");

    const [openDropdownId, setOpenDropdownId] = useState(null); 
    const dropdownRefs = useRef({}); 

    useEffect(() => {
        fetchPendingOutTransfers();
        
        const handleClickOutside = (event) => {
            let isOutside = true;
            Object.values(dropdownRefs.current).forEach(ref => {
                if (ref && ref.contains(event.target)) isOutside = false;
            });
            if (isOutside) setOpenDropdownId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch transfers sent by Handmade that Packing hasn't received yet
    const fetchPendingOutTransfers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/packing/transfers/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPendingOutTransfers(data);
            }
        } catch (error) {
            console.error("Could not fetch outgoing transfers", error);
        }
    };

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', issuedQtyKg: '' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleItemChange = (id, field, value) => {
        if (field === 'issuedQtyKg' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(itemsList.map(row => 
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const totalOutgoingKg = itemsList.reduce((sum, row) => sum + (Number(row.issuedQtyKg) || 0), 0);

    const handleSubmitTransfer = async (e) => {
        e.preventDefault();

        const hasEmptyItem = itemsList.some(row => !row.product || row.issuedQtyKg === '');
        if (hasEmptyItem) {
            toast.error("Please completely fill out all products and weights.");
            return;
        }

        if (totalOutgoingKg <= 0) {
            toast.error("Total weight must be greater than zero.");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading("Sending stock to Packing...");

        try {
            const token = localStorage.getItem('token');
            const userName = localStorage.getItem('userName') || 'Handmade Officer';

            const payload = {
                issuedBy: userName,
                remarks: remarks,
                items: itemsList.map(item => ({
                    product: item.product,
                    issuedQtyKg: Number(item.issuedQtyKg)
                }))
            };

            const response = await fetch(`${BACKEND_URL}/api/handmade/transfers`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to send transfer");

            toast.success("Stock transferred to Packing!", { id: toastId });
            
            // Reset Form
            setItemsList([{ id: Date.now(), product: '', issuedQtyKg: '' }]);
            setRemarks("");
            fetchPendingOutTransfers(); // Refresh tracker

        } catch (error) {
            toast.error("Error sending stock.", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
                    <Send size={28} /> Trans Out (Issue Bulk Tea)
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Issue bulk manufactured tea to the Packing section for packaging.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT SIDE: SEND STOCK FORM --- */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmitTransfer} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-indigo-100 dark:border-zinc-800 transition-colors duration-300">
                        
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                    <PackageOpen size={20} /> Bulk Tea to Issue
                                </h3>
                                <button 
                                    type="button" 
                                    onClick={handleAddItemRow}
                                    className="text-sm font-bold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <PlusCircle size={16} /> Add Product
                                </button>
                            </div>

                            <div className="space-y-4">
                                {itemsList.map((row) => (
                                    <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-indigo-100 dark:border-zinc-700 shadow-sm transition-colors">
                                        
                                        {/* AVOID RED: Neutral Dark Mode remove button */}
                                        {itemsList.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItemRow(row.id)}
                                                className="absolute -top-2 -right-2 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-zinc-600 rounded-full p-1.5 transition-colors shadow-md z-10"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                            
                                            {/* Product Autocomplete */}
                                            <div className="md:col-span-3 relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Tag size={12} className="text-indigo-600 dark:text-indigo-400"/> Product
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Type or select..."
                                                    value={row.product}
                                                    onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                    onFocus={() => setOpenDropdownId(`product-${row.id}`)}
                                                    required
                                                    className={`w-full p-2.5 border border-indigo-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-400/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'}`}
                                                />
                                                
                                                {openDropdownId === `product-${row.id}` && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                        {TEA_TYPES
                                                            .filter(tea => tea.toLowerCase().includes(row.product.toLowerCase()))
                                                            .map((tea, idx) => (
                                                            <li 
                                                                key={idx} 
                                                                onMouseDown={(e) => e.preventDefault()} 
                                                                onClick={() => {
                                                                    handleItemChange(row.id, 'product', tea);
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                                            >
                                                                <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Issued Qty (Kg) */}
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Weight size={12} className="text-indigo-600 dark:text-indigo-400"/> Issue Qty (Kg)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    value={row.issuedQtyKg} 
                                                    onChange={(e) => handleItemChange(row.id, 'issuedQtyKg', e.target.value)}
                                                    onWheel={(e) => e.target.blur()} 
                                                    required 
                                                    placeholder="e.g. 15.5"
                                                    className="w-full p-2.5 border border-indigo-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-400/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 font-bold transition-colors" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/30 flex justify-end">
                                <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                    Total Weight to Issue: <span className="font-bold text-xl ml-2">{totalOutgoingKg.toFixed(2)} Kg</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <FileText size={16}/> Notes (Optional)
                            </label>
                            <textarea 
                                rows="2"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Any notes for the packing section..."
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-400/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors resize-none"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                submitting 
                                ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:shadow-indigo-500/40 hover:-translate-y-1'
                            }`}
                        >
                            <Send size={24} /> {submitting ? "Sending..." : "Send Transfer to Packing Section"}
                        </button>
                    </form>
                </div>

                {/* --- RIGHT SIDE: TRACKER --- */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700 flex flex-col max-h-[70vh]">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-5 py-4 border-b border-gray-200 dark:border-zinc-700 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Clock size={18} className="text-orange-500" /> Awaiting Packing Approval
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Transfers you sent that haven't been accepted yet.</p>
                        </div>
                        
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            {pendingOutTransfers.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                                    <p className="text-sm font-medium">No pending transfers.</p>
                                    <p className="text-xs mt-1">Packing has received everything you sent!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingOutTransfers.map(transfer => (
                                        <div key={transfer._id} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                                            <div className="flex justify-between items-start mb-2 border-b border-gray-200 dark:border-zinc-700 pb-2">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{transfer.transferId}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(transfer.dateIssued).toLocaleString()}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
                                                    PENDING
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1.5 mt-2">
                                                {transfer.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{item.product}</span>
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.issuedQtyKg} kg</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}