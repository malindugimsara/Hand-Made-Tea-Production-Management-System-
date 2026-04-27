import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Trash2, ListChecks, Save, Package, ShoppingCart, Calendar, Weight, Tag, X, Calculator, AlertTriangle, ArrowRight } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';
import PDFDownloader from '@/components/PDFDownloader';

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
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700'; 
};

const getPdfTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p === 'bopf') return { fillColor: [253, 224, 71], textColor: [113, 63, 18] }; 
    if (p.includes('bopf sp')) return { fillColor: [190, 242, 100], textColor: [77, 124, 15] }; 
    if (p === 'dust') return { fillColor: [59, 130, 246], textColor: [255, 255, 255] }; 
    if (p === 'dust 1') return { fillColor: [6, 182, 212], textColor: [255, 255, 255] }; 
    if (p.includes('premium')) return { fillColor: [244, 114, 182], textColor: [255, 255, 255] }; 
    if (p.includes('awuru')) return { fillColor: [192, 132, 252], textColor: [255, 255, 255] }; 
    if (p === 't/b 25') return { fillColor: [239, 68, 68], textColor: [255, 255, 255] }; 
    if (p === 't/b 100') return { fillColor: [120, 53, 15], textColor: [255, 255, 255] }; 
    if (p.includes('green')) return { fillColor: [74, 222, 128], textColor: [20, 83, 45] }; 
    if (p.includes('labour')) return { fillColor: [229, 231, 235], textColor: [31, 41, 55] }; 
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; 
};

const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea bag (25)", "New edition", "Pitigala tea bags", 
    "Pitigala tea 400g",
    "Awurudu Special", "Labour drinking tea"
];

const getPackSizes = (product) => {
    if (!product) return null;
    const p = product.toLowerCase();
    if (p === 'bopf') return ["0.4", "0.2", "0.1"];
    if (p.includes('bopf sp')) return ["0.4", "0.2"];
    if (p.includes('premium')) return ["0.4", "0.2"];
    if (p.includes('awuru')) return ["0.3"];
    if (p.includes('pitigala tea bags')) return ["0.025", "0.05", "0.1"];
    if (p.includes('green tea bag (25)') || p.includes('green tea bags')) return ["0.025"];
    if (p.includes('green tea')) return ["0.2"]; 
    return null; 
};

