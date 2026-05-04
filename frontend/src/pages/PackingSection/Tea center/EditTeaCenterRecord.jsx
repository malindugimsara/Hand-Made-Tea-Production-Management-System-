import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Save, ShoppingCart, Calendar, Weight, Tag, X, ArrowLeft, Package, Box, AlertTriangle, ArrowRight, Droplet, Layers, Trash2 } from "lucide-react"; 
import { useNavigate, useLocation } from 'react-router-dom';

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

// --- DATA LISTS ---
const FLAVORED_TEAS_WITH_RM = [
    "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "soursop - bopf",
    "ginger tea - bopf sp", "cinnamon tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp",
    "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp"
];

const FLAVOR_NAMES = [
    "Cinnamon", "Chakra", "Ginger", "Masala", "Vanilla", "Mint", 
    "Moringa", "Curry Leaves", "Gotukola", "Heen Bovitiya", "Cardamom", 
    "Rose", "Strawberry", "Peach", "Mix Fruit", "Pineapple", "Mango", 
    "Honey", "Earl Grey", "Lime", "Soursop", "Jasmine", "Flower", "Turmeric", "Black Pepper"
];

const TEA_TYPES = [
    "Green tea", "G/T Lemangrass", "Guide Issue-BOPF", "Silver tips can", "FBOP chest", 
    "FF SP chest", "FF EX SP Pack", "Cinnamon can", "OP1 pack", 
    "Silver green", "Pink tea can", "Pekoe box", "White tea can", 
    "Cinnamon pack", "Ceylon premium", "Purple tea can", "Golden tips can", 
    "Slim beauty can", "Bop pack", "Orange can", "purple pack", 
    "pink tea pack", "Black T/B", "Premium", "Cinnaamon box", 
    "FF EX SP Box", "turmeric", "Black pepar", "Masala box", 
    "Awrudu gift pack", "chakra", "flower",
    "Lemongrass - BOPF", "Cinnamon Tea - BOPF", "Ginger Tea - BOPF", "Masala Tea - BOPF", "Pineapple Tea", "Mix Fruit", "Peach", "Strawberry", "Jasmin - BOPF", "Mango Tea", "Carmel", "Honey", "Earl Grey", "Lime", "Soursop - BOPF", "Cardamom", "Gift Pack",
    "English Breakfast", "Cinnamon Tea - BOPF SP", "Ginger Tea - BOPF SP", "Masala Tea - BOPF SP", "Vanilla", "Mint - BOPF SP", "Moringa - BOPF SP", "Curry Leaves - BOPF SP", "Gotukola - BOPF SP", "Heen Bovitiya - BOPF SP", "English Afternoon",
    "Lemongrass - Green Tea", "Mint - Green Tea", "Soursop - Green Tea", "Moringa - Green Tea", "Curry Leaves - Green Tea", "Heen Bovitiya - Green Tea", "Gotukola - Green Tea", "Jasmin - Green Tea",
    "Silver Tips", "Golden Tips", "Flower", "Chakra",
    "Pekoe", "Rose Tea", "Ceylon Premium - FF", "Ceylon Premium - FF SP", "OP", "Hibiscus", "Ceylon Supreme", "FBOP",
    "OPA", "BOP", "Pink Tea", "OP 1", "FF EX SP", "White Tea", "Purple Tea", "Slim Beauty", "Vita Glow", "Silver Green", "Green Tea T/B", "Black Pepper", "Cinnamon Stick", "Turmeric"
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
    
    // --- STOCKS STATES FOR WARNINGS ---
    const [availableTeaStock, setAvailableTeaStock] = useState([]);
    const [availableRawStock, setAvailableRawStock] = useState([]); 
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
                    const aggregatedData = Object.values(data.reduce((acc, curr) => {
                        if (curr.productName.toLowerCase().includes('dust')) return acc; 
                        if (!acc[curr.productName]) acc[curr.productName] = { productName: curr.productName, bulkStockKg: 0 };
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

                if (rmRes.ok) {
                    const rmData = await rmRes.json();
                    const allRawMaterials = Array.isArray(rmData.data || rmData) ? (rmData.data || rmData) : [];
                    
                    const flavorsOnly = allRawMaterials.filter(rm => 
                        rm.category === 'flavor' || 
                        FLAVOR_NAMES.some(flavor => (rm.materialName || '').toLowerCase().includes(flavor.toLowerCase()))
                    );
                    const packingOnly = allRawMaterials.filter(rm => 
                        rm.category !== 'flavor' && 
                        !FLAVOR_NAMES.some(flavor => (rm.materialName || '').toLowerCase().includes(flavor.toLowerCase()))
                    );
                    
                    setAvailableRawStock(flavorsOnly);
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
            
            if (recordData.issueItems && recordData.issueItems.length > 0) {
                const formattedItems = recordData.issueItems.map((item, idx) => ({
                    id: Date.now() + idx,
                    product: item.product,
                    type: item.type || '',
                    packSizeKg: item.packSizeKg,
                    numberOfBoxes: item.numberOfBoxes,
                    rawMaterialName: item.rawMaterialName || '',
                    rawMaterialWeight: item.rawMaterialQtyKg || '',
                    packingMaterials: item.packingMaterials || []
                }));
                setItemsList(formattedItems);
            } else {
                setItemsList([{ id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', rawMaterialName: '', rawMaterialWeight: '', packingMaterials: [] }]);
            }
        } else {
            toast.error("No record data found!");
            navigate(-1);
        }
    }, [recordData, navigate, isViewer]);

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddItemRow = () => {
        setItemsList([...itemsList, { id: Date.now(), product: '', type: '', packSizeKg: '', numberOfBoxes: '', rawMaterialName: '', rawMaterialWeight: '', packingMaterials: [] }]);
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
                        
                        if (totalWeight > 0 && field !== 'rawMaterialWeight') {
                            newRow.rawMaterialWeight = (totalWeight * 0.03).toFixed(3);
                        } else if(totalWeight === 0) {
                            newRow.rawMaterialWeight = '';
                        }
                    } else {
                        newRow.rawMaterialWeight = '';
                        newRow.rawMaterialName = '';
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

        const hasEmptyItem = itemsList.some(row => {
            const isFlavored = FLAVORED_TEAS_WITH_RM.includes(row.product?.toLowerCase()?.trim());
            if (isFlavored) {
                return !row.product || !row.type || row.packSizeKg === '' || row.numberOfBoxes === '' || !row.rawMaterialName;
            }
            return !row.product || !row.type || row.packSizeKg === '' || row.numberOfBoxes === '';
        });

        if (hasEmptyItem) {
            toast.error("Please fill out all required details (including Flavor Name for flavored teas)!");
            return;
        }

        // Warning Logic Calculation
        let stockWarning = false;
        let rmStockWarning = false;
        let packingStockWarning = false;

        const requestedByBaseGrade = {};
        const requestedRM = {};
        const requestedPacking = {};
        
        itemsList.forEach(item => {
            const total = Number(item.packSizeKg) * Number(item.numberOfBoxes);
            const isFlavored = FLAVORED_TEAS_WITH_RM.includes(item.product?.toLowerCase()?.trim());
            const rawMatQty = isFlavored ? (item.rawMaterialWeight !== '' ? Number(item.rawMaterialWeight) : (total * 0.03)) : 0;
            const baseTeaQty = total - rawMatQty;

            const baseGrade = getBaseTeaGrade(item.product);
            if (!requestedByBaseGrade[baseGrade]) requestedByBaseGrade[baseGrade] = 0;
            requestedByBaseGrade[baseGrade] += baseTeaQty; 

            if (item.rawMaterialName && rawMatQty > 0) {
                if (!requestedRM[item.rawMaterialName]) requestedRM[item.rawMaterialName] = 0;
                requestedRM[item.rawMaterialName] += rawMatQty;
            }

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
            
            // Re-add the previous quantity of this specific record before warning check to avoid false positive
            let previousQty = 0;
            recordData.issueItems.forEach(oldItem => {
                if(getBaseTeaGrade(oldItem.product) === baseGrade){
                    previousQty += (Number(oldItem.baseTeaQtyKg) || Number(oldItem.totalQtyKg) || 0);
                }
            });

            if (requestedQty > (available + previousQty)) stockWarning = true;
        }

        if (stockWarning && !window.confirm("You are issuing MORE tea stock than what is currently available. Proceed anyway?")) return;

        setIsSaving(true);
        const toastId = toast.loading("Updating record...");

        const currentUsername = localStorage.getItem('username') || 'Unknown';

        const payload = {
            date: formData.date,
            totalBoxes: totalBoxes,
            totalQtyKg: totalQtyKg,
            issueItems: itemsList.map(item => {
                const total = Number(item.packSizeKg) * Number(item.numberOfBoxes);
                const isFlavored = FLAVORED_TEAS_WITH_RM.includes(item.product?.toLowerCase()?.trim());
                const rawMatQty = isFlavored ? (item.rawMaterialWeight !== '' ? Number(item.rawMaterialWeight) : (total * 0.03)) : 0;
                const baseTeaQty = total - rawMatQty;

                return {
                    product: item.product,
                    type: item.type,
                    packSizeKg: Number(item.packSizeKg),
                    numberOfBoxes: Number(item.numberOfBoxes),
                    totalQtyKg: Number(total.toFixed(3)),
                    baseTeaQtyKg: Number(baseTeaQty.toFixed(3)),
                    rawMaterialName: item.rawMaterialName || "",
                    rawMaterialQtyKg: Number(rawMatQty.toFixed(3)),
                    packingMaterials: item.packingMaterials ? item.packingMaterials.filter(pm => pm.name && Number(pm.qty) > 0) : []
                };
            }),
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
        <div className="p-8 max-w-[1200px] mx-auto font-sans transition-colors duration-300 min-h-screen border mt-4 border-teal-300 rounded-2xl dark:border-zinc-800">
            
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
                                // Need to factor in original values for accurate overCapacity checks during edit, but keeping simple for UI
                                const isOverCapacity = row.product && totalIssuedForBaseGradeSoFar > availableForProduct;

                                const rmStockData = availableRawStock.find(s => s.materialName === row.rawMaterialName);
                                const availableRM = rmStockData ? rmStockData.totalQuantity : 0;
                                const isRMOverCapacity = isFlavoredUI && row.rawMaterialName && Number(row.rawMaterialWeight) > availableRM;

                                return (
                                    <div key={row.id} className={`relative bg-white dark:bg-zinc-950 p-5 rounded-xl border transition-colors shadow-sm ${isOverCapacity || isRMOverCapacity ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-teal-100 dark:border-teal-900/40'}`}>
                                        
                                        {itemsList.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveItemRow(row.id)}
                                                className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                            >
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

                                            {/* ROW 2: Pack Size, Items */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative" ref={el => dropdownRefs.current[`size-${row.id}`] = el}>
                                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">Pack (Kg)</label>
                                                    <input type="number" step="any" min="0" value={row.packSizeKg} onChange={(e) => handleItemChange(row.id, 'packSizeKg', e.target.value)} onFocus={() => { if (availableSizes) setOpenDropdownId(`size-${row.id}`); }} onWheel={(e) => e.target.blur()} required placeholder="e.g. 0.025" className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                                    
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

                                                <div>
                                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">Items</label>
                                                    <input type="number" step="1" min="0" value={row.numberOfBoxes} onChange={(e) => handleItemChange(row.id, 'numberOfBoxes', e.target.value)} onWheel={(e) => e.target.blur()} required placeholder="e.g. 15" className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                                                </div>
                                            </div>

                                            {/* ROW 3: Flavors */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                                                <div className="relative" ref={el => dropdownRefs.current[`rmName-${row.id}`] = el}>
                                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase whitespace-nowrap">Flavor</label>
                                                    <input 
                                                        type="text" 
                                                        value={row.rawMaterialName} 
                                                        onChange={(e) => handleItemChange(row.id, 'rawMaterialName', e.target.value)} 
                                                        onFocus={() => { if(isFlavoredUI) setOpenDropdownId(`rmName-${row.id}`); }}
                                                        disabled={!isFlavoredUI}
                                                        placeholder={isFlavoredUI ? "Select Flavor..." : "Not applicable"} 
                                                        className={`w-full p-2.5 h-[42px] border text-sm rounded-md outline-none transition-colors 
                                                        ${!isFlavoredUI ? 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 cursor-not-allowed opacity-60' : isRMOverCapacity ? 'border-amber-400 focus:ring-2 focus:ring-amber-500/50' : 'bg-white dark:bg-zinc-950 border-teal-200 dark:border-teal-800/50 focus:ring-2 focus:ring-[#2dd4bf]/50'}`} 
                                                    />
                                                    {openDropdownId === `rmName-${row.id}` && isFlavoredUI && (
                                                        <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar z-20">
                                                            {FLAVOR_NAMES
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
                                                        Flavor Qty (kg)
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

                                            {/* ROW 4: MULTIPLE RAW MATERIALS (PACKING MATERIALS) */}
                                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase flex items-center gap-1">
                                                        <Package size={12}/> Raw Materials (Optional)
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
                                                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[200px] custom-scrollbar">
                                                                        {availablePackingStock
                                                                            .filter(rm => rm.materialName.toLowerCase().includes((pm.name || '').toLowerCase()))
                                                                            .map((rm, idx) => (
                                                                            <li key={idx} onMouseDown={(e) => e.preventDefault()} onClick={() => { handlePackingMaterialChange(row.id, pmIdx, 'name', rm.materialName); setOpenDropdownId(null); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex justify-between">
                                                                                <span>{rm.materialName}</span> 
                                                                            </li>
                                                                        ))}
                                                                        {availablePackingStock.filter(rm => rm.materialName.toLowerCase().includes((pm.name || '').toLowerCase())).length === 0 && (
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

                                            {/* Auto-Calculated Total Qty */}
                                            <div className="mt-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-t border-gray-100 dark:border-zinc-800/50 pt-3">
                                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                                    Gross Qty <Weight size={12} className={isOverCapacity ? "text-amber-500" : "text-[#0d9488] dark:text-teal-400"}/>
                                                </label>
                                                <div className="w-1/2 p-2 border border-teal-300 dark:border-teal-700/50 bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400 font-bold rounded-md text-center transition-colors">
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