import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { PlusCircle, Save, Calendar, FileText, Truck, Box, X, Hash, PackagePlus, ArrowLeft, Leaf, Layers } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

const RAW_MATERIALS = [
   "Bag-200g half bag 13*18.5",
    "Bag - A/T Diamond B/T",
    "Bag - A/T Diamond G/T",
    "Bag-BOPF 100G",
    "Bag - BOPF 200G",
    "Bag - BOPF 400G",
    "Bag - Black (not Transparent) - 12*20",
    "Bag - Black (not Transparent) - 14*20",
    "Bag - Black (not Transparent) - 16*24",
    "Bag - Black (not Transparent) - 18*26",
    "Bag - Black (not Transparent) - 20*30",
    "Bag - Black (Transparent) - 14*20",
    "Bag - Black (Transparent) - 15*22",
    "Bag - Black (Transparent) - 16*24",
    "Bag - Black (Transparent) - 18*26",
    "Bag - Black (Transparent) - 20*30",
    "Bag-Black-10 15",
    "Bag - Black T/B",
    "Bag - Black T/B (Welfare)",
    "Bag - Black colour - 16*24 (BOPF SP 400G)",
    "Bag - Black colour - 18*28",
    "Bag - Blue colour - 18*15",
    "Bag-Cloth Bag 100g - BOP",
    "Bag-Cloth Bag 100g - OP",
    "Bag-Cloth Bag 100g - OP1",
    "Bag-Cloth Bag 100g - OPA",
    "Bag-Cloth Bag 100g - PEKОЕ",
    "Bag - G/T 25",
    "Bag - Golden (light) - 14*20",
    "Bag Golden (light) - 15*22",
    "Bag - Golden (light) - 16*24",
    "Bag - Golden (light) - 2618*",
    "Bag - Golden (light) - Drinking tea bag",
    "Bag - Golden (transparent on both side) - 28*18",
    "Bag - Golden Transparent (Dark) - 15*21",
    "Bag - Golden Transparent (Dark) - 2416*",
    "Bag - Golden colour (dark) - 16*24",
    "Bag - Golden colour (dark) - 19.512*",
    "Bag - Golden colour - 14*24",
    "Bag - Golden colour - 15*32.5",
    "Bag - Golden colour - 16*24",
    "Bag - Golden tips (fully transparent - 1015*",
    "Bag - Golden tips (fully transparent - 12*19.5",
    "Bag - Golden tips (fully transparent - 20.512*",
    "Bag - Golden zip bag (-13*20 (FF EX sp)",
    "Bag - Golden zip bag (-9*18 (40)",
    "Bag - Golden zip bag (transparent on both side) - 18*24",
    "Bag Golder colour 13 26.5",
    "Bag - Golder colour - 23*9",
    "Bag Green (transparent on both side) - 24*14",
    "Bag - Green (transparent on both side) - 24*15",
    "Bag - Green (transparent on both side) - 28*18",
    "Bag - Green T/B (welfare)",
    "Bag - Green colour infront transparent - 10*15",
    "Bag - Green colour infront transparent - 12 *19",
    "Bag - Green colour infront transparent - 15*22",
    "Bag - Green colour infront transparent - 18* 26",
    "Bag - Green colour infront transparent - 20\" 14",
    "Bag - Green colour infront transparent - 30\" 20",
    "Bag - Green colour infront transparent-913",
    "Bag-OP (E/L) 200g",
    "Bag-OP1 (E/L) 200g",
    "Bag-OPA (E/L) 200g",
    "Bag-Paper bag - 11*18",
    "Bag - Paper bag - 12 19.5",
    "Bag-Paper bag - 13*26",
    "Bag - Paper bag - 14*20",
    "Bag - Paper bag - 19.5*12",
    "Bag - Paper bag - 22*16",
    "Bag - Paper bag - 23*35",
    "Bag - Paper bag - 25*18",
    "Bag - Paper bag - Sample bag",
    "Bag - PeKoe (E/L) 200g",
    "Bag-Pink-10*15",
    "Bag-Pink-10*20",
    "Bag - Pitigala 200g",
    "Bag - Pitigala 400g",
    "Bag - Pitigala T/B 100",
    "Bag - Pitigala T/B 25",
    "Bag - Purple Colour (dark) - 1015*",
    "Bag - Purple Colour (dark) - 12*20",
    "Bag - Purple Colour (dark) - 13*9",
    "Bag - Purple Colour (dark) - 14*20",
    "Bag - Purple Colour (dark) - 22*15",
    "Bag - Purple Colour (dark) - 2416*",
    "Bag - Purple Colour (dark) - 26*18",
    "Bag - Purple Colour (dark) - 30*20",
    "Bag - Purple Colour (light) - 14.5*9.5",
    "Bag - Red (infront transparent) - 10*15",
    "Bag-Red (infront transparent) - 1219.5*",
    "Bag - Red (infront transparent) - 13*9",
    "Bag - Red (infront transparent) - 14*20",
    "Bag - Red (infront transparent) - 15 21.5",
    "Bag - Red (infront transparent) - 16*24",
    "Bag-Red (infront transparent) - 18*26",
    "Bag - Red (infront transparent) - 30*20",
    "Bag-Red-10*15",
    "Bag - Silver (fully Transparent) - 14*20",
    "Bag - Silver (infront Transparent) - 14*20",
    "Bag - Silver zip bag (silver tips 40g) - 9*18",
    "Bag - Silver zip bag (Premium 200g) - 13*20",
    "Bag - Silver zip bag - 15*32.5",
    "Bag - Transparent/Azlfoil (vacum) - 1015.5*",
    "Bag - Transparent /Azlfoil (vacum) - 13.5 13.8",
    "Bag - Transparent /Azifoil (vacum) - 14*21",
    "Bag - Transparent/Azifoil (vacum) - 14*22.5",
    "Bag - Transparent /Azlfoil (vacum) - 14.5*20",
    "Bag - Transparent/Azlfoil (vacum) - 15*22",
    "Bag - Transparent /Azlfoil (vacum) - 16*24",
    "Bag - Transparent/Azifoil (vacum) - 16.5*27",
    "Bag - Transparent/Azifoil (vacum) - 18.513.5*",
    "Bag - Transparent /Azlfoil (vacum) - 26.517.5*",
    "Bag - Transparent/Azlfoil (vacum) - 29.8*22",
    "Bag - Transparent /Azlfoil (vacum) - 8.513.5*",
    "Bag - Transparent/Azlfoil (vacum) - 9.8*8",
    "Bag - White (Not Transparent) - 10*15",
    "Bag - White (Not Transparent) - 2416*",
    "Bag - White Zip bag - 13 20 (Bop)",
    "Bag - White Zip bag - 9*18 (Pekoe 100g)",
    "Bag - White colour (transparent) - 16*23.5",
    "Bag - White infront transparent - 10*15",
    "Bag - White infront transparent - 12*20",
    "Bag - White infront transparent - 14*20",
    "Bag-White infront transparent - 16*24",
    "Bag - White infront transparent - 18*26",
    "Bag - White infront transparent - 20 30",
    "Bag - White infront transparent - 22*15",
    "Bag - Yellow Infront Transparent - 9*13",
    "Bag-orange (infront transparent) - 9*13",
    "Bag-white (Transparent on both side) - 14*24",
    "Bag-white (Transparent on both side) - 16*24",
    "Bag-white (Transparent on both side) - 18*28",
    "Sticker - B/T Lemongrass 100g",
    "Sticker - BOP 200g",
    "Sticker - BOPF 100g",
    "Sticker - BOPF 200g",
    "Sticker - BOPF 400g",
    "Sticker - BOPF SP 200g",
    "Sticker - BOPF SP 400g",
    "Sticker Bop 150g",
    "Sticker - Ceylon premium 125g",
    "Sticker - Chakra 25g",
    "Sticker - Cinnamon 100g",
    "Sticker - Earl grey 100g",
    "Sticker - English Afternoon 125g",
    "Sticker - English Breakfast 125g",
    "Sticker - FBOP 150g",
    "Sticker - FF EX SP 150g",
    "Sticker - FF SP 125g",
    "Sticker G/T Lemongrass 100g",
    "Sticker Gift Pack",
    "Sticker - Golden Tips 40g",
    "Sticker - Golden Tips 80g",
    "Sticker Golden tips 20g",
    "Sticker Green tea 200g",
    "Sticker - Masala 100g",
    "Sticker - OP 200g",
    "Sticker - OP1 200g",
    "Sticker - OPA 200g",
    "Sticker - OPA 50g",
    "Sticker - Pekoe 200g",
    "Sticker - Premium 200g",
    "Sticker - Premium 400g",
    "Sticker - Silver Tips 20g",
    "Sticker - Silver Tips 40g",
    "Sticker Vita glow 25g",
    "Sticker - White tea 25g",
    "Sticker pekoe 100g",
    "Stickers - Ginger 100g",
    "Stickers - Silver tips 80g"
];
// Flavors list for Autocomplete
const FLAVOR_NAMES = [
    "Cinnamon", "Chakra", "Ginger", "Masala", "Vanilla", "Mint", 
    "Moringa", "Curry Leaves", "Gotukola", "Heen Bovitiya", "Cardamom", 
    "Rose", "Strawberry", "Peach", "Mix Fruit", "Pineapple", "Mango", 
    "Honey", "Earl Grey", "Lime", "Soursop", "Jasmine", "Flower", "Turmeric", "Black Pepper", "Nutmeg","Vasavasi", "Karabunati"
];

const UNITS = ["kg", "pcs", "rolls", "bundles", "boxes", "meters"];

export default function EditRawMaterialIn() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();
    
    const [showSpinner, setShowSpinner] = useState(false);
    const [recordId, setRecordId] = useState(null);

    // Type state (flavor | other)
    const [entryType, setEntryType] = useState('other');

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
            navigate('/packing/raw-material-view'); 
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

        
        let initialType = 'other';
        if (recordData.itemsArray && recordData.itemsArray.length > 0) {
            const firstItem = recordData.itemsArray[0];
            if (firstItem.category === 'flavor') {
                initialType = 'flavor';
            } else if (FLAVOR_NAMES.some(f => (firstItem.materialName || '').toLowerCase().includes(f.toLowerCase()))) {
                initialType = 'flavor';
            }
        }
        setEntryType(initialType);

        if (recordData.itemsArray && recordData.itemsArray.length > 0) {
            setItemsList(recordData.itemsArray.map((item, index) => ({
                id: Date.now() + index, 
                materialName: item.materialName,
                quantity: item.quantity,
                unit: initialType === 'flavor' ? 'kg' : (item.unit || 'pcs')
            })));
        } else {
            setItemsList([{ id: Date.now(), materialName: '', quantity: '', unit: initialType === 'flavor' ? 'kg' : 'pcs' }]);
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

    const handleTypeChange = (e) => {
        const val = e.target.value;
        setEntryType(val);
        // Ensure units are switched to kg if changed to flavor
        setItemsList(itemsList.map(item => ({
            ...item,
            unit: val === 'flavor' ? 'kg' : item.unit
        })));
    };

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), materialName: '', quantity: '', unit: entryType === 'flavor' ? 'kg' : 'pcs' }]);
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
            const editorName = localStorage.getItem('userName') || 
                                localStorage.getItem('username') || 
                                localStorage.getItem('user_name') || 
                                'Unknown'; 

            const payload = {
                date: formData.date,
                invoiceNo: formData.invoiceNo,
                supplierName: formData.supplierName,
                remarks: formData.remarks,
                editorName: editorName, 
                items: itemsList.map(item => ({
                    materialName: item.materialName,
                    quantity: Number(item.quantity),
                    unit: entryType === 'flavor' ? 'kg' : item.unit,
                    category: entryType // Send the correct category back to DB
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

    const currentAutocompleteList = entryType === 'flavor' ? FLAVOR_NAMES : RAW_MATERIALS;

    return (
        <div className="p-4 sm:p-8 max-w-[1000px] mx-auto font-sans  dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackagePlus size={28} /> Edit Record
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update incoming packaging and raw material details</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-[#f0fdfa] dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 font-bold shadow-sm">
                    <ArrowLeft size={16} /> Back to View
                </button>
            </div>
            
            <form onSubmit={handleUpdate} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-[#99f6e4] dark:border-zinc-800 transition-colors duration-300">
                
                {/* --- ENTRY TYPE SELECTOR --- */}
                <div className="mb-8 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Select Category</label>
                    <div className="flex flex-wrap gap-4">
                        <label className={`flex items-center gap-2 px-5 py-3 rounded-lg border-2 cursor-pointer transition-all ${entryType === 'flavor' ? 'border-[#0d9488] bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 shadow-sm' : 'border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                            <input type="radio" name="entryType" value="flavor" checked={entryType === 'flavor'} onChange={handleTypeChange} className="hidden" />
                            <Leaf size={20} className={entryType === 'flavor' ? 'animate-pulse' : ''} /> 
                            <span className="font-bold">Spicy  (Kg Only)</span>
                        </label>
                        <label className={`flex items-center gap-2 px-5 py-3 rounded-lg border-2 cursor-pointer transition-all ${entryType === 'other' ? 'border-[#0d9488] bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 shadow-sm' : 'border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                            <input type="radio" name="entryType" value="other" checked={entryType === 'other'} onChange={handleTypeChange} className="hidden" />
                            <Box size={20} /> 
                            <span className="font-bold">Other Raw Materials</span>
                        </label>
                    </div>
                </div>

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
                            <Layers size={20} /> {entryType === 'flavor' ? 'Spicy Received' : 'Materials Received'}
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
                                            {entryType === 'flavor' ? <Leaf size={12} className="text-[#0d9488]"/> : <Box size={12} className="text-[#0d9488]"/>} 
                                            {entryType === 'flavor' ? 'Spicy Name' : 'Material Name'}
                                        </label>
                                        <input 
                                            type="text" placeholder="Type or Select..." value={row.materialName} 
                                            onChange={(e) => handleItemChange(row.id, 'materialName', e.target.value)}
                                            onFocus={() => setOpenDropdownId(`mat-${row.id}`)} required
                                            className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                                        />
                                        {openDropdownId === `mat-${row.id}` && (
                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                {currentAutocompleteList.filter(m => m.toLowerCase().includes(row.materialName.toLowerCase())).map((mat, idx) => (
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
                                        <input type="number" step="any" min="0" value={row.quantity} onChange={(e) => handleItemChange(row.id, 'quantity', e.target.value)} onWheel={(e) => e.target.blur()} required placeholder={entryType === 'flavor' ? "e.g. 50" : "e.g. 5000"} className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                    </div>

                                    {/* Unit */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Unit</label>
                                        {entryType === 'flavor' ? (
                                            <input 
                                                type="text" 
                                                value="kg" 
                                                disabled 
                                                className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md bg-teal-50 dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 font-bold cursor-not-allowed transition-colors text-center" 
                                            />
                                        ) : (
                                            <select value={row.unit} onChange={(e) => handleItemChange(row.id, 'unit', e.target.value)} className="w-full p-2.5 border border-[#99f6e4] dark:border-teal-800/50 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors cursor-pointer">
                                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex justify-end w-full">
                        <button type="button" onClick={handleAddItemRow} className="mt-4 text-sm font-bold bg-[#f0fdfa] hover:bg-[#99f6e4]/50 dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto border border-[#99f6e4] dark:border-transparent">
                            <PlusCircle size={16} /> {entryType === 'flavor' ? 'Add Another Spicy' : 'Add Another Material'}
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