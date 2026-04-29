import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Trash2, ListChecks, Save, Calendar, FileText, Truck, Box, X, Layers, Hash } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

// Common Raw Materials list for Autocomplete
const RAW_MATERIALS = [
    "50g Silver Pouch", "100g Gold Pouch", "200g Printed Box", "500g Printed Box",
    "Master Carton (Large)", "Master Carton (Small)", "Barcode Labels", 
    "Packing Tape (Brown)", "Packing Tape (Clear)", "Glue Bottle", 
    "Tea Bags Filter Paper", "Cotton Thread", "Inner Polybag"
];

const UNITS = ["kg", "pcs", "rolls", "bundles", "boxes", "meters"];

export default function RawMaterialInEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        invoiceNo: '',
        supplierName: '',
        remarks: ''
    });

    const [itemsList, setItemsList] = useState([
        { id: Date.now(), materialName: '', quantity: '', unit: 'kg' }
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

    // Calculate Summary from pending records
    const summaryMap = {};
    pendingRecords.forEach(record => {
        record.items.forEach(item => {
            const key = `${item.materialName}-${item.unit}`;
            if (!summaryMap[key]) {
                summaryMap[key] = { materialName: item.materialName, unit: item.unit, qty: 0 };
            }
            summaryMap[key].qty += Number(item.quantity) || 0;
        });
    });
    const summaryArray = Object.values(summaryMap).sort((a, b) => b.qty - a.qty);

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), materialName: '', quantity: '', unit: 'pcs' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleItemChange = (id, field, value) => {
        if (field === 'quantity' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(itemsList.map(row => {
            if (row.id === id) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddToList = (e) => {
        e.preventDefault();

        if (!formData.invoiceNo.trim() || !formData.supplierName.trim()) {
            toast.error("Please enter Invoice No and Supplier Name!");
            return;
        }

        const hasEmptyItem = itemsList.some(row => !row.materialName || row.quantity === '');
        if (hasEmptyItem) {
            toast.error("Please fill out all Material Name and Quantity details completely!");
            return;
        }

        const newRecord = { 
            ...formData,
            items: itemsList.map(item => ({ ...item }))
        };

        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`Record added to list!`);
        
        // Reset items and invoice/remarks but keep date and supplier for faster bulk entry
        setItemsList([{ id: Date.now(), materialName: '', quantity: '', unit: 'pcs' }]);
        setFormData(prev => ({ ...prev, invoiceNo: '', remarks: '' })); 
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

        setShowSpinner(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const promises = pendingRecords.map(record => {
                const payload = {
                    date: record.date,
                    invoiceNo: record.invoiceNo,
                    supplierName: record.supplierName,
                    remarks: record.remarks,
                    items: record.items.map(item => ({
                        materialName: item.materialName,
                        quantity: Number(item.quantity),
                        unit: item.unit
                    }))
                };

                return fetch(`${BACKEND_URL}/api/raw-materials-in/create`, { 
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

            toast.success("All raw material records saved successfully!", { id: toastId });
            setPendingRecords([]);
            
            // Navigate back to raw materials view page if you have one
            // setTimeout(() => navigate('/inventory/raw-materials-view'), 1000);

        } catch (error) {
            console.error(error);
            toast.error("Error saving some records. Please check.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) navigate(-1);
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans  dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400">Raw Material Inward Entry</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Record incoming packaging and raw materials</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* --- LEFT SIDE: DATA ENTRY FORM --- */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-[#99f6e4] dark:border-zinc-800 transition-colors duration-300">
                        
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={16} className="text-[#0d9488]"/> Date
                                </label>
                                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <FileText size={16} className="text-[#0d9488]"/> Invoice No
                                </label>
                                <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleInputChange} required placeholder="e.g. INV-2024-001" className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Truck size={16} className="text-[#0d9488]"/> Supplier
                                </label>
                                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} required placeholder="e.g. ABC Packaging" className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                            </div>
                        </div>

                        <div className="mb-8 bg-[#f0fdfa] dark:bg-teal-950/20 border border-[#99f6e4] dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-500 flex items-center gap-2">
                                    <Layers size={20} /> Received Items
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {itemsList.map((row) => (
                                    <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-[#99f6e4] dark:border-teal-900/40 shadow-sm">
                                        {itemsList.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveItemRow(row.id)} className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10">
                                                <X size={14} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            {/* Material Name */}
                                            <div className="md:col-span-2 relative" ref={el => dropdownRefs.current[`mat-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Box size={12} className="text-[#0d9488]"/> Material Name
                                                </label>
                                                <input 
                                                    type="text" placeholder="Type or Select..." value={row.materialName} 
                                                    onChange={(e) => handleItemChange(row.id, 'materialName', e.target.value)}
                                                    onFocus={() => setOpenDropdownId(`mat-${row.id}`)} required
                                                    className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                                                />
                                                {openDropdownId === `mat-${row.id}` && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                        {RAW_MATERIALS.filter(m => m.toLowerCase().includes(row.materialName.toLowerCase())).map((mat, idx) => (
                                                            <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'materialName', mat); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0">
                                                                {mat}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Hash size={12} className="text-[#0d9488]"/> Quantity
                                                </label>
                                                <input type="number" step="any" min="0" value={row.quantity} onChange={(e) => handleItemChange(row.id, 'quantity', e.target.value)} onWheel={(e) => e.target.blur()} required placeholder="e.g. 5000" className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                            </div>

                                            {/* Unit */}
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Unit</label>
                                                <select value={row.unit} onChange={(e) => handleItemChange(row.id, 'unit', e.target.value)} className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors cursor-pointer">
                                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-end w-full">
                                <button type="button" onClick={handleAddItemRow} className="mt-4 text-sm font-bold bg-[#f0fdfa] hover:bg-[#99f6e4]/50 dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto border border-[#99f6e4] dark:border-transparent">
                                    <PlusCircle size={16} /> Add Another Material
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 rounded-xl text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/30 border border-[#0d9488] dark:border-teal-700 font-bold flex justify-center items-center gap-2 hover:bg-[#ccfbf1] dark:hover:bg-teal-900/50 transition-all">
                            <PlusCircle size={20} /> Add Record to Pending List
                        </button>
                    </form>
                </div>

                {/* --- RIGHT SIDE: PENDING LIST & SUMMARY --- */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-[#99f6e4] dark:border-teal-900/50 flex flex-col max-h-[60vh] transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-[#ccfbf1] dark:bg-teal-900/40 rounded-lg text-[#0f766e] dark:text-teal-400"><ListChecks size={20} /></div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Pending Invoices</h3>
                            </div>
                            <span className="bg-[#ccfbf1] dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 text-xs font-bold px-3 py-1 rounded-full">{pendingRecords.length} Invoices</span>
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
                                        <div key={index} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group hover:border-[#0d9488] transition-colors">
                                            <button onClick={() => handleRemoveFromList(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors" title="Remove"><Trash2 size={16} /></button>
                                            
                                            <div className="flex flex-col gap-2 pr-8">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-gray-800 dark:text-gray-200 text-lg">{record.invoiceNo}</span>
                                                    <span className="text-xs font-bold bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">{record.date}</span>
                                                </div>
                                                <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                    <Truck size={12}/> {record.supplierName}
                                                </div>
                                                
                                                <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-gray-100 dark:border-zinc-700/50 text-xs mt-1 space-y-1">
                                                    {record.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center border-b border-gray-50 dark:border-zinc-800 pb-1 last:border-0 last:pb-0">
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">{item.materialName}</span>
                                                            <span className="font-bold text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/30 px-1.5 py-0.5 rounded">{item.quantity} {item.unit}</span>
                                                        </div>
                                                    ))}
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
                                <Save size={20} /> {showSpinner ? "Saving..." : `Save All To Inventory`}
                            </button>
                        </div>
                    </div>

                    {pendingRecords.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                            <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Layers size={18} className="text-[#0d9488]" /> Pending Items Summary</h3>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[30vh] custom-scrollbar">
                                <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                                            <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-gray-200">Material</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">Total Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryArray.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-700">
                                                <td className="px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300">{item.materialName}</td>
                                                <td className="px-3 py-2 text-right font-bold text-[#0f766e] dark:text-teal-400">{item.qty} {item.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}