export default function LocalRecordEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [factoryStock, setFactoryStock] = useState([]);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
    });

    const [itemsList, setItemsList] = useState([
        { id: Date.now(), product: '', packSizeKg: '', numberOfBoxes: '' }
    ]);

    const [openDropdownId, setOpenDropdownId] = useState(null); 
    const dropdownRefs = useRef({}); 

    useEffect(() => {
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
        const fetchStock = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${BACKEND_URL}/api/packing-stock`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const factoryData = data.filter(item => item.source === 'Factory');
                    setFactoryStock(factoryData);
                }
            } catch (error) {
                console.error("Error fetching factory stock:", error);
            }
        };
        fetchStock();
    }, [BACKEND_URL]);

    const productSummaryMap = {};
    pendingRecords.forEach(record => {
        record.items.forEach(item => {
            if (!productSummaryMap[item.product]) productSummaryMap[item.product] = 0;
            productSummaryMap[item.product] += Number(item.calculatedQtyKg) || 0;
        });
    });
    const summaryArray = Object.entries(productSummaryMap).sort((a, b) => b[1] - a[1]);
    const grandPendingQty = summaryArray.reduce((sum, [_, qty]) => sum + qty, 0);

    const totalFactoryStock = factoryStock.reduce((sum, item) => sum + (item.bulkStockKg || 0), 0);

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', packSizeKg: '', numberOfBoxes: '' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleItemChange = (id, field, value) => {
        if (field !== 'product' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(itemsList.map(row => {
            if (row.id === id) {
                if (field === 'product') {
                    const availableSizes = getPackSizes(value);
                    if (availableSizes && !availableSizes.includes(row.packSizeKg)) {
                        return { ...row, [field]: value, packSizeKg: '' };
                    }
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const totalBoxes = itemsList.reduce((sum, row) => sum + (Number(row.numberOfBoxes) || 0), 0);
    const totalQtyKg = itemsList.reduce((sum, row) => {
        const pack = Number(row.packSizeKg) || 0;
        const boxes = Number(row.numberOfBoxes) || 0;
        return sum + (pack * boxes);
    }, 0);

    const handleAddToList = (e) => {
        e.preventDefault();
        const hasEmptyItem = itemsList.some(row => !row.product || row.packSizeKg === '' || row.numberOfBoxes === '');
        if (hasEmptyItem) {
            toast.error("Please fill out all Product, Pack Size, and Box details completely!");
            return;
        }

        const newRecord = { 
            date: formData.date,
            items: itemsList.map(item => ({
                ...item,
                calculatedQtyKg: (Number(item.packSizeKg) * Number(item.numberOfBoxes)).toFixed(2)
            })),
            totalBoxes,
            totalQtyKg
        };
        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`Record added to list!`);
        setItemsList([{ id: Date.now(), product: '', packSizeKg: '', numberOfBoxes: '' }]);
    };

    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("No records in the list to save!");
            return;
        }

        // Check overall stock capacity before saving
        let stockWarning = false;
        pendingRecords.forEach(record => {
            record.items.forEach(item => {
                const stockData = factoryStock.find(s => s.productName === item.product);
                const available = stockData ? stockData.bulkStockKg : 0;
                if (Number(item.calculatedQtyKg) > available) stockWarning = true;
            });
        });

        if (stockWarning) {
            if(!window.confirm("You are issuing MORE stock than what is currently available. Do you want to proceed anyway?")) {
                return;
            }
        }

        setShowSpinner(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const promises = pendingRecords.map(record => {
                const payload = {
                    date: record.date,
                    totalBoxes: record.totalBoxes,
                    totalQtyKg: record.totalQtyKg,
                    salesItems: record.items.map(item => ({
                        product: item.product,
                        packSizeKg: Number(item.packSizeKg),
                        numberOfBoxes: Number(item.numberOfBoxes),
                        totalQtyKg: Number(item.calculatedQtyKg)
                    }))
                };

                return fetch(`${BACKEND_URL}/api/local-sales`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    if (!res.ok) {
                        if (res.status === 403) throw new Error('Access Denied');
                        throw new Error('Failed');
                    }
                    return res.json();
                });
            });

            await Promise.all(promises);
            toast.success("All local sales saved successfully!", { id: toastId });
            setPendingRecords([]);
            
            setTimeout(() => {
                navigate('/packing/local-record-view');
            }, 1000);

        } catch (error) {
            console.error(error);
            if (error.message === 'Access Denied') {
                toast.error("Access Denied. You do not have permission to add records.", { id: toastId });
            } else {
                toast.error("Error saving some records. Please check.", { id: toastId });
            }
        } finally {
            setShowSpinner(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400">Local Sale Record Entry</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Issue record for daily local product sales</p>
                </div>
            </div>
            
            {/* AVAILABLE FACTORY STOCK SECTION (View Only) */}
            <div className="mb-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 transition-colors duration-300">
                <div className="bg-[#2f7466] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <Calculator size={20} /> Current Available Stock (Factory)
                        </h3>
                        <p className="text-white/80 text-xs mt-1">
                            Use these values to ensure you do not exceed the available factory stock during dispatch.
                        </p>
                    </div>
                    <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10">
                        Total Capacity: {totalFactoryStock.toFixed(2)} KG
                    </div>
                </div>
                
                <div className="p-6">
                    {factoryStock.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No factory stock is currently available.</p>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {factoryStock.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="border border-gray-200 dark:border-zinc-700 rounded-xl p-4 min-w-[140px] shadow-sm bg-white dark:bg-zinc-800 transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600"
                                >
                                    <h4 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors">
                                        {item.productName}
                                    </h4>
                                    <div className="text-xl font-black text-gray-800 dark:text-gray-100">
                                        {Number(item.bulkStockKg).toFixed(2)} <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* --- LEFT SIDE: DATA ENTRY FORM --- */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 transition-colors duration-300">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={16} className="text-[#0d9488]"/> Date
                            </label>
                            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full md:w-1/2 p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                        </div>

                        <div className="mb-8 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-500 flex items-center gap-2">
                                    <ShoppingCart size={20} /> Products Issued
                                </h3>
                                
                            </div>

                            <div className="space-y-6">
                                {itemsList.map((row) => {
                                    const availableSizes = getPackSizes(row.product);
                                    
                                    // --- LOGIC: Visual Warning Flags ---
                                    const stockData = factoryStock.find(s => s.productName === row.product);
                                    const availableForProduct = stockData ? stockData.bulkStockKg : 0;
                                    const issuedNum = (Number(row.packSizeKg) * Number(row.numberOfBoxes)) || 0;
                                    const isOverCapacity = row.product && issuedNum > availableForProduct;
                                    const remaining = Math.max(0, availableForProduct - issuedNum);

                                    return (
                                        <div key={row.id} className={`relative bg-white dark:bg-zinc-950 p-4 rounded-xl border transition-colors shadow-sm ${isOverCapacity ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-teal-100 dark:border-teal-900/40'}`}>
                                            
                                            {itemsList.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveItemRow(row.id)} className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10">
                                                    <X size={14} />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                
                                                <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                        <Tag size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0d9488] dark:text-teal-400"}/> Product
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type or select..."
                                                        value={row.product}
                                                        onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                        onFocus={() => setOpenDropdownId(`product-${row.id}`)}
                                                        required
                                                        className={`w-full p-2.5 border rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'} ${isOverCapacity ? 'border-amber-300' : 'border-teal-200 dark:border-teal-800/50'}`}
                                                    />
                                                    
                                                    {openDropdownId === `product-${row.id}` && (
                                                        <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                            {TEA_TYPES
                                                                .filter(tea => tea.toLowerCase().includes(row.product.toLowerCase()))
                                                                .map((tea, idx) => (
                                                                <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'product', tea); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>

                                                <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`size-${row.id}`] = el}>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Pack Size (Kg)</label>
                                                    <input 
                                                        type="number" step="any" min="0"
                                                        value={row.packSizeKg} 
                                                        onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)}
                                                        onFocus={() => { if (availableSizes) setOpenDropdownId(`size-${row.id}`); }}
                                                        onWheel={(e) => e.target.blur()} required placeholder="e.g. 0.4"
                                                        className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                    />
                                                    
                                                    {openDropdownId === `size-${row.id}` && availableSizes && (
                                                        <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden">
                                                            {availableSizes.map((size, idx) => (
                                                                <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'packSizeKg', size); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50">
                                                                    {size} kg
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>

                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">No. of Box/Packs</label>
                                                    <input 
                                                        type="number" step="1" min="0"
                                                        value={row.numberOfBoxes} 
                                                        onChange={(e) => handleItemChange(row.id, 'numberOfBoxes', e.target.value)}
                                                        onWheel={(e) => e.target.blur()} required placeholder="e.g. 50"
                                                        className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                    />
                                                </div>

                                                <div className="lg:col-span-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                                            Qty (Kg) <Weight size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0d9488] dark:text-teal-400"}/>
                                                        </label>
                                                        {row.product && (
                                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                                Avail: <span className="text-gray-800 dark:text-gray-200">{availableForProduct.toFixed(2)}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`w-full p-2.5 border font-bold rounded-md text-center transition-colors ${isOverCapacity ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-teal-300 dark:border-teal-700/50 bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400'}`}>
                                                        {issuedNum > 0 ? issuedNum.toFixed(2) : "0.00"}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stock Warning Messages */}
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
                                    );
                                })}
                            </div>
                            
                            <div className="flex justify-end w-full">
                                <button type="button" onClick={handleAddItemRow} className="mt-4 text-sm font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-800/60 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                    <PlusCircle size={16} /> Add Product
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 border-t border-teal-200/50 dark:border-teal-800/30 pt-4">
                                <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300">
                                    Total Packs: <span className="font-bold">{totalBoxes}</span>
                                </div>
                                
                                <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300 flex items-center gap-1">
                                    <Package size={16}/> Total Weight: <span className="font-bold text-lg">{totalQtyKg.toFixed(2)} Kg</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 rounded-xl text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/30 border border-[#0d9488] dark:border-teal-700 font-bold flex justify-center items-center gap-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all">
                            <PlusCircle size={20} /> Add Daily Record to List
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-teal-100 dark:border-teal-900/50 flex flex-col max-h-[60vh] transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg text-[#0f766e] dark:text-teal-400"><ListChecks size={20} /></div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Pending Records</h3>
                            </div>
                            <span className="bg-teal-100 dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 text-xs font-bold px-3 py-1 rounded-full">{pendingRecords.length} Items</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[150px]">
                            {pendingRecords.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8">
                                    <ListChecks size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm font-medium">List is empty.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRecords.map((record, index) => (
                                        <div key={index} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group hover:border-[#2dd4bf] dark:hover:border-teal-800 transition-colors">
                                            <button onClick={() => handleRemoveFromList(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors" title="Remove"><Trash2 size={16} /></button>
                                            <div className="flex flex-col gap-2 pr-8">
                                                <div className="flex flex-wrap items-center gap-2"><span className="font-black text-gray-800 dark:text-gray-200 text-lg">{record.date}</span></div>
                                                <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-gray-100 dark:border-zinc-700/50 text-xs mt-1">
                                                    <div className="space-y-2 mb-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
                                                        {record.items.map((item, i) => (
                                                            <div key={i} className="flex justify-between items-center text-[11px]">
                                                                <span className={`font-bold border px-2 py-0.5 rounded shadow-sm text-[10px] w-fit ${getTeaColor(item.product)}`}>{item.product}</span>
                                                                <div className="flex items-center gap-3 text-gray-500">
                                                                    <span>{item.numberOfBoxes} x {item.packSizeKg}kg</span>
                                                                    <span className="font-bold text-[#0d9488] w-12 text-right">{item.calculatedQtyKg} kg</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center font-bold">
                                                        <span className="text-gray-500 uppercase text-[10px]">Daily Totals:</span>
                                                        <div className="flex gap-4">
                                                            <span className="text-gray-600 dark:text-gray-300">{record.totalBoxes} Boxes</span>
                                                            <span className="text-[#0f766e] dark:text-teal-400">{record.totalQtyKg.toFixed(2)} Kg</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                            <button type="button" onClick={handleCancel} disabled={showSpinner} className="w-full py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveAll} disabled={showSpinner || pendingRecords.length === 0} className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${showSpinner || pendingRecords.length === 0 ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-[#0d9488]/40 hover:-translate-y-1'}`}>
                                <Save size={20} /> {showSpinner ? "Saving..." : `Save All`}
                            </button>
                        </div>
                    </div>

                    {pendingRecords.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                            <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Weight size={18} className="text-[#0d9488]" /> Pending Summary By Product</h3>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[30vh] custom-scrollbar">
                                <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                                            <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-gray-200">Product</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">Qty (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryArray.map(([prodName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-700">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-700 ${getTeaColor(prodName)}`}>{prodName}</td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{qty % 1 !== 0 ? qty.toFixed(2) : qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-600">
                                            <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-700">PENDING TOTAL</td>
                                            <td className="px-3 py-2 text-right text-[#0f766e] dark:text-teal-400">{grandPendingQty % 1 !== 0 ? grandPendingQty.toFixed(2) : grandPendingQty}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}