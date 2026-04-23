import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Send, PackageOpen, Tag, Weight, X, Clock, FileText, Calendar, Calculator } from "lucide-react"; 

// Exact Colors for Tags
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

const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags", "Pitigala tea 400g",
    "Awurudu Special", "Labour drinking tea", "green tea bags"
];

export default function TransOut() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    const [submitting, setSubmitting] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    
    const [pendingOutTransfers, setPendingOutTransfers] = useState([]);
    const [availableStock, setAvailableStock] = useState({}); // Stores stock for the selected date
    
    // Form States
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");
    const [itemsList, setItemsList] = useState([
        { id: Date.now(), product: '', issuedQtyKg: '' }
    ]);

    const [openDropdownId, setOpenDropdownId] = useState(null); 
    const dropdownRefs = useRef({}); 

    // 1. Initial Load
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

    // 2. Fetch Stock whenever the Issue Date changes
    useEffect(() => {
        if (issueDate) {
            fetchStockUpToDate(issueDate);
        }
    }, [issueDate]);

    // Fetch Pending Transfers (Tracker)
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

    // Fetch Production Stock up to Date
    const fetchStockUpToDate = async (targetDate) => {
        setLoadingStock(true);
        try {
            const token = localStorage.getItem('token');
            // Calls the backend to calculate Stock = (Total Produced up to date) - (Total Transferred Out up to date)
            const response = await fetch(`${BACKEND_URL}/api/handmade/stock-summary?date=${targetDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json(); 
                // Expecting object format: { "BOPF": 150.5, "Dust": 45.0 }
                setAvailableStock(data);
            } else {
                setAvailableStock({});
            }
        } catch (error) {
            console.error("Error fetching stock:", error);
            toast.error("Could not load available stock for this date.");
        } finally {
            setLoadingStock(false);
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

        // Validate stock availability
        let stockWarning = false;
        itemsList.forEach(item => {
            const maxAvailable = availableStock[item.product] || 0;
            if (Number(item.issuedQtyKg) > maxAvailable) {
                stockWarning = true;
            }
        });

        if (stockWarning) {
            if(!window.confirm("You are issuing MORE stock than what is currently available on this date. Do you want to proceed anyway?")) {
                return;
            }
        }

        setSubmitting(true);
        const toastId = toast.loading("Sending stock to Packing...");

        try {
            const token = localStorage.getItem('token');
            const userName = localStorage.getItem('userName') || 'Handmade Officer';

            const payload = {
                issuedBy: userName,
                dateIssued: issueDate, // Include the selected date
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
            
            setItemsList([{ id: Date.now(), product: '', issuedQtyKg: '' }]);
            setRemarks("");
            fetchPendingOutTransfers(); 
            fetchStockUpToDate(issueDate); // Refresh stock board

        } catch (error) {
            toast.error("Error sending stock.", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // Convert availableStock object to an array for the Summary Board
    const stockBoardArray = Object.entries(availableStock).filter(([_, qty]) => qty > 0).sort((a, b) => b[1] - a[1]);
    const totalBoardQty = stockBoardArray.reduce((sum, [_, qty]) => sum + qty, 0);

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
                    <Send size={28} /> Trans Out (Issue Bulk Tea)
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Issue bulk manufactured tea to the Packing section for packaging.</p>
            </div>

            {/* --- PRODUCTION SUMMARY BOARD --- */}
            <div className="mb-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
                <div className="bg-[#0f766e] text-white px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Calculator size={20} /> Production Summary Board
                    </h3>
                    <div className="text-sm font-medium bg-white/20 px-3 py-1 rounded-md">
                        Stock Available up to: <strong>{issueDate}</strong>
                    </div>
                </div>
                
                <div className="p-0 overflow-x-auto">
                    {loadingStock ? (
                        <div className="p-8 text-center text-gray-500 flex justify-center items-center gap-3">
                            <div className="w-5 h-5 border-2 border-teal-200 border-t-[#0f766e] rounded-full animate-spin"></div>
                            Calculating stock up to selected date...
                        </div>
                    ) : stockBoardArray.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                            No production stock found on or before this date.
                        </div>
                    ) : (
                        <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-700">
                                    <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-700 text-left">TEA TYPE</th>
                                    <th className="px-6 py-4 font-bold text-[#0f766e] dark:text-teal-400">M/T (KG) Available</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700/50">
                                {stockBoardArray.map(([prodName, qty], idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-3 border-r border-gray-100 dark:border-zinc-700 text-left">
                                            <span className={`font-bold border px-3 py-1 rounded shadow-sm ${getTeaColor(prodName)}`}>
                                                {prodName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-black text-gray-800 dark:text-gray-200 text-lg">
                                            {qty.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#f0fdfa]/50 dark:bg-zinc-800 border-t-2 border-[#0f766e] dark:border-teal-600">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-right uppercase border-r border-gray-200 dark:border-zinc-700 text-[#0f766e] dark:text-teal-400">TOTAL STOCK</td>
                                    <td className="px-6 py-4 font-black text-xl text-[#0f766e] dark:text-teal-400">{totalBoardQty.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT SIDE: SEND STOCK FORM --- */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmitTransfer} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-indigo-100 dark:border-zinc-800 transition-colors duration-300">
                        
                        <div className="mb-6 flex flex-col sm:flex-row items-end gap-6">
                            <div className="w-full sm:w-64">
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-500"/> Issue Date
                                </label>
                                <input 
                                    type="date" 
                                    value={issueDate} 
                                    onChange={(e) => setIssueDate(e.target.value)} 
                                    required 
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-400/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                />
                            </div>
                        </div>

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
                                {itemsList.map((row) => {
                                    const availableForProduct = availableStock[row.product] || 0;
                                    
                                    return (
                                        <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-indigo-100 dark:border-zinc-700 shadow-sm transition-colors">
                                            
                                            {/* Neutral Slate/Zinc Remove Button */}
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
                                                    <div className="flex justify-between items-end mb-1">
                                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                                            <Tag size={12} className="text-indigo-600 dark:text-indigo-400"/> Product
                                                        </label>
                                                        {row.product && (
                                                            <span className="text-[10px] font-bold text-[#0f766e] dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded">
                                                                Available: {availableForProduct.toFixed(2)} Kg
                                                            </span>
                                                        )}
                                                    </div>
                                                    
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
                                                    
                                                    {/* Warning if attempting to issue more than available */}
                                                    {row.product && Number(row.issuedQtyKg) > availableForProduct && (
                                                        <p className="text-[10px] text-orange-500 font-bold mt-1">Warning: Exceeds available stock!</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                <Clock size={18} className="text-orange-500 dark:text-orange-400" /> Awaiting Packing Approval
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
                                        <div key={transfer._id} className="p-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:border-indigo-300 dark:hover:border-zinc-500 transition-colors">
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