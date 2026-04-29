import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Trash2, ListChecks, Save, Package, ShoppingCart, Calendar, Weight, Tag, X, Calculator, AlertTriangle, ArrowRight, Box, Layers } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

// --- FLAVORED TEAS THAT REQUIRE RAW MATERIAL DEDUCTION (3%) ---
const FLAVORED_TEAS_WITH_RM = [
    "cinnamon tea - bopf",
    "ginger tea - bopf",
    "masala tea - bopf",
    "pineapple tea",
    "soursop - bopf",
    "ginger tea - bopf sp",
    "cinnamon tea - bopf sp",
    "masala tea - bopf sp",
    "vanilla",
    "mint - bopf sp",
    "moringa - bopf sp",
    "curry leaves - bopf sp",
    "gotukola - bopf sp",
    "heen bovitiya - bopf sp"
];

// Common Raw Materials list for Autocomplete
const RAW_MATERIALS = [
    "50g Silver Pouch", "100g Gold Pouch", "200g Printed Box", "500g Printed Box",
    "Master Carton (Large)", "Master Carton (Small)", "Barcode Labels", 
    "Packing Tape (Brown)", "Packing Tape (Clear)", "Glue Bottle", 
    "Tea Bags Filter Paper", "Cotton Thread", "Inner Polybag"
];

