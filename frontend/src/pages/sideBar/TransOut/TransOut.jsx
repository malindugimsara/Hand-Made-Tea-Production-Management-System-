import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Send, PackageOpen, Tag, Weight, X, Clock, FileText, Calendar, Calculator, ArrowRight, AlertTriangle, MousePointerClick } from "lucide-react"; 

// Dynamic colors mapping your specific Tea Types
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('purple')) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50';
    if (p.includes('pink')) return 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50';
    if (p.includes('white') || p.includes('silver')) return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    if (p.includes('gold')) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50';
    if (p.includes('slim') || p.includes('green') || p.includes('glow')) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50';
    if (p.includes('flower') || p.includes('chakra')) return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50';
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-600'; 
};

// Extracted border colors for the top-accent cards
const getAccentColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('purple')) return 'border-t-purple-500';
    if (p.includes('pink')) return 'border-t-pink-500';
    if (p.includes('white') || p.includes('silver')) return 'border-t-gray-400 dark:border-t-gray-500';
    if (p.includes('gold')) return 'border-t-yellow-500';
    if (p.includes('slim') || p.includes('green') || p.includes('glow')) return 'border-t-emerald-500';
    if (p.includes('flower') || p.includes('chakra')) return 'border-t-indigo-500';
    return 'border-t-teal-500'; 
}

const TEA_TYPES = [
    "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
    "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
    "Flower", "Chakra"
];

export default function TransOut() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    const [submitting, setSubmitting] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    
    const [pendingOutTransfers, setPendingOutTransfers] = useState([]);
    const [availableStock, setAvailableStock] = useState({}); 
    
    // Form States
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");
    const [itemsList, setItemsList] = useState([
        { id: Date.now(), product: '', issuedQtyKg: '' }
    ]);

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

    useEffect(() => {
        if (issueDate) {
            fetchStockUpToDate(issueDate);
        }
    }, [issueDate]);

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

    const fetchStockUpToDate = async (targetDate) => {
        setLoadingStock(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/handmade/transfers/stock-summary?date=${targetDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json(); 
                setAvailableStock(data);
            } else {
                setAvailableStock({});
            }
        } catch (error) {
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

    // Main Input Handler (Handles Dropdown auto-filling)
    const handleItemChange = (id, field, value) => {
        if (field === 'issuedQtyKg' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(prevItems => prevItems.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };
                
                // FEATURE: Auto-fill maximum available quantity when product is selected
                if (field === 'product') {
                    const maxAvailable = availableStock[value] || 0;
                    if (maxAvailable > 0) {
                        updatedRow.issuedQtyKg = maxAvailable.toString();
                    } else {
                        updatedRow.issuedQtyKg = ''; 
                    }
                }
                return updatedRow;
            }
            return row;
        }));
    };

    // FEATURE: Add product from Stock Card click
    const handleStockCardClick = (productName, maxQty) => {
        setItemsList(prevItems => {
            // Find the first empty row
            const emptyRowIndex = prevItems.findIndex(row => !row.product);

            if (emptyRowIndex !== -1) {
                // Fill the empty row
                const newItems = [...prevItems];
                newItems[emptyRowIndex] = {
                    ...newItems[emptyRowIndex],
                    product: productName,
                    issuedQtyKg: maxQty.toString()
                };
                return newItems;
            } else {
                // Or create a new row if everything is filled
                return [
                    ...prevItems,
                    { id: Date.now(), product: productName, issuedQtyKg: maxQty.toString() }
                ];
            }
        });
        toast.success(`Added ${productName} to dispatch list!`);
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

        let stockWarning = false;
        itemsList.forEach(item => {
            const maxAvailable = availableStock[item.product] || 0;
            if (Number(item.issuedQtyKg) > maxAvailable) stockWarning = true;
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
                dateIssued: issueDate, 
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
            fetchStockUpToDate(issueDate);

        } catch (error) {
            toast.error("Error sending stock.", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const stockBoardArray = Object.entries(availableStock).filter(([_, qty]) => qty > 0).sort((a, b) => b[1] - a[1]);
    const totalBoardQty = stockBoardArray.reduce((sum, [_, qty]) => sum + qty, 0);

    return (
        <div className="p-4 sm:p-8 max-w-[1500px] mx-auto font-sans min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-3 tracking-tight">
                    <Send size={28} /> Trans Out (Issue Bulk Tea)
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Issue bulk manufactured tea to the Packing section for packaging.</p>
            </div>

            {/* --- DASHBOARD WIDGET STYLE FOR STOCK (CLICKABLE) --- */}
            <div className="mb-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                <div className="bg-[#0f766e] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Calculator size={20} /> Current Available Stock
                        </h3>
                        <p className="text-xs text-teal-100 font-medium mt-0.5">Total M/T produced minus all previously issued transfers up to the selected date.</p>
                    </div>
                    <div className="text-sm font-bold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 shadow-inner">
                        <span className="opacity-80 font-medium mr-2">Total Capacity:</span> 
                        {loadingStock ? '...' : totalBoardQty.toFixed(2)} KG
                    </div>
                </div>
                
                <div className="p-6 bg-gray-50/50 dark:bg-zinc-900/50">
                    {loadingStock ? (
                        <div className="py-12 text-center text-gray-500 flex justify-center items-center gap-3">
                            <div className="w-5 h-5 border-2 border-teal-200 border-t-[#0f766e] rounded-full animate-spin"></div>
                            Calculating stock up to selected date...
                        </div>
                    ) : stockBoardArray.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                            <PackageOpen size={48} className="mb-3 opacity-20" />
                            <p className="font-bold text-lg">No stock available</p>
                            <p className="text-sm mt-1">There is no production stock registered on or before {issueDate}.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {stockBoardArray.map(([prodName, qty], idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handleStockCardClick(prodName, qty)}
                                    className={`bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm border-t-4 ${getAccentColor(prodName)} hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden`}
                                    title={`Click to auto-fill ${prodName} transfer`}
                                >
                                    {/* Hover overlay indicator */}
                                    <div className="absolute inset-0 bg-teal-50/50 dark:bg-teal-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center backdrop-blur-[1px]">
                                        <span className="bg-white dark:bg-zinc-800 text-[#0f766e] dark:text-teal-400 text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform">
                                            <MousePointerClick size={14}/> Click to Add
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 truncate" title={prodName}>{prodName}</p>
                                    </div>
                                    <p className="text-xl font-black text-gray-900 dark:text-white flex items-baseline gap-1 relative z-10 group-hover:opacity-0 transition-opacity">
                                        {qty.toFixed(2)} <span className="text-xs text-gray-400 font-bold lowercase">kg</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* --- LEFT SIDE: SEND STOCK FORM --- */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmitTransfer} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 transition-colors duration-300">
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b border-gray-100 dark:border-zinc-800 gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <PackageOpen size={22} className="text-[#0f766e] dark:text-teal-500" /> New Transfer Ticket
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Add products to issue to the packing floor</p>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-center gap-3 w-full sm:w-auto">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-2 hidden sm:block">
                                    Issue Date
                                </label>
                                <div className="relative w-full sm:w-44">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="date" 
                                        value={issueDate} 
                                        onChange={(e) => setIssueDate(e.target.value)} 
                                        required 
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-teal-500/50 outline-none bg-white dark:bg-zinc-900 dark:text-gray-100 transition-colors cursor-pointer" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 mb-8">
                            {itemsList.map((row, index) => {
                                const availableForProduct = availableStock[row.product] || 0;
                                const issuedNum = Number(row.issuedQtyKg) || 0;
                                const isOverCapacity = row.product && issuedNum > availableForProduct;
                                const remaining = Math.max(0, availableForProduct - issuedNum);
                                
                                return (
                                    <div key={row.id} className={`relative bg-gray-50 dark:bg-zinc-800/40 p-5 rounded-2xl border-2 transition-colors duration-300 ${isOverCapacity ? 'border-amber-400 bg-amber-50/30 dark:border-amber-500/50 dark:bg-amber-900/10' : 'border-transparent hover:border-gray-200 dark:hover:border-zinc-700'}`}>
                                        
                                        <div className="absolute -left-3 -top-3 w-8 h-8 bg-white dark:bg-zinc-700 border-2 border-gray-100 dark:border-zinc-600 rounded-full flex items-center justify-center text-xs font-black text-gray-400 shadow-sm z-10">
                                            {index + 1}
                                        </div>

                                        {itemsList.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItemRow(row.id)}
                                                className="absolute -top-3 -right-3 bg-white hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 border-2 border-gray-200 dark:border-zinc-600 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                            
                                            {/* Product Selection */}
                                            <div className="md:col-span-6 lg:col-span-7 relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center gap-1">
                                                    <Tag size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0f766e] dark:text-teal-500"}/> 
                                                    Select Tea Product
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type or select..."
                                                        value={row.product}
                                                        onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                        onFocus={() => setOpenDropdownId(`product-${row.id}`)}
                                                        required
                                                        className={`w-full p-3 pl-4 border rounded-xl font-medium focus:ring-2 outline-none transition-colors shadow-sm ${
                                                            row.product 
                                                            ? isOverCapacity 
                                                                ? 'border-amber-300 focus:ring-amber-400/50 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white' 
                                                                : 'border-teal-200 dark:border-teal-800/50 focus:ring-teal-500/50 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white' 
                                                            : 'border-gray-200 dark:border-zinc-700 focus:ring-teal-500/50 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white'
                                                        }`}
                                                    />
                                                    {row.product && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded border shadow-sm bg-white dark:bg-zinc-800 ${getTeaColor(row.product)}`}>
                                                                {row.product}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {openDropdownId === `product-${row.id}` && (
                                                    <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-y-auto max-h-[250px] custom-scrollbar py-1">
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
                                                                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-zinc-700 cursor-pointer flex items-center justify-between group transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20 shadow-sm`}></div> 
                                                                    {tea}
                                                                </div>
                                                                {availableStock[tea] > 0 && (
                                                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        Auto-fill {availableStock[tea].toFixed(2)} kg
                                                                    </span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-end h-full pt-1">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                                        <Weight size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0f766e] dark:text-teal-500"}/> Issue Amount
                                                    </label>
                                                    {row.product && (
                                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                            Available: <span className="text-gray-800 dark:text-gray-200">{availableForProduct.toFixed(2)}</span> kg
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-1">
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            min="0"
                                                            value={row.issuedQtyKg} 
                                                            onChange={(e) => handleItemChange(row.id, 'issuedQtyKg', e.target.value)}
                                                            onWheel={(e) => e.target.blur()} 
                                                            required 
                                                            placeholder="0.00"
                                                            className={`w-full p-3 pr-8 rounded-xl font-black text-lg focus:ring-2 outline-none transition-colors text-right shadow-inner ${
                                                                isOverCapacity 
                                                                ? 'border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 focus:ring-amber-500/50' 
                                                                : 'border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-teal-500/50'
                                                            }`} 
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">KG</span>
                                                    </div>
                                                </div>

                                                <div className="mt-2 h-4">
                                                    {row.product && (
                                                        isOverCapacity ? (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 justify-end">
                                                                <AlertTriangle size={12} /> Exceeds stock by {(issuedNum - availableForProduct).toFixed(2)} kg!
                                                            </div>
                                                        ) : issuedNum > 0 ? (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 justify-end">
                                                                <ArrowRight size={12} /> Remaining stock will be: {remaining.toFixed(2)} kg
                                                            </div>
                                                        ) : null
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center mb-8">
                            <button 
                                type="button" 
                                onClick={handleAddItemRow}
                                className="text-sm font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-full flex items-center gap-2 transition-all hover:shadow-md border border-gray-200 dark:border-zinc-700"
                            >
                                <PlusCircle size={18} className="text-[#0f766e] dark:text-teal-400" /> Add Another Product
                            </button>
                        </div>
                        
                        <div className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-xl p-5 mb-8 flex justify-between items-center">
                            <span className="font-bold text-gray-600 dark:text-gray-400 uppercase text-sm tracking-wider">Total Bulk Weight</span>
                            <span className="font-black text-2xl text-[#0f766e] dark:text-teal-400">{totalOutgoingKg.toFixed(2)} <span className="text-sm font-bold text-teal-600/50 uppercase">KG</span></span>
                        </div>



                        <button 
                            type="submit" 
                            disabled={submitting}
                            className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                submitting 
                                ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-[#0f766e] to-[#2dd4bf] hover:shadow-teal-500/30 hover:-translate-y-1'
                            }`}
                        >
                            <Send size={22} /> {submitting ? "Processing Transfer..." : "Confirm & Send to Packing"}
                        </button>
                    </form>
                </div>

                {/* --- RIGHT SIDE: STICKY TRACKER --- */}
                <div className="lg:col-span-1 relative h-full">
                    <div className="sticky top-6 flex flex-col gap-6">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[85vh]">
                            
                            <div className="bg-gray-50 dark:bg-zinc-800/80 px-6 py-5 border-b border-gray-200 dark:border-zinc-800 rounded-t-2xl">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Clock size={18} className="text-orange-500 dark:text-orange-400" /> Awaiting Acceptance
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                                    These transfers have been sent but not yet verified by the Packing floor.
                                </p>
                            </div>
                            
                            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-zinc-900/30">
                                {pendingOutTransfers.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                            <Clock size={24} className="opacity-40" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">All clear!</p>
                                        <p className="text-xs mt-1 text-center max-w-[200px]">Packing has received and verified all your transfers.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingOutTransfers.map(transfer => (
                                            <div key={transfer._id} className="bg-white dark:bg-zinc-800 p-4 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 dark:bg-orange-500 opacity-70"></div>
                                                
                                                <div className="flex justify-between items-start mb-3 border-b border-gray-100 dark:border-zinc-700/50 pb-3 pl-2">
                                                    <div>
                                                        <p className="text-xs font-black text-gray-800 dark:text-gray-200 tracking-wide">{transfer.transferId}</p>
                                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                                                            <Calendar size={10} /> {new Date(transfer.dateIssued).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                                        </p>
                                                    </div>
                                                    <span className="text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-400 px-2 py-1 rounded shadow-sm tracking-wider">
                                                        PENDING
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 pl-2">
                                                    {transfer.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{item.product}</span>
                                                            <span className="font-black text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded">{item.issuedQtyKg} kg</span>
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
        </div>
    );
}