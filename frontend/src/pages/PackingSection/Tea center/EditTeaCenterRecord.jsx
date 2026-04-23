import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Save, ShoppingCart, Calendar, Weight, Tag, X, ArrowLeft, Package } from "lucide-react"; 
import { useNavigate, useLocation } from 'react-router-dom';

// Tea Center specific Colors
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('pink')) return 'bg-[#fbcfe8] text-pink-900 border-pink-400'; 
    if (p.includes('purple')) return 'bg-[#e9d5ff] text-purple-900 border-purple-400'; 
    if (p.includes('silver')) return 'bg-[#e2e8f0] text-slate-800 border-slate-400';
    if (p.includes('white')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (p.includes('golden')) return 'bg-[#fef08a] text-yellow-900 border-yellow-400';
    if (p.includes('orange')) return 'bg-[#fed7aa] text-orange-900 border-orange-400';
    if (p.includes('black')) return 'bg-[#374151] text-white border-gray-700';
    if (p.includes('lemangrass') || p.includes('green')) return 'bg-[#bbf7d0] text-green-900 border-green-400';
    if (p.includes('cinnamon') || p.includes('chest')) return 'bg-[#fed7aa] text-amber-900 border-amber-500';
    if (p.includes('turmeric')) return 'bg-[#fef08a] text-yellow-900 border-yellow-500';
    if (p.includes('premium')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awrudu')) return 'bg-[#c084fc] text-white border-purple-500'; 
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700'; 
};

// Tea Center specific products
const TEA_TYPES = [
    "Green tea", "G/T Lemangrass", "Silver tips can", "FBOP chest", 
    "FF SP chest", "FF EX SP Pack", "Cinnamon can", "OP1 pack", 
    "Silver green", "Pink tea can", "Pekoe box", "White tea can", 
    "Cinnamon pack", "Ceylon premium", "Purple tea can", "Golden tips can", 
    "Slim beauty can", "Bop pack", "Orange can", "purple pack", 
    "pink tea pack", "Black T/B", "Premium", "Cinnaamon box", 
    "FF EX SP Box", "turmeric", "Black pepar", "Masala box", 
    "Awrudu gift pack", "chakra", "flower"
];

const getPackSizes = (product) => {
    if (!product) return null;
    const p = product.toLowerCase();
    
    if (p.includes('pink tea can') || p.includes('white tea can') || p.includes('chakra') || p.includes('flower') || p.includes('black t/b')) return ["0.025"];
    if (p.includes('silver tips') || p.includes('cinnamon can') || p.includes('silver green') || p.includes('golden tips') || p.includes('slim beauty') || p.includes('turmeric') || p.includes('black pepar')) return ["0.05"];
    if (p.includes('lemangrass') || p.includes('fbop chest') || p.includes('ff sp chest') || p.includes('cinnamon pack') || p.includes('cinnaamon box') || p.includes('ff ex sp box') || p.includes('purple pack') || p.includes('masala')) return ["0.1"];
    if (p.includes('ff ex sp pack') || p.includes('bop pack')) return ["0.15"];
    if (p.includes('green tea') || p.includes('op1 pack') || p.includes('pekoe box') || p.includes('premium')) return ["0.2"];
    if (p.includes('ceylon premium')) return ["0.125"];
    if (p.includes('awrudu')) return ["0.3"];
    
    return null; 
};

export default function EditTeaCenterRecord() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const username = localStorage.getItem('username') || '';

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
            
            // Map existing items to the itemsList state (Using issueItems for Tea Center)
            if (recordData.issueItems && recordData.issueItems.length > 0) {
                const formattedItems = recordData.issueItems.map((item, idx) => ({
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
            issueItems: itemsList.map(item => ({
                product: item.product,
                packSizeKg: Number(item.packSizeKg),
                numberOfBoxes: Number(item.numberOfBoxes),
                totalQtyKg: Number((Number(item.packSizeKg) * Number(item.numberOfBoxes)).toFixed(3)) // 3 Decimals
            })),
            updatedBy: currentUsername, 
            editorName: currentUsername 
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/tea-center-issues/${recordData._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => navigate(-1), 100);
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
        <div className="p-8 max-w-[1000px] mx-auto font-sans transition-colors duration-300 min-h-screen border mt-4 border-teal-300 rounded-2xl dark:border-zinc-800">
            
            <div className="mb-8  flex flex-col items-center ">
                <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex  gap-2">
                    <ShoppingCart size={28} /> Edit Tea Center Record
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously issued product details</p>
                
                {/* --- DATE & EDITOR NAME BADGE --- */}
                <div className="mt-4 flex flex-col items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-zinc-800 rounded-full border border-teal-100 dark:border-teal-900/50 shadow-sm transition-colors">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Record Date:</span>
                        <span className="text-sm font-black text-[#0d9488] dark:text-teal-400">{formData.date}</span>
                    </div>
                    {recordData && (recordData.updatedBy || recordData.editorName || recordData.username) && (
                        <div className="inline-flex items-center px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-full border border-teal-200 dark:border-teal-800/50 transition-colors">
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                Last Edited By: {recordData.updatedBy || recordData.editorName || recordData.username}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg  transition-colors duration-300">
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
                            {itemsList.map((row) => {
                                const availableSizes = getPackSizes(row.product);

                                return (
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
                                            <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Tag size={12} className="text-[#0d9488] dark:text-teal-400"/> Product
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Type or select..."
                                                    value={row.product}
                                                    onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                    onFocus={() => setOpenDropdownId(`product-${row.id}`)}
                                                    required
                                                    className={`w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'}`}
                                                />
                                                
                                                {/* Dropdown Menu */}
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
                                                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                                            >
                                                                <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Dynamic Pack Size Input */}
                                            <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`size-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Pack Size (Kg)</label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    min="0"
                                                    value={row.packSizeKg} 
                                                    onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)}
                                                    onFocus={() => {
                                                        if (availableSizes) {
                                                            setOpenDropdownId(`size-${row.id}`);
                                                        }
                                                    }}
                                                    onWheel={(e) => e.target.blur()} 
                                                    required 
                                                    placeholder="e.g. 0.025"
                                                    className="w-full p-2.5 border border-teal-200 dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                                
                                                {/* Dropdown Menu - Display only if predefined sizes exist */}
                                                {openDropdownId === `size-${row.id}` && availableSizes && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden">
                                                        {availableSizes.map((size, idx) => (
                                                            <li 
                                                                key={idx} 
                                                                onMouseDown={(e) => e.preventDefault()} 
                                                                onClick={() => {
                                                                    handleItemChange(row.id, 'packSizeKg', size);
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0"
                                                            >
                                                                {size} kg
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
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
                                                        ? (Number(row.packSizeKg) * Number(row.numberOfBoxes)).toFixed(3) 
                                                        : "0.000"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 border-t border-teal-200/50 dark:border-teal-800/30 pt-4">
                            <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300">
                                Total Packs: <span className="font-bold">{totalBoxes}</span>
                            </div>
                            <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300 flex items-center gap-1">
                                <Package size={16}/> Total Weight: <span className="font-bold text-lg">{totalQtyKg.toFixed(3)} Kg</span>
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