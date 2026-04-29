import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { PlusCircle, Save, Calendar, FileText, Truck, Box, X, Hash, PackagePlus, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

const RAW_MATERIALS = [
    "50g Silver Pouch", "100g Gold Pouch", "200g Printed Box", "500g Printed Box",
    "Master Carton (Large)", "Master Carton (Small)", "Barcode Labels", 
    "Packing Tape (Brown)", "Packing Tape (Clear)", "Glue Bottle", 
    "Tea Bags Filter Paper", "Cotton Thread", "Inner Polybag"
];

const UNITS = ["kg", "pcs", "rolls", "bundles", "boxes", "meters"];

export default function EditRawMaterialIn() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();
    
    const [showSpinner, setShowSpinner] = useState(false);
    const [recordId, setRecordId] = useState(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        invoiceNo: '',
        supplierName: '',
        remarks: ''
    });

    const [itemsList, setItemsList] = useState([]);

    const [openDropdownId, setOpenDropdownId] = useState(null);
    const dropdownRefs = useRef({}); 

    useEffect(() => {
        const recordData = location.state?.recordData;
        
        if (!recordData) {
            toast.error("No record data found! Redirecting...");
            navigate('/inventory/raw-materials-view'); 
            return;
        }

        setRecordId(recordData._id);
        
        const formattedDate = new Date(recordData.date).toISOString().split('T')[0];
        
        setFormData({
            date: formattedDate,
            invoiceNo: recordData.invoiceNo || '',
            supplierName: recordData.supplierName || '',
            remarks: recordData.remarks || ''
        });

        if (recordData.itemsArray && recordData.itemsArray.length > 0) {
            setItemsList(recordData.itemsArray.map((item, index) => ({
                id: Date.now() + index, 
                materialName: item.materialName,
                quantity: item.quantity,
                unit: item.unit || 'pcs'
            })));
        } else {
            setItemsList([{ id: Date.now(), materialName: '', quantity: '', unit: 'pcs' }]);
        }
    }, [location.state, navigate]);

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

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), materialName: '', quantity: '', unit: 'pcs' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) {
            toast.error("You must have at least one item.");
            return;
        }
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

    const handleUpdate = async (e) => {
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

        setShowSpinner(true);
        const toastId = toast.loading("Updating record...");

        try {
            const token = localStorage.getItem('token');
            const editorName = localStorage.getItem('userName') || 'Unknown'; 

            const payload = {
                date: formData.date,
                invoiceNo: formData.invoiceNo,
                supplierName: formData.supplierName,
                remarks: formData.remarks,
                editorName: editorName, 
                items: itemsList.map(item => ({
                    materialName: item.materialName,
                    quantity: Number(item.quantity),
                    unit: item.unit
                }))
            };

            const response = await fetch(`${BACKEND_URL}/api/raw-materials-in/${recordId}`, { 
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error('Access Denied');
                throw new Error('Failed to update record');
            }

            toast.success("Record updated successfully!", { id: toastId });
            setTimeout(() => navigate(-1), 1000);

        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error updating record. Please check.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1000px] mx-auto font-sans  dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackagePlus size={28} /> Edit Raw Material Record
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update incoming packaging and raw material details</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-[#f0fdfa] dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 font-bold shadow-sm">
                    <ArrowLeft size={16} /> Back to View
                </button>
            </div>
            
            <form onSubmit={handleUpdate} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-[#99f6e4] dark:border-zinc-800 transition-colors duration-300">
                
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

                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-[#0d9488]"/> Remarks (Optional)
                    </label>
                    <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Any additional notes..." className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                </div>

                <div className="mb-8 bg-[#f0fdfa] dark:bg-teal-950/20 border border-[#99f6e4] dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-500 flex items-center gap-2">
                            <Box size={20} /> Received Items
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

                <div className="flex gap-4">
                    <button type="button" onClick={handleCancel} disabled={showSpinner} className="w-1/3 py-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={showSpinner} className={`w-2/3 py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${showSpinner ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-teal-500/40 hover:-translate-y-1'}`}>
                        <Save size={20} /> {showSpinner ? "Updating..." : "Update Record"}
                    </button>
                </div>
            </form>
        </div>
    );
}