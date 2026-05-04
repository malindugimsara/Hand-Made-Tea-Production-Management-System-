import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Save, ShoppingCart, Calendar, Weight, Tag, X, ArrowLeft, Package, Calculator, Layers, Trash2, Box, AlertTriangle, ArrowRight, Droplet } from "lucide-react"; 
import { useNavigate, useLocation } from 'react-router-dom';

// --- LOGIC: BASE TEA MAPPING ---
const getBaseTeaGrade = (productName) => {
    if (!productName) return "";
    const p = productName.toLowerCase().trim();

    const bopf = ["lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "mix fruit", "peach", "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", "guide issue-bopf"];
    const bopfSp = ["english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", "black t/b", "english afternoon"];
    const greenTea = ["lemongrass - green tea", "g/t lemangrass", "mint - green tea", "soursop - green tea", "moringa - green tea", "curry leaves - green tea", "heen bovitiya - green tea", "gotukola - green tea", "jasmin - green tea", "green tea t/b"];
    const pekoe = ["pekoe", "rose tea"];
    const ff = ["ceylon premium - ff"];
    const op = ["op", "hibiscus"];
    const fbop = ["ceylon supreme"];

    const standaloneMap = {
        "opa": "OPA", "bop": "BOP", "bop pack": "BOP", "pink tea": "Pink Tea", "pink tea can": "Pink Tea", "pink tea pack": "Pink Tea",
        "op 1": "OP 1", "op1 pack": "OP 1", "ff ex sp": "FF EX SP", "ff ex sp pack": "FF EX SP", "ff ex sp box": "FF EX SP",
        "white tea": "White Tea", "white tea can": "White Tea", "purple tea": "Purple Tea", "purple tea can": "Purple Tea",
        "purple pack": "Purple Tea", "slim beauty": "Slim Beauty", "slim beauty can": "Slim Beauty", "vita glow": "Vita Glow",
        "silver green": "Silver Green", "premium": "Premium", "ceylon premium": "FF", "black pepper": "Black Pepper",
        "black pepar": "Black Pepper", "cinnamon stick": "Cinnamon Stick", "turmeric": "Turmeric", "silver tips": "Silver Tips",
        "golden tips": "Golden Tips", "flower": "Flower", "chakra": "Chakra", "green tea": "Green Tea"
    };

    if (bopf.includes(p)) return "BOPF";
    if (bopfSp.includes(p)) return "BOPF SP";
    if (greenTea.includes(p)) return "Green Tea";
    if (pekoe.includes(p)) return "Pekoe";
    if (ff.includes(p)) return "FF";
    if (op.includes(p)) return "OP";
    if (fbop.includes(p)) return "FBOP";
    if (standaloneMap[p]) return standaloneMap[p];

    return productName; 
};

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

const getMaterialColor = (material) => {
    const m = material?.toLowerCase() || '';
    if (m.includes('pouch')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50';
    if (m.includes('box') || m.includes('carton')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50';
    if (m.includes('label') || m.includes('tape')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50';
    if (m.includes('paper') || m.includes('polybag')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50';
    if (m.includes('thread') || m.includes('glue')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50';
    return 'bg-gray-100 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700';
};

// Combined tea types
const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea bag (25)", "New edition", "Pitigala tea bags", 
    "Pitigala tea 400g",
    "Awurudu Special", "Labour drinking tea"
];

const PACKAGING_TYPES = [
    "E/L Pack", "Pack", "Box", "Chest box", "Cloth bag", 
    "Paper can", "Wooden box", "Wooden cylinder", "Tin"
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

export default function EditLocalRecord() {
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
    
    // --- STOCKS STATES FOR WARNINGS ---
    const [availableTeaStock, setAvailableTeaStock] = useState([]);
    const [availablePackingStock, setAvailablePackingStock] = useState([]); 

    const [formData, setFormData] = useState({ date: '' });
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

    // Fetch Stocks for Validation
    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const token = localStorage.getItem('token');
                
                const [teaRes, rmRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/packing-stock`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${BACKEND_URL}/api/raw-materials-in/stock`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false }))
                ]);

                if (teaRes.ok) {
                    const data = await teaRes.json();
                    const factoryAndOtherData = [];
                    data.forEach(product => {
                        let validStock = 0;
                        if (product.stockBySource && product.stockBySource.length > 0) {
                            const factoryStock = product.stockBySource.find(s => s.sourceName === 'Factory')?.quantityKg || 0;
                            const otherStock = product.stockBySource.find(s => s.sourceName === 'Other')?.quantityKg || 0;
                            validStock = factoryStock + otherStock;
                        } else {
                            if (product.source === 'Factory' || product.source === 'Other') {
                                validStock = Number(product.bulkStockKg) || 0;
                            }
                        }
                        if (validStock > 0) {
                            factoryAndOtherData.push({
                                productName: product.productName,
                                bulkStockKg: validStock 
                            });
                        }
                    });
                    setAvailableTeaStock(factoryAndOtherData);
                }

                if (rmRes.ok) {
                    const rmData = await rmRes.json();
                    const allRawMaterials = Array.isArray(rmData.data || rmData) ? (rmData.data || rmData) : [];
                    
                    const packingOnly = allRawMaterials.filter(rm => (rm.category || '').toLowerCase() !== 'flavor');
                    setAvailablePackingStock(packingOnly);
                }
            } catch (error) {
                console.error("Error fetching stocks:", error);
            }
        };
        fetchStocks();
    }, [BACKEND_URL]);

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
            
            if (recordData.salesItems && recordData.salesItems.length > 0) {
                const formattedItems = recordData.salesItems.map((item, idx) => ({
                    id: Date.now() + idx,
                    product: item.product,
                    type: item.type || '',
                    packSizeKg: item.packSizeKg,
                    numberOfBoxes: item.numberOfBoxes,
                    packingMaterials: item.packingMaterials || []
                }));
                setItemsList(formattedItems);
            } else {
                setItemsList([{ id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', packingMaterials: [] }]);
            }
        } else {
            toast.error("No record data found!");
            navigate(-1);
        }
    }, [recordData, navigate, isViewer]);

    const totalAvailableTeaCapacity = availableTeaStock.reduce((sum, item) => sum + (item.bulkStockKg || 0), 0);
    const totalAvailablePackingCapacity = availablePackingStock.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', packingMaterials: [] }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleAddPackingMaterial = (rowId) => {
        setItemsList(itemsList.map(row => {
            if (row.id === rowId) {
                return { ...row, packingMaterials: [...(row.packingMaterials || []), { name: '', qty: '' }] };
            }
            return row;
        }));
    };

    const handleRemovePackingMaterial = (rowId, pmIndex) => {
        setItemsList(itemsList.map(row => {
            if (row.id === rowId) {
                const updatedMats = [...row.packingMaterials];
                updatedMats.splice(pmIndex, 1);
                return { ...row, packingMaterials: updatedMats };
            }
            return row;
        }));
    };

    const handlePackingMaterialChange = (rowId, pmIndex, field, value) => {
        if (field === 'qty' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        setItemsList(itemsList.map(row => {
            if (row.id === rowId) {
                const updatedMats = [...row.packingMaterials];
                updatedMats[pmIndex] = { ...updatedMats[pmIndex], [field]: value };
                return { ...row, packingMaterials: updatedMats };
            }
            return row;
        }));
    };

    const handleItemChange = (id, field, value) => {
        if (field !== 'product' && field !== 'type' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(itemsList.map(row => {
            if (row.id === id) {
                let newRow = { ...row, [field]: value };
                
                if (field === 'product') {
                    const availableSizes = getPackSizes(value);
                    if (availableSizes && !availableSizes.includes(row.packSizeKg)) {
                        newRow.packSizeKg = '';
                    }
                }
                return newRow;
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

        const hasEmptyItem = itemsList.some(row => !row.product || !row.type || row.packSizeKg === '' || row.numberOfBoxes === '');
        if (hasEmptyItem) {
            toast.error("Please fill out all Product, Type, Pack Size, and Box details completely!");
            return;
        }

        // Warning Logic Calculation
        let stockWarning = false;
        let packingStockWarning = false;

        const requestedByBaseGrade = {};
        const requestedPacking = {};
        
        itemsList.forEach(item => {
            const total = Number(item.packSizeKg) * Number(item.numberOfBoxes);
            
            const baseGrade = getBaseTeaGrade(item.product);
            if (!requestedByBaseGrade[baseGrade]) requestedByBaseGrade[baseGrade] = 0;
            requestedByBaseGrade[baseGrade] += total; 

            if (item.packingMaterials && item.packingMaterials.length > 0) {
                item.packingMaterials.forEach(pm => {
                    if (pm.name && Number(pm.qty) > 0) {
                        if (!requestedPacking[pm.name]) requestedPacking[pm.name] = 0;
                        requestedPacking[pm.name] += Number(pm.qty);
                    }
                });
            }
        });

        for (const [baseGrade, requestedQty] of Object.entries(requestedByBaseGrade)) {
            const stockData = availableTeaStock.find(s => s.productName === baseGrade);
            const available = stockData ? stockData.bulkStockKg : 0;
            
            let previousQty = 0;
            recordData.salesItems.forEach(oldItem => {
                if(getBaseTeaGrade(oldItem.product) === baseGrade){
                    previousQty += (Number(oldItem.baseTeaQtyKg) || Number(oldItem.totalQtyKg) || 0);
                }
            });

            if (requestedQty > (available + previousQty)) stockWarning = true;
        }

        for (const [pmName, requestedQty] of Object.entries(requestedPacking)) {
            const pmStockData = availablePackingStock.find(s => s.materialName === pmName);
            const available = pmStockData ? pmStockData.totalQuantity : 0;
            
            let previousQty = 0;
            recordData.salesItems.forEach(oldItem => {
                if(oldItem.packingMaterials) {
                    const foundOldPM = oldItem.packingMaterials.find(pm => pm.name === pmName);
                    if(foundOldPM) previousQty += (Number(foundOldPM.qty) || 0);
                }
            });

            if (requestedQty > (available + previousQty)) packingStockWarning = true;
        }

        if (stockWarning && !window.confirm("You are issuing MORE tea stock than what is currently available in Factory & Other bulk stock. Proceed anyway?")) return;
        if (packingStockWarning && !window.confirm("You are issuing MORE packing materials than currently available in stock. Proceed anyway?")) return;

        setIsSaving(true);
        const toastId = toast.loading("Updating record...");

        const currentUsername = localStorage.getItem('username') || 'Unknown';

        const payload = {
            date: formData.date,
            totalBoxes: totalBoxes,
            totalQtyKg: totalQtyKg,
            salesItems: itemsList.map(item => {
                const total = Number(item.packSizeKg) * Number(item.numberOfBoxes);
                
                return {
                    product: item.product,
                    type: item.type,
                    packSizeKg: Number(item.packSizeKg),
                    numberOfBoxes: Number(item.numberOfBoxes),
                    totalQtyKg: Number(total.toFixed(3)),
                    baseTeaQtyKg: Number(total.toFixed(3)),
                    packingMaterials: item.packingMaterials ? item.packingMaterials.filter(pm => pm.name && Number(pm.qty) > 0) : []
                };
            }),
            updatedBy: currentUsername, 
            editorName: currentUsername 
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
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 flex flex-col items-center">
                <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                    <ShoppingCart size={28} /> Edit Local Sale Record
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously issued local product sales details</p>
                
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
            
            {/* --- AVAILABLE STOCKS (2 COLUMN GRID) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* 1. TEA STOCK CONTAINER */}
                <div className="rounded-2xl shadow-sm border border-teal-200 dark:border-teal-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
                    <div className="bg-[#2f7466] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Calculator size={20} /> Current Tea Stock
                            </h3>
                            <p className="text-white/80 text-xs mt-1">Factory & Other bulk stock</p>
                        </div>
                        <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
                            Total: {totalAvailableTeaCapacity.toFixed(2)} KG
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                        {availableTeaStock.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">No tea stock available.</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {availableTeaStock.map((item, idx) => (
                                    <div key={idx} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 min-w-[120px] shadow-sm bg-gray-50 dark:bg-zinc-800">
                                        <h4 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate max-w-[120px]" title={item.productName}>
                                            {item.productName}
                                        </h4>
                                        <div className="text-lg font-black text-[#0d9488] dark:text-teal-400">
                                            {Number(item.bulkStockKg).toFixed(2)} <span className="text-xs font-semibold text-gray-500">kg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PACKING MATERIALS STOCK CONTAINER */}
                <div className="rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
                    <div className="bg-amber-600 dark:bg-amber-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Package size={20} /> Packing Materials Stock
                            </h3>
                            <p className="text-white/80 text-xs mt-1">Available packaging inventory</p>
                        </div>
                        <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
                            Total: {totalAvailablePackingCapacity.toFixed(2)} Items
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                        {availablePackingStock.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">No packing material stock available.</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {availablePackingStock.map((rm, idx) => (
                                    <div key={idx} className={`border rounded-lg p-3 min-w-[120px] shadow-sm bg-white dark:bg-zinc-950 ${getMaterialColor(rm.materialName).replace('bg-', 'border-').split(' ')[2]}`}>
                                        <h4 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate max-w-[130px]" title={rm.materialName}>
                                            {rm.materialName}
                                        </h4>
                                        <div className="text-lg font-black text-amber-700 dark:text-amber-500">
                                            {Number(rm.totalQuantity).toFixed(2)} <span className="text-xs font-semibold text-gray-500">{rm.unit || ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg transition-colors duration-300">
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
                                <ShoppingCart size={20} /> Products Issued
                            </h3>
                        </div>

                        <div className="space-y-6">
                            {itemsList.map((row) => {
                                const availableSizes = getPackSizes(row.product);
                                const baseGrade = getBaseTeaGrade(row.product);
                                const stockData = availableTeaStock.find(s => s.productName === baseGrade);
                                const availableForProduct = stockData ? stockData.bulkStockKg : 0;
                                
                                const totalIssuedForBaseGradeSoFar = itemsList.reduce((sum, currentItem) => {
                                    if (getBaseTeaGrade(currentItem.product) === baseGrade) {
                                         return sum + ((Number(currentItem.packSizeKg) * Number(currentItem.numberOfBoxes)) || 0);
                                    }
                                    return sum;
                                }, 0);

                                const issuedNum = (Number(row.packSizeKg) * Number(row.numberOfBoxes)) || 0;
                                const isOverCapacity = row.product && totalIssuedForBaseGradeSoFar > availableForProduct;
                                const remaining = Math.max(0, availableForProduct - totalIssuedForBaseGradeSoFar);

                                return (
                                    <div key={row.id} className={`relative bg-white dark:bg-zinc-950 p-4 rounded-xl border transition-colors shadow-sm ${isOverCapacity ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-teal-100 dark:border-teal-900/40'}`}>
                                        
                                        {itemsList.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItemRow(row.id)}
                                                className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                            
                                            {/* Custom Product Autocomplete Input */}
                                            <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                    <Tag size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0d9488] dark:text-teal-400"}/> Product
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Select..."
                                                    value={row.product}
                                                    onChange={(e) => handleItemChange(row.id, 'product', e.target.value)}
                                                    onFocus={() => setOpenDropdownId(`product-${row.id}`)}
                                                    required
                                                    className={`w-full p-2.5 h-[42px] border rounded-md text-sm focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'} ${isOverCapacity ? 'border-amber-300' : 'border-teal-200 dark:border-teal-800/50'}`}
                                                />
                                                
                                                {/* Dropdown Menu */}
                                                {openDropdownId === `product-${row.id}` && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar z-20">
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
                                                                <div className={`w-3 h-3 rounded-full ${getTeaColor(tea).split(' ')[0]} border border-white/20`}></div> {tea}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Type Input */}
                                            <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`type-${row.id}`] = el}>
                                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center gap-1">
                                                    <Box size={12} className="text-[#0d9488] dark:text-teal-400"/> Pack Type
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Type..."
                                                    value={row.type}
                                                    onChange={(e) => handleItemChange(row.id, 'type', e.target.value)}
                                                    onFocus={() => setOpenDropdownId(`type-${row.id}`)}
                                                    required
                                                    className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                                                />
                                                
                                                {openDropdownId === `type-${row.id}` && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar z-20">
                                                        {PACKAGING_TYPES
                                                            .filter(type => type.toLowerCase().includes((row.type || '').toLowerCase()))
                                                            .map((type, idx) => (
                                                            <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'type', type); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0">
                                                                {type}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Dynamic Pack Size Input */}
                                            <div className="lg:col-span-1 relative" ref={el => dropdownRefs.current[`size-${row.id}`] = el}>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase whitespace-nowrap">Pack (Kg)</label>
                                                <input 
                                                    type="number" step="any" min="0"
                                                    value={row.packSizeKg} 
                                                    onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)}
                                                    onFocus={() => { if (availableSizes) setOpenDropdownId(`size-${row.id}`); }}
                                                    onWheel={(e) => e.target.blur()} required placeholder="e.g. 0.4"
                                                    className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 rounded-md text-sm focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                                
                                                {openDropdownId === `size-${row.id}` && availableSizes && (
                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden z-20">
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
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase whitespace-nowrap">No. of Items</label>
                                                <input 
                                                    type="number" step="1" min="0"
                                                    value={row.numberOfBoxes} 
                                                    onChange={(e) => handleItemChange(row.id, 'numberOfBoxes', e.target.value)}
                                                    onWheel={(e) => e.target.blur()} required placeholder="e.g. 50"
                                                    className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                />
                                            </div>

                                            {/* Auto-Calculated Total Qty */}
                                            <div className="lg:col-span-1">
                                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center justify-between gap-1">
                                                    <span>Qty (Kg) <Weight size={12} className={isOverCapacity ? "text-amber-500 inline" : "text-[#0d9488] dark:text-teal-400 inline"}/></span>
                                                    {row.product && (
                                                        <span className="text-[10px] font-bold text-gray-400" title={`Base Grade: ${baseGrade}`}>
                                                            Avail: <span className="text-gray-700 dark:text-gray-300">{availableForProduct.toFixed(2)}</span>
                                                        </span>
                                                    )}
                                                </label>
                                                <div className={`w-full p-2.5 h-[42px] border font-bold text-sm rounded-md text-center transition-colors ${isOverCapacity ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-teal-300 dark:border-teal-700/50 bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400'}`}>
                                                    {(Number(row.packSizeKg) * Number(row.numberOfBoxes)) > 0 
                                                        ? (Number(row.packSizeKg) * Number(row.numberOfBoxes)).toFixed(2) 
                                                        : "0.00"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stock Warning Messages */}
                                        <div className="mt-2 h-4">
                                            {row.product && (
                                                isOverCapacity ? (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 justify-end">
                                                        <AlertTriangle size={12} /> Exceeds '{baseGrade}' bulk stock by {(totalIssuedForBaseGradeSoFar - availableForProduct).toFixed(2)} kg!
                                                    </div>
                                                ) : issuedNum > 0 ? (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 justify-end">
                                                        <ArrowRight size={12} /> Remaining '{baseGrade}' bulk stock will be: {remaining.toFixed(2)} kg
                                                    </div>
                                                ) : null
                                            )}
                                        </div>

                                        {/* --- PACKING MATERIALS SUB-SECTION --- */}
                                        <div className="pt-4 mt-3 border-t border-gray-100 dark:border-zinc-800/50">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase flex items-center gap-1">
                                                    <Layers size={12}/> Packing Materials (Optional)
                                                </label>
                                                <button type="button" onClick={() => handleAddPackingMaterial(row.id)} className="text-[10px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded flex items-center gap-1 transition-colors font-bold shadow-sm">
                                                    <PlusCircle size={12} /> Add Material
                                                </button>
                                            </div>

                                            {row.packingMaterials && row.packingMaterials.map((pm, pmIdx) => {
                                                const pmStockData = availablePackingStock.find(s => s.materialName === pm.name);
                                                const availablePM = pmStockData ? pmStockData.totalQuantity : 0;
                                                const isPMOverCapacity = pm.name && Number(pm.qty) > availablePM;

                                                return (
                                                    <div key={pmIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3 items-end bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 relative">
                                                        <div className="md:col-span-7 relative" ref={el => dropdownRefs.current[`packingName-${row.id}-${pmIdx}`] = el}>
                                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Material Name</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Select from available stock..."
                                                                value={pm.name}
                                                                onChange={(e) => handlePackingMaterialChange(row.id, pmIdx, 'name', e.target.value)}
                                                                onFocus={() => setOpenDropdownId(`packingName-${row.id}-${pmIdx}`)}
                                                                className={`w-full p-2 h-[38px] border rounded-md text-sm outline-none transition-colors ${isPMOverCapacity ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/50 bg-white dark:bg-zinc-950' : 'bg-white dark:bg-zinc-950 dark:text-gray-100 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#2dd4bf]/50'}`}
                                                            />
                                                            
                                                            {openDropdownId === `packingName-${row.id}-${pmIdx}` && (
                                                                <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[200px] custom-scrollbar z-20">
                                                                    {availablePackingStock
                                                                        .filter(rm => rm.totalQuantity > 0 && rm.materialName.toLowerCase().includes((pm.name || '').toLowerCase()))
                                                                        .map((rm, idx) => (
                                                                        <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handlePackingMaterialChange(row.id, pmIdx, 'name', rm.materialName); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex justify-between items-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMaterialColor(rm.materialName).replace('bg-', 'border-')}`}>{rm.materialName}</span> 
                                                                            <span className="text-[10px] text-gray-500 font-semibold">{rm.totalQuantity} avail</span>
                                                                        </li>
                                                                    ))}
                                                                    {availablePackingStock.filter(rm => rm.totalQuantity > 0 && rm.materialName.toLowerCase().includes((pm.name || '').toLowerCase())).length === 0 && (
                                                                        <li className="px-4 py-2 text-xs text-red-500 italic">No available stock matches.</li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </div>

                                                        <div className="md:col-span-4">
                                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Qty</label>
                                                            <input 
                                                                type="number" 
                                                                step="any" 
                                                                min="0" 
                                                                value={pm.qty} 
                                                                onChange={(e) => handlePackingMaterialChange(row.id, pmIdx, 'qty', e.target.value)} 
                                                                onWheel={(e) => e.target.blur()} 
                                                                placeholder="Qty..." 
                                                                className={`w-full p-2 h-[38px] border text-sm rounded-md outline-none transition-colors ${isPMOverCapacity ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/50 bg-white dark:bg-zinc-950' : 'bg-white dark:bg-zinc-950 dark:text-gray-100 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#2dd4bf]/50'}`} 
                                                            />
                                                        </div>

                                                        <div className="md:col-span-1 flex justify-center mb-1">
                                                            <button type="button" onClick={() => handleRemovePackingMaterial(row.id, pmIdx)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove Material">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end w-full">
                            <button type="button" onClick={handleAddItemRow} className="mt-4 text-sm font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-800/60 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto">
                                <PlusCircle size={16} /> Add Product
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 border-t border-teal-200/50 dark:border-teal-800/30 pt-4">
                            <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300">
                                Total Items: <span className="font-bold">{totalBoxes}</span>
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