// --- LOGIC: BASE TEA MAPPING ---
export const getBaseTeaGrade = (productName) => {
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

// --- COLORS ---
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('premium') || p.includes('supreme') || p.includes('gift')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awrudu') || p.includes('awurudu')) return 'bg-[#c084fc] text-white border-purple-500'; 
    if (p.includes('chakra') || p.includes('flower')) return 'bg-[#e0e7ff] text-indigo-900 border-indigo-400';
    if (p.includes('slim beauty')) return 'bg-[#ccfbf1] text-teal-900 border-teal-400';
    if (p.includes('vita glow')) return 'bg-[#fef08a] text-yellow-900 border-yellow-400';
    if (p.includes('heen bovitiya')) return 'bg-[#fdf4ff] text-fuchsia-900 border-fuchsia-400';
    if (p.includes('rose') || p.includes('hibiscus') || p.includes('strawberry') || p.includes('mix fruit') || p.includes('pink')) return 'bg-[#fbcfe8] text-pink-900 border-pink-400';
    if (p.includes('peach') || p.includes('orange')) return 'bg-[#fed7aa] text-orange-900 border-orange-400';
    if (p.includes('pineapple') || p.includes('mango') || p.includes('honey') || p.includes('ginger') || p.includes('golden') || p.includes('turmeric')) return 'bg-[#fef08a] text-yellow-900 border-yellow-500';
    if (p.includes('jasmine') || p.includes('vanilla')) return 'bg-[#fef9c3] text-yellow-800 border-yellow-300';
    if (p.includes('cinnamon') || p.includes('masala') || p.includes('chest') || p.includes('carmel') || p.includes('cardamom')) return 'bg-[#ffedd5] text-amber-900 border-amber-400';
    if (p.includes('earl grey')) return 'bg-[#f1f5f9] text-slate-700 border-slate-400';
    if (p.includes('mint')) return 'bg-[#ccfbf1] text-teal-900 border-teal-400';
    if (p.includes('lime')) return 'bg-[#ecfccb] text-lime-900 border-lime-400';
    if (p.includes('moringa') || p.includes('curry') || p.includes('gotukola')) return 'bg-[#d1fae5] text-emerald-900 border-emerald-400';
    if (p.includes('soursop') || p.includes('lemongrass') || p.includes('green')) return 'bg-[#bbf7d0] text-green-900 border-green-400';
    if (p.includes('purple')) return 'bg-[#e9d5ff] text-purple-900 border-purple-400'; 
    if (p.includes('silver')) return 'bg-[#e2e8f0] text-slate-800 border-slate-400';
    if (p.includes('white')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (p.includes('black')) return 'bg-[#374151] text-white border-gray-700';
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p.includes('bopf')) return 'bg-[#fde047] text-yellow-900 border-yellow-500'; 
    if (p.includes('dust 1')) return 'bg-[#06b6d4] text-white border-cyan-500'; 
    if (p.includes('dust')) return 'bg-[#3b82f6] text-white border-blue-600'; 
    if (p.includes('bop') || p.includes('pekoe') || p.includes('op') || p.includes('ff') || p.includes('english')) return 'bg-[#ffedd5] text-amber-900 border-amber-500';
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

const TEA_TYPES = [
    "Lemongrass - BOPF", "Lemongrass - Green Tea", "BOP", "Pekoe", "Rose Tea", "English Breakfast", "Pink Tea", "Ceylon Premium - FF ", "Ceylon Supreme", "Cinnamon Tea - BOPF SP", "Cinnamon Tea - BOPF", "Ginger Tea - BOPF SP", "Ginger Tea - BOPF", "Silver Tips", "Golden Tips", "OPA", "OP", "OP 1", "FF EX SP", "Masala Tea - BOPF", "Masala Tea - BOPF SP", "Pineapple Tea", "Mix Fruit", "Peach", "Strawberry", "Jasmin - Green Tea", "Jasmin - BOPF", "Mango Tea", "Carmel", "Honey", "Vanilla", "Earl Grey", "Hibiscus", "Mint - Green Tea", "Mint - BOPF SP", "Lime", "Soursop - Green Tea", "Soursop - BOPF", "White Tea", "Purple Tea", "Slim Beauty", "Vita Glow", "Silver Green", "FBOP", "Moringa - BOPF SP", "Moringa - Green Tea", "Curry Leaves - BOPF SP", "Curry Leaves - Green Tea", "Heen Bovitiya - BOPF SP", "Heen Bovitiya - Green Tea", "Gotukola - BOPF SP", "Gotukola", "Flower", "Chakra", "Green Tea - Other", "Gift Pack", "Premium", "Cardamom", "English Afternoon", "Green Tea T/B", "Black Tea T/B", "Black Pepper", "Cinnamon Stick", "Turmeric"
];

const PACKAGING_TYPES = [
    "E/L Pack", "Pack", "Box", "Chest box", "Cloth bag", 
    "Paper can", "Wooden box", "Wooden cylinder", "Tin"
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
    if (p.includes('guide issue-bopf')) return ["0.2"];
    return null; 
};

export default function TeaCenterRecordEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [showSpinner, setShowSpinner] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    
    // --- STOCKS STATES ---
    const [availableTeaStock, setAvailableTeaStock] = useState([]);
    const [availableRawStock, setAvailableRawStock] = useState([]);
    
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0] });
    
    const [itemsList, setItemsList] = useState([{ 
        id: Date.now(), 
        product: '', 
        type: '', 
        packSizeKg: '', 
        numberOfBoxes: '', 
        rawMaterialName: '', // NEW FIELD
        rawMaterialWeight: '' 
    }]);

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
        const fetchStocks = async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Fetch both Tea Stock AND Raw Material Stock simultaneously
                const [teaRes, rmRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/packing-stock`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${BACKEND_URL}/api/raw-materials-in/stock`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false }))
                ]);

                // Process Tea Stock
                if (teaRes.ok) {
                    const data = await teaRes.json();
                    const aggregatedData = Object.values(data.reduce((acc, curr) => {
                        if (!acc[curr.productName]) {
                            acc[curr.productName] = { productName: curr.productName, bulkStockKg: 0 };
                        }
                        if (curr.stockBySource && curr.stockBySource.length > 0) {
                            const sourceTotal = curr.stockBySource.reduce((sum, src) => sum + (src.quantityKg || 0), 0);
                            acc[curr.productName].bulkStockKg += sourceTotal;
                        } else {
                            acc[curr.productName].bulkStockKg += (curr.bulkStockKg || 0);
                        }
                        return acc;
                    }, {}));
                    setAvailableTeaStock(aggregatedData);
                }

                // Process Raw Material Stock
                if (rmRes.ok) {
                    const rmData = await rmRes.json();
                    setAvailableRawStock(Array.isArray(rmData.data || rmData) ? (rmData.data || rmData) : []);
                }
            } catch (error) {
                console.error("Error fetching stocks:", error);
            }
        };
        fetchStocks();
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

    const totalAvailableTeaCapacity = availableTeaStock.reduce((sum, item) => sum + (item.bulkStockKg || 0), 0);
    const totalAvailableRMCapacity = availableRawStock.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', rawMaterialName: '', rawMaterialWeight: '' }]);
    };

    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };

    const handleItemChange = (id, field, value) => {
        if (field !== 'product' && field !== 'type' && field !== 'rawMaterialName' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        
        setItemsList(itemsList.map(row => {
            if (row.id === id) {
                let newRow = { ...row, [field]: value };
                
                if (field === 'product') {
                    const availableSizes = getPackSizes(value);
                    if (availableSizes && !availableSizes.includes(row.packSizeKg)) {
                        newRow.packSizeKg = '';
                    }
                }

                if (['product', 'packSizeKg', 'numberOfBoxes'].includes(field)) {
                    const prod = (field === 'product' ? value : newRow.product) || '';
                    const isFlavored = FLAVORED_TEAS_WITH_RM.includes(prod.toLowerCase().trim());
                    
                    if (isFlavored) {
                        const packSize = Number(field === 'packSizeKg' ? value : newRow.packSizeKg) || 0;
                        const boxCount = Number(field === 'numberOfBoxes' ? value : newRow.numberOfBoxes) || 0;
                        const totalWeight = packSize * boxCount;
                        
                        if (totalWeight > 0) {
                            newRow.rawMaterialWeight = (totalWeight * 0.03).toFixed(3);
                        } else {
                            newRow.rawMaterialWeight = '';
                        }
                    } else {
                        newRow.rawMaterialWeight = '';
                        newRow.rawMaterialName = ''; // Reset name if not flavored
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

    const handleAddToList = (e) => {
        e.preventDefault();
        const hasEmptyItem = itemsList.some(row => {
            const isFlavored = FLAVORED_TEAS_WITH_RM.includes(row.product?.toLowerCase()?.trim());
            // If flavored, require raw material name. Otherwise just product, type, size, boxes.
            if (isFlavored) {
                return !row.product || !row.type || row.packSizeKg === '' || row.numberOfBoxes === '' || !row.rawMaterialName;
            }
            return !row.product || !row.type || row.packSizeKg === '' || row.numberOfBoxes === '';
        });

        if (hasEmptyItem) {
            toast.error("Please fill out all required details (including Raw Material Name for flavored teas)!");
            return;
        }

        const newRecord = { 
            date: formData.date,
            items: itemsList.map(item => {
                const total = Number(item.packSizeKg) * Number(item.numberOfBoxes);
                const isFlavored = FLAVORED_TEAS_WITH_RM.includes(item.product?.toLowerCase()?.trim());
                
                const rawMatQty = isFlavored ? (item.rawMaterialWeight !== '' ? Number(item.rawMaterialWeight) : (total * 0.03)) : 0;
                const baseTeaQty = total - rawMatQty;

                return {
                    ...item,
                    calculatedQtyKg: total.toFixed(3),
                    baseTeaQtyKg: baseTeaQty.toFixed(3),
                    rawMaterialQtyKg: rawMatQty.toFixed(3)
                }
            }),
            totalBoxes,
            totalQtyKg
        };

        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`Record added to list!`);
        setItemsList([{ id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', rawMaterialName: '', rawMaterialWeight: '' }]);
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

        let stockWarning = false;
        let rmStockWarning = false;

        const requestedByBaseGrade = {};
        const requestedRM = {};
        
        pendingRecords.forEach(record => {
            record.items.forEach(item => {
                // Tea Warning Check
                const baseGrade = getBaseTeaGrade(item.product);
                if (!requestedByBaseGrade[baseGrade]) requestedByBaseGrade[baseGrade] = 0;
                requestedByBaseGrade[baseGrade] += Number(item.baseTeaQtyKg); 

                // Raw Material Warning Check
                if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
                    if (!requestedRM[item.rawMaterialName]) requestedRM[item.rawMaterialName] = 0;
                    requestedRM[item.rawMaterialName] += Number(item.rawMaterialQtyKg);
                }
            });
        });

        // Check Tea
        for (const [baseGrade, requestedQty] of Object.entries(requestedByBaseGrade)) {
            const stockData = availableTeaStock.find(s => s.productName === baseGrade);
            const available = stockData ? stockData.bulkStockKg : 0;
            if (requestedQty > available) {
                stockWarning = true;
                break;
            }
        }

        // Check RM
        for (const [rmName, requestedQty] of Object.entries(requestedRM)) {
            const rmStockData = availableRawStock.find(s => s.materialName === rmName);
            const available = rmStockData ? rmStockData.totalQuantity : 0;
            if (requestedQty > available) {
                rmStockWarning = true;
                break;
            }
        }

        if (stockWarning) {
            if(!window.confirm("You are issuing MORE stock than what is currently available across the base tea grades. Do you want to proceed anyway?")) {
                return;
            }
        }

        if (rmStockWarning) {
            if(!window.confirm("You are issuing MORE raw materials than currently available in stock. Do you want to proceed anyway?")) {
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
                    issueItems: record.items.map(item => ({
                        product: item.product,
                        type: item.type,
                        packSizeKg: Number(item.packSizeKg),
                        numberOfBoxes: Number(item.numberOfBoxes),
                        totalQtyKg: Number(item.calculatedQtyKg),
                        baseTeaQtyKg: Number(item.baseTeaQtyKg), 
                        rawMaterialName: item.rawMaterialName || "", // ADDED THIS
                        rawMaterialQtyKg: Number(item.rawMaterialQtyKg)
                    }))
                };

                return fetch(`${BACKEND_URL}/api/tea-center-issues`, {
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

            toast.success("All Tea Center records saved successfully!", { id: toastId });
            setPendingRecords([]);
            
            setTimeout(() => {
                navigate('/packing/tea-center-record-view'); 
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
            
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400">Tea Center Issue Record Entry</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Issue record for daily product dispatch/packing</p>
                </div>
            </div>
            
            {/* --- AVAILABLE STOCKS (SIDE BY SIDE GRID) --- */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                
                {/* 1. TEA STOCK CONTAINER */}
                <div className="rounded-2xl shadow-sm border border-teal-200 dark:border-teal-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
                    <div className="bg-[#2f7466] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Calculator size={20} /> Current Available Tea Stock
                            </h3>
                            <p className="text-white/80 text-xs mt-1">Base Grades. Flavored teas deduct from these.</p>
                        </div>
                        <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
                            {totalAvailableTeaCapacity.toFixed(2)} KG
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
                                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">
                                            {Number(item.bulkStockKg).toFixed(2)} <span className="text-xs font-semibold text-gray-500">kg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. RAW MATERIAL STOCK CONTAINER */}
                <div className="rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
                    <div className="bg-indigo-700 dark:bg-indigo-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Layers size={20} /> Current Available Raw Materials
                            </h3>
                            <p className="text-white/80 text-xs mt-1">Packaging materials and add-ons inventory.</p>
                        </div>
                        <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
                            {totalAvailableRMCapacity.toFixed(2)} Items
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                        {availableRawStock.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">No raw material stock available.</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {availableRawStock.map((rm, idx) => (
                                    <div key={idx} className={`border rounded-lg p-3 min-w-[120px] shadow-sm bg-white dark:bg-zinc-950 ${getMaterialColor(rm.materialName).replace('bg-', 'border-').split(' ')[2]}`}>
                                        <h4 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate max-w-[130px]" title={rm.materialName}>
                                            {rm.materialName}
                                        </h4>
                                        <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                                            {Number(rm.totalQuantity).toFixed(2)} <span className="text-xs font-semibold text-gray-500">{rm.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* --- DATA ENTRY FORM --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
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
                                    const baseGrade = getBaseTeaGrade(row.product);
                                    const stockData = availableTeaStock.find(s => s.productName === baseGrade);
                                    const availableForProduct = stockData ? stockData.bulkStockKg : 0;
                                    
                                    const isFlavoredUI = FLAVORED_TEAS_WITH_RM.includes(row.product?.toLowerCase()?.trim());
                                    
                                    const totalIssuedForBaseGradeSoFar = itemsList.reduce((sum, currentItem) => {
                                        if (getBaseTeaGrade(currentItem.product) === baseGrade) {
                                            const isFlavoredLoop = FLAVORED_TEAS_WITH_RM.includes(currentItem.product?.toLowerCase()?.trim());
                                            const total = (Number(currentItem.packSizeKg) * Number(currentItem.numberOfBoxes)) || 0;
                                            const rawMat = isFlavoredLoop ? (Number(currentItem.rawMaterialWeight) || (total * 0.03)) : 0;
                                             return sum + (total - rawMat); 
                                        }
                                        return sum;
                                    }, 0);

                                    const issuedNum = (Number(row.packSizeKg) * Number(row.numberOfBoxes)) || 0;
                                    const isOverCapacity = row.product && totalIssuedForBaseGradeSoFar > availableForProduct;
                                    const remaining = Math.max(0, availableForProduct - totalIssuedForBaseGradeSoFar);

                                    // Raw Material logic check
                                    const rmStockData = availableRawStock.find(s => s.materialName === row.rawMaterialName);
                                    const availableRM = rmStockData ? rmStockData.totalQuantity : 0;
                                    const isRMOverCapacity = isFlavoredUI && row.rawMaterialName && Number(row.rawMaterialWeight) > availableRM;

                                    return (
                                        <div key={row.id} className={`relative bg-white dark:bg-zinc-950 p-5 rounded-xl border transition-colors shadow-sm ${isOverCapacity || isRMOverCapacity ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-teal-100 dark:border-teal-900/40'}`}>
                                            
                                            {itemsList.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveItemRow(row.id)} className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10">
                                                    <X size={14} />
                                                </button>
                                            )}

                                            <div className="flex flex-col gap-4 w-full">
                                                
                                                {/* ROW 1: Product and Pack Type */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="relative" ref={el => dropdownRefs.current[`product-${row.id}`] = el}>
                                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center gap-1">
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
                                                        
                                                        {openDropdownId === `product-${row.id}` && (
                                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                                {TEA_TYPES
                                                                    .filter(tea => tea.toLowerCase().includes(row.product.toLowerCase()))
                                                                    .map((tea, idx) => (
                                                                    <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'product', tea); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2">
                                                                        <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>

                                                    <div className="relative" ref={el => dropdownRefs.current[`type-${row.id}`] = el}>
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
                                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                                {PACKAGING_TYPES
                                                                    .filter(type => type.toLowerCase().includes(row.type.toLowerCase()))
                                                                    .map((type, idx) => (
                                                                    <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'type', type); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0">
                                                                        {type}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>

                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="relative" ref={el => dropdownRefs.current[`size-${row.id}`] = el}>
                                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">Pack (Kg)</label>
                                                        <input type="number" step="any" min="0" value={row.packSizeKg} onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)} onFocus={() => { if (availableSizes) setOpenDropdownId(`size-${row.id}`); }} onWheel={(e) => e.target.blur()} required placeholder="e.g. 0.025" className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                                        
                                                        {openDropdownId === `size-${row.id}` && availableSizes && (
                                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden">
                                                                {availableSizes.map((size, idx) => (
                                                                    <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'packSizeKg', size); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0">
                                                                        {size} kg
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">Items</label>
                                                        <input type="number" step="1" min="0" value={row.numberOfBoxes} onChange={(e) => handleItemChange(row.id, 'numberOfBoxes', e.target.value)} onWheel={(e) => e.target.blur()} required placeholder="e.g. 15" className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                                    </div>
                                                 </div>

                                                {/* ROW 2: Pack Size, Items, Raw Material Name, Raw Weight */}
                                                <div className="grid grid-cols-2  gap-4">
                                                    {/* NEW: RAW MATERIAL NAME DROPDOWN */}
                                                    <div className="relative" ref={el => dropdownRefs.current[`rmName-${row.id}`] = el}>
                                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">
                                                            Raw Material
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            value={row.rawMaterialName} 
                                                            onChange={(e) => handleItemChange(row.id, 'rawMaterialName', e.target.value)} 
                                                            onFocus={() => { if(isFlavoredUI) setOpenDropdownId(`rmName-${row.id}`); }}
                                                            disabled={!isFlavoredUI}
                                                            placeholder={isFlavoredUI ? "Select..." : "N/A"} 
                                                            className={`w-full p-2.5 h-[42px] border text-sm rounded-md outline-none transition-colors 
                                                            ${!isFlavoredUI ? 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 cursor-not-allowed opacity-60' : isRMOverCapacity ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/50' : 'bg-white dark:bg-zinc-950 border-teal-200 dark:border-teal-800/50 focus:ring-2 focus:ring-[#2dd4bf]/50'}`} 
                                                        />
                                                        {openDropdownId === `rmName-${row.id}` && isFlavoredUI && (
                                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                                {RAW_MATERIALS
                                                                    .filter(rm => rm.toLowerCase().includes((row.rawMaterialName || '').toLowerCase()))
                                                                    .map((rm, idx) => (
                                                                    <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handleItemChange(row.id, 'rawMaterialName', rm); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0">
                                                                        {rm}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap" title={isFlavoredUI ? "Auto calculates to 3% for this tea" : "Not applicable for this tea"}>
                                                            RM Qty (Kg)
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            step="any" 
                                                            min="0" 
                                                            value={row.rawMaterialWeight} 
                                                            onChange={(e) => handleItemChange(row.id, 'rawMaterialWeight', e.target.value)} 
                                                            onWheel={(e) => e.target.blur()}
                                                            disabled={!isFlavoredUI}
                                                            placeholder={isFlavoredUI ? "3%" : "N/A"} 
                                                            className={`w-full p-2.5 h-[42px] border text-sm rounded-md outline-none transition-colors 
                                                            ${!isFlavoredUI ? 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 cursor-not-allowed opacity-60' : isRMOverCapacity ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/50' : 'bg-white dark:bg-zinc-950 border-teal-200 dark:border-teal-800/50 focus:ring-2 focus:ring-[#2dd4bf]/50'}`} 
                                                        />
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Bottom Details/Warning Area */}
                                            <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center min-h-[16px] gap-2">
                                                <div className="text-[10px]">
                                                    {isFlavoredUI && issuedNum > 0 && (
                                                        <span className="text-gray-500 dark:text-gray-400 font-bold bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                                            Base Tea Use: <span className="text-gray-700 dark:text-gray-300">{(issuedNum - (Number(row.rawMaterialWeight) || 0)).toFixed(3)} kg</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                                                    {row.product && (
                                                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded" title={`Base Grade: ${baseGrade}`}>
                                                            Avail {baseGrade}: <span className="text-gray-600 dark:text-gray-300">{availableForProduct.toFixed(2)}</span>
                                                        </span>
                                                    )}
                                                    {row.rawMaterialName && isFlavoredUI && (
                                                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                                            Avail {row.rawMaterialName}: <span className="text-gray-600 dark:text-gray-300">{availableRM.toFixed(2)}</span>
                                                        </span>
                                                    )}

                                                    {row.product && (
                                                        isOverCapacity ? (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                                                <AlertTriangle size={11} /> Exceeds Tea Stock!
                                                            </div>
                                                        ) : isRMOverCapacity ? (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                                                <AlertTriangle size={11} /> Exceeds RM Stock!
                                                            </div>
                                                        ) : issuedNum > 0 ? (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/20 px-2 py-1 rounded">
                                                                <ArrowRight size={11} /> Remaining Base: {remaining.toFixed(2)}kg
                                                            </div>
                                                        ) : null
                                                    )}
                                                </div>
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
                                    <Package size={16}/> Total Weight: <span className="font-bold text-lg">{totalQtyKg.toFixed(3)} Kg</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 rounded-xl text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/30 border border-[#0d9488] dark:border-teal-700 font-bold flex justify-center items-center gap-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all">
                            <PlusCircle size={20} /> Add Daily Record to List
                        </button>
                    </form>
                </div>

                {/* --- RIGHT SIDE: PENDING LIST & SUMMARY --- */}
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
                                                                    <span>{item.numberOfBoxes} {item.type} x {item.packSizeKg}kg</span>
                                                                    {Number(item.rawMaterialQtyKg) > 0 && (
                                                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-500 px-1.5 py-0.5 rounded font-bold" title={item.rawMaterialName}>
                                                                            RM: {item.rawMaterialQtyKg}kg
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-[#0d9488] w-12 text-right">{item.calculatedQtyKg} kg</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center font-bold">
                                                        <span className="text-gray-500 uppercase text-[10px]">Daily Totals:</span>
                                                        <div className="flex gap-4">
                                                            <span className="text-gray-600 dark:text-gray-300">{record.totalBoxes} Items</span>
                                                            <span className="text-[#0f766e] dark:text-teal-400">{record.totalQtyKg.toFixed(3)} Kg</span>
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
                                            <th className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">Qty (KG)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryArray.map(([prodName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-700">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-700 ${getTeaColor(prodName)}`}>{prodName}</td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{qty % 1 !== 0 ? qty.toFixed(3) : qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-600">
                                            <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-700">PENDING TOTAL</td>
                                            <td className="px-3 py-2 text-right text-[#0f766e] dark:text-teal-400">{grandPendingQty % 1 !== 0 ? grandPendingQty.toFixed(3) : grandPendingQty}</td>
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