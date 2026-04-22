import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Save, ShoppingCart, Calendar, Weight, Tag, X, ArrowLeft, Package } from "lucide-react"; 
import { useNavigate, useLocation } from 'react-router-dom';

// Exact Colors based on your image
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

// Combined tea types
const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags(100)", 
    "Pitigala tea bags(50)", "T/B 25", "T/B 100", "Pitigala tea 400g", 
    "Awuru pack", "Labour drinking tea"
];

export default function EditLocalRecord() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    // Get passed record data
    const recordData = location.state?.recordData;

    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        date: '',
    });

    const [itemsList, setItemsList] = useState([]);

    // --- Dropdown States ---
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const dropdownRefs = useRef({}); 

    // Handle outside click for the custom dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            let isOutside = true;
            Object.values(dropdownRefs.current).forEach(ref => {
                if (ref && ref.contains(event.target)) {
                    isOutside = false;
                }
            });
            if (isOutside) setOpenDropdownId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Initial Data Population
    useEffect(() => {
        if (isViewer) {
            toast.error("Access Denied. Viewers cannot edit records.");
            navigate(-1);
            return;
        }

        if (recordData) {
            setFormData({
                date: new Date(recordData.date).toISOString().split('T')[0]
            });
            
            // Map existing items to the itemsList state
            if (recordData.salesItems && recordData.salesItems.length > 0) {
                const formattedItems = recordData.salesItems.map((item, idx) => ({
                    id: Date.now() + idx,
                    product: item.product,
                    packSizeKg: item.packSizeKg,
                    numberOfBoxes: item.numberOfBoxes,
                    calculatedQtyKg: item.totalQtyKg
                }));
                setItemsList(formattedItems);
            } else {
                setItemsList([{ id: Date.now(), product: '', packSizeKg: '', numberOfBoxes: '' }]);
            }
        } else {
            toast.error("No record data found!");
            navigate(-1);
        }
    }, [recordData, navigate, isViewer]);

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', packSizeKg: '', numberOfBoxes: '' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleItemChange = (id, field, value) => {
        if (field !== 'product' && value !== '' && (Number(value) < 0 || value.includes('-'))) {
            return;
        }
        setItemsList(itemsList.map(row => 
            row.id === id ? { ...row, [field]: value } : row
        ));
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const hasEmptyItem = itemsList.some(row => !row.product || row.packSizeKg === '' || row.numberOfBoxes === '');
        if (hasEmptyItem) {
            toast.error("Please fill out all Product, Pack Size, and Box details completely!");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading("Updating record...");

        const currentUsername = localStorage.getItem('username') || 'Unknown';

        const payload = {
            date: formData.date,
            totalBoxes: totalBoxes,
            totalQtyKg: totalQtyKg,
            salesItems: itemsList.map(item => ({
                product: item.product,
                packSizeKg: Number(item.packSizeKg),
                numberOfBoxes: Number(item.numberOfBoxes),
                totalQtyKg: Number((Number(item.packSizeKg) * Number(item.numberOfBoxes)).toFixed(2))
            })),
            updatedBy: currentUsername
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/local-sales/${recordData._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => navigate(-1), 1000);
            } else {
                if (response.status === 403) throw new Error('Access Denied');
                throw new Error('Failed to update record');
            }
        } catch (error) {
            console.error(error);
            if (error.message === 'Access Denied') {
                toast.error("Access Denied. You do not have permission to edit records.", { id: toastId });
            } else {
                toast.error("Error updating record. Please try again.", { id: toastId });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-[1000px] mx-auto font-sans transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 text-center flex flex-col items-center">
                <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center justify-center gap-2">
                    <ShoppingCart size={28} /> Edit Local Sale Record
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously issued product details</p>
                
                {/* --- DATE & EDITOR NAME BADGE --- */}
                <div className="mt-4 flex flex-col items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-zinc-800 rounded-full border border-teal-100 dark:border-teal-900/50 shadow-sm transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Record Date:</span>
                        <span className="text-sm font-black text-[#0d9488] dark:text-teal-400">{formData.date}</span>
                    </div>
                    {recordData && (recordData.updatedBy || recordData.editedBy || recordData.username) && (
                        <div className="inline-flex items-center px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-full border border-teal-200 dark:border-teal-800/50 transition-colors">
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                Last Edited By: {recordData.updatedBy || recordData.editedBy || recordData.username}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 transition-colors duration-300">
                <form onSubmit={handleSubmit}>
                    
                    <div className="mb-6 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-6">
                        <div className="w-full md:w-1/2">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={16} className="text-[#0d9488]"/> Date
                            </label>
                            <input 
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        
                        <button 
                            type="button"
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    <div className="mb-8 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-500 flex items-center gap-2">
                                <Package size={20} /> Products Issued
                            </h3>
                            <button 
                                type="button" 
                                onClick={handleAddItemRow}
                                className="text-sm font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-800/60 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <PlusCircle size={16} /> Add Product
                            </button>
                        </div>

                        <div className="space-y-6">
                            {itemsList.map((row) => (
                                <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-teal-100 dark:border-teal-900/40 shadow-sm">
                                    
                                    {itemsList.length > 1 && (
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveItemRow(row.id)}
                                            className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        
                                        {/* Custom Product Autocomplete Input */}
                                        <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[row.id] = el}>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                <Tag size={12} className="text-[#0d9488] dark:text-teal-400"/> Product
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="Type or select..."
                                                value={row.product}
                                                onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                onFocus={() => setOpenDropdownId(row.id)}
                                                required
                                                className={`w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'}`}
                                            />
                                            
                                            {/* Dropdown Menu */}
                                            {openDropdownId === row.id && (
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
                                                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                                        >
                                                            <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Pack Size Input */}
                                        <div className="lg:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Pack Size (Kg)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                min="0"
                                                value={row.packSizeKg} 
                                                onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)}
                                                onWheel={(e) => e.target.blur()} 
                                                required 
                                                className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                            />
                                        </div>

                                        {/* Number of Boxes Input */}
                                        <div className="lg:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">No. of Box/Packs</label>
                                            <input 
                                                type="number" 
                                                step="1"
                                                min="0"
                                                value={row.numberOfBoxes} 
                                                onChange={(e) => handleItemChange(row.id, 'numberOfBoxes', e.target.value)}
                                                onWheel={(e) => e.target.blur()} 
                                                required 
                                                className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                            />
                                        </div>

                                        {/* Auto-Calculated Total Qty */}
                                        <div className="lg:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                Qty (Kg) <Weight size={12} className="text-[#0d9488] dark:text-teal-400"/>
                                            </label>
                                            <div className="w-full p-2.5 border border-teal-300 dark:border-teal-700/50 bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 font-bold rounded-md text-center transition-colors">
                                                {(Number(row.packSizeKg) * Number(row.numberOfBoxes)) > 0 
                                                    ? (Number(row.packSizeKg) * Number(row.numberOfBoxes)).toFixed(2) 
                                                    : "0.00"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
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

                    <div className="flex gap-4 mt-6">
                        <button 
                            type="button" 
                            onClick={() => navigate(-1)}
                            className="w-1/3 py-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-zinc-800 font-bold hover:bg-gray-300 dark:hover:bg-zinc-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-2/3 py-4 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                isSaving 
                                ? 'bg-teal-400 dark:bg-teal-800 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-[#0d9488]/40 hover:-translate-y-1'
                            }`}
                        >
                            <Save size={20} /> {isSaving ? "Updating..." : "Update Record"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}