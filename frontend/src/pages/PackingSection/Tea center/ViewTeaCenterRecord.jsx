import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { AlertCircle, Calendar, RefreshCw, Package, ShoppingCart, Weight, Tag, FilterX } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useNavigate } from 'react-router-dom';

// Comprehensive Color Mapping for EVERY Tea Center Product
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    
    // 1. Grade/Type strict matching (Order matters!)
    if (p.includes('ff ex sp')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50';
    if (p.includes('ff sp')) return 'bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800/50';
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p.includes('bopf')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50';
    if (p.includes('fbop')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50';
    if (p.includes('bop')) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800/50';
    if (p.includes('op1') || p.includes('op 1')) return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/50';
    if (p.includes('pekoe')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50';
    if (p.includes('dust')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/50';
    
    // 2. Specialty/Flavor/Color matching
    if (p.includes('pink')) return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800/50';
    if (p.includes('purple')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50';
    if (p.includes('silver')) return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    if (p.includes('white')) return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    if (p.includes('golden') || p.includes('turmeric')) return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800/50';
    if (p.includes('orange') || p.includes('cinnamon')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800/50';
    if (p.includes('black') || p.includes('pepar')) return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700';
    if (p.includes('lemangrass') || p.includes('green')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800/50';
    if (p.includes('premium')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50';
    if (p.includes('awrudu') || p.includes('awuru')) return 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800/50';
    if (p.includes('slim beauty')) return 'bg-fuchsia-200 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-800/50';
    if (p.includes('masala')) return 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/50';
    if (p.includes('chakra')) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/50';
    if (p.includes('flower')) return 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800/50';
    if (p.includes('labour')) return 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700';
    if (p.includes('other purchasing')) return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800/50';
    
    // Default fallback
    return 'bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700'; 
};

// Comprehensive PDF Colors
const getPdfTeaColor = (product) => {
    const p = product.toLowerCase();
    
    if (p.includes('ff ex sp')) return { fillColor: [254, 226, 226], textColor: [153, 27, 27] };
    if (p.includes('ff sp')) return { fillColor: [254, 215, 170], textColor: [124, 45, 18] };
    if (p.includes('bopf sp')) return { fillColor: [190, 242, 100], textColor: [77, 124, 15] }; 
    if (p.includes('bopf')) return { fillColor: [254, 240, 138], textColor: [113, 63, 18] };
    if (p.includes('fbop')) return { fillColor: [254, 243, 199], textColor: [146, 64, 14] };
    if (p.includes('bop')) return { fillColor: [236, 252, 203], textColor: [63, 98, 18] };
    if (p.includes('op1') || p.includes('op 1')) return { fillColor: [224, 242, 254], textColor: [7, 89, 133] };
    if (p.includes('pekoe')) return { fillColor: [209, 250, 229], textColor: [6, 78, 59] };
    if (p.includes('dust')) return { fillColor: [207, 250, 254], textColor: [21, 94, 117] };
    
    if (p.includes('pink')) return { fillColor: [252, 231, 243], textColor: [157, 23, 77] };
    if (p.includes('purple')) return { fillColor: [243, 232, 255], textColor: [107, 33, 168] };
    if (p.includes('silver')) return { fillColor: [241, 245, 249], textColor: [30, 41, 59] };
    if (p.includes('white')) return { fillColor: [243, 244, 246], textColor: [31, 41, 55] };
    if (p.includes('golden') || p.includes('turmeric')) return { fillColor: [253, 224, 71], textColor: [113, 63, 18] };
    if (p.includes('orange') || p.includes('cinnamon')) return { fillColor: [255, 237, 213], textColor: [154, 52, 18] };
    if (p.includes('black') || p.includes('pepar')) return { fillColor: [228, 228, 231], textColor: [39, 39, 42] };
    if (p.includes('lemangrass') || p.includes('green')) return { fillColor: [220, 252, 231], textColor: [22, 101, 52] };
    if (p.includes('premium')) return { fillColor: [255, 228, 230], textColor: [159, 18, 57] }; 
    if (p.includes('awrudu') || p.includes('awuru')) return { fillColor: [250, 232, 255], textColor: [134, 25, 143] }; 
    if (p.includes('slim beauty')) return { fillColor: [245, 208, 254], textColor: [112, 26, 117] };
    if (p.includes('masala')) return { fillColor: [253, 230, 138], textColor: [146, 64, 14] };
    if (p.includes('chakra')) return { fillColor: [224, 231, 255], textColor: [55, 48, 163] };
    if (p.includes('flower')) return { fillColor: [237, 233, 254], textColor: [91, 33, 182] };
    if (p.includes('labour')) return { fillColor: [231, 229, 228], textColor: [41, 37, 36] };
    if (p.includes('other purchasing')) return { fillColor: [204, 251, 241], textColor: [17, 94, 89] };
    
    return { fillColor: [249, 250, 251], textColor: [31, 41, 55] }; 
};

// Map individual products to their summary categories based on the user's ledger
const getBaseCategory = (product) => {
    if (!product) return "Unknown";
    const p = product.trim().toLowerCase().replace(/\s+/g, ' ');

    const bopf = ["lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "mix fruit", "peach", "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", "guide issue-bopf"];
    const bopfSp = ["english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", "black t/b", "english afternoon"];
    const greenTea = ["lemongrass - green tea", "g/t lemangrass", "mint - green tea", "soursop - green tea", "moringa - green tea", "curry leaves - green tea", "heen bovitiya - green tea", "gotukola - green tea", "jasmin - green tea", "green tea t/b"];
    const otherPurchasing = ["silver tips", "golden tips", "flower", "chakra", "green tea"];
    const pekoe = ["pekoe", "rose tea"];
    const ff = ["ceylon premium - ff"];
    const op = ["op", "hibiscus"];
    const fbop = ["ceylon supreme"];
    
    // Explicit single mapping for standalone items
    const standaloneMap = {
        "opa": "OPA",
        "bop": "BOP",
        "bop pack": "BOP",
        "pink tea": "Pink Tea",
        "pink tea can": "Pink Tea",
        "pink tea pack": "Pink Tea",
        "op 1": "OP 1",
        "op1 pack": "OP 1",
        "ff ex sp": "FF EX SP",
        "ff ex sp pack": "FF EX SP",
        "ff ex sp box": "FF EX SP",
        "white tea": "White Tea",
        "white tea can": "White Tea",
        "purple tea": "Purple Tea",
        "purple tea can": "Purple Tea",
        "purple pack": "Purple Tea",
        "slim beauty": "Slim Beauty",
        "slim beauty can": "Slim Beauty",
        "vita glow": "Vita Glow",
        "silver green": "Silver Green",
        "premium": "Premium",
        "ceylon premium": "FF",
        "black pepper": "Black Pepper",
        "black pepar": "Black Pepper",
        "cinnamon stick": "Cinnamon Stick",
        "turmeric": "Turmeric"
    };

    if (bopf.includes(p)) return "BOPF";
    if (bopfSp.includes(p)) return "BOPF SP";
    if (greenTea.includes(p)) return "Green Tea";
    if (otherPurchasing.includes(p)) return "Other Purchasing";
    if (pekoe.includes(p)) return "Pekoe";
    if (ff.includes(p)) return "FF";
    if (op.includes(p)) return "OP";
    if (fbop.includes(p)) return "FBOP";
    
    if (standaloneMap[p]) return standaloneMap[p];

    return product.trim(); // Return unmodified if no category matches
};

// All Tea Center specific products
const TEA_TYPES = [
    "Green tea", "G/T Lemangrass", "Guide Issue-BOPF", "Silver tips can", "FBOP chest", 
    "FF SP chest", "FF EX SP Pack", "Cinnamon can", "OP1 pack", 
    "Silver green", "Pink tea can", "Pekoe box", "White tea can", 
    "Cinnamon pack", "Ceylon premium", "Purple tea can", "Golden tips can", 
    "Slim beauty can", "Bop pack", "Orange can", "purple pack", 
    "pink tea pack", "Black T/B", "Premium", "Cinnaamon box", 
    "FF EX SP Box", "turmeric", "Black pepar", "Masala box", 
    "Awrudu gift pack", "chakra", "flower",
    // Base List Items for Autocomplete
    "Lemongrass - BOPF", "Cinnamon Tea - BOPF", "Ginger Tea - BOPF", "Masala Tea - BOPF", "Pineapple Tea", "Mix Fruit", "Peach", "Strawberry", "Jasmin - BOPF", "Mango Tea", "Carmel", "Honey", "Earl Grey", "Lime", "Soursop - BOPF", "Cardamom", "Gift Pack",
    "English Breakfast", "Cinnamon Tea - BOPF SP", "Ginger Tea - BOPF SP", "Masala Tea - BOPF SP", "Vanilla", "Mint - BOPF SP", "Moringa - BOPF SP", "Curry Leaves - BOPF SP", "Gotukola - BOPF SP", "Heen Bovitiya - BOPF SP", "English Afternoon",
    "Lemongrass - Green Tea", "Mint - Green Tea", "Soursop - Green Tea", "Moringa - Green Tea", "Curry Leaves - Green Tea", "Heen Bovitiya - Green Tea", "Gotukola - Green Tea", "Jasmin - Green Tea",
    "Silver Tips", "Golden Tips", "Flower", "Chakra",
    "Pekoe", "Rose Tea", "Ceylon Premium - FF", "Ceylon Premium - FF SP", "OP", "Hibiscus", "Ceylon Supreme", "FBOP",
    "OPA", "BOP", "Pink Tea", "OP 1", "FF EX SP", "White Tea", "Purple Tea", "Slim Beauty", "Vita Glow", "Silver Green", "Green Tea T/B", "Black Pepper", "Cinnamon Stick", "Turmeric"
];

export default function ViewTeaCenterRecords() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer';

    // --- FILTER STATES ---
    const [filterMonth, setFilterMonth] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Custom Dropdown State
    const [productFilter, setProductFilter] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    const navigate = useNavigate(); 
    
    useEffect(() => {
        fetchRecords();
        
        // Handle outside click for dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchRecords = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/tea-center-issues`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401) throw new Error("Unauthorized. Please log in.");
                throw new Error("Failed to fetch data");
            }

            const data = await response.json();
            
            const processedData = data.map(rec => {
                const createdTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const updatedTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
                const isEdited = createdTime > 0 && updatedTime > 0 && (updatedTime - createdTime) > 5000;
                const lastUpdatedDate = isEdited ? new Date(rec.updatedAt).toISOString().split('T')[0] : '';
                
                const itemsArray = rec.issueItems || [];

                const searchString = itemsArray.map(item => item.product).join(' ');
                const productsPDF = itemsArray.map(item => item.product).join('\n');
                const packSizesPDF = itemsArray.map(item => `${item.packSizeKg} kg`).join('\n');
                const boxesPDF = itemsArray.map(item => `${item.numberOfBoxes}`).join('\n');
                const qtysPDF = itemsArray.map(item => `${item.totalQtyKg} kg`).join('\n');

                return {
                    ...rec, itemsArray, searchString, productsPDF, packSizesPDF, 
                    boxesPDF, qtysPDF, isEdited, lastUpdatedDate,
                    editedBy: rec.updatedBy || rec.editorName || 'Unknown User' 
                };
            });

            const sortedData = processedData.sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setRecords(sortedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const monthMatch = !filterMonth || record.date.startsWith(filterMonth);
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const productMatch = !productFilter || record.searchString.toLowerCase().includes(productFilter.toLowerCase());
        return monthMatch && dateMatch && productMatch;
    });

    const grandTotalBoxes = filteredRecords.reduce((sum, record) => sum + (Number(record.totalBoxes) || 0), 0);
    const grandTotalQty = filteredRecords.reduce((sum, record) => sum + (Number(record.totalQtyKg) || 0), 0);

    // --- GENERATE DATA FOR SUMMARY TABLE BY CATEGORY ---
    const categorySummaryMap = {};
    filteredRecords.forEach(record => {
        record.itemsArray.forEach(item => {
            const cat = getBaseCategory(item.product);
            if (!categorySummaryMap[cat]) {
                categorySummaryMap[cat] = { qty: 0, boxes: 0 };
            }
            categorySummaryMap[cat].qty += Number(item.totalQtyKg) || 0;
            categorySummaryMap[cat].boxes += Number(item.numberOfBoxes) || 0;
        });
    });
    // Sort array by highest Qty
    const summaryArray = Object.entries(categorySummaryMap).sort((a, b) => b[1].qty - a[1].qty);

    const handleEditClick = (record) => {
        navigate('/packing/edit-tea-center-issue', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/tea-center-issues/${recordToDelete._id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Record deleted successfully!", { id: toastId });
                fetchRecords(); 
            } else {
                toast.error("Failed to delete record.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error while deleting.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    const clearFilters = () => {
        setFilterMonth('');
        setStartDate('');
        setEndDate('');
        setProductFilter('');
    };

    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        if (endDate && e.target.value > endDate) {
            setEndDate(''); 
        }
    };

    // --- PDF GENERATION LOGIC ---
    const getPdfData = () => {
        const pdfSortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        const tableRows = [];

        pdfSortedRecords.forEach(record => {
            const baseDate = new Date(record.date).toISOString().split('T')[0];
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited by ${record.editedBy} on ${record.lastUpdatedDate})` : baseDate;

            record.itemsArray.forEach((item, index) => {
                const isFirst = index === 0;

                tableRows.push([
                    isFirst ? pdfDateCell : "",
                    { 
                        content: item.product, 
                        styles: { ...getPdfTeaColor(item.product), fontStyle: 'bold', halign: 'center' } 
                    },
                    `${item.packSizeKg} kg`,
                    item.numberOfBoxes.toString(),
                    `${item.totalQtyKg.toFixed(3)} kg`,
                    isFirst ? record.totalBoxes.toString() : "",
                    isFirst ? `${record.totalQtyKg.toFixed(3)} kg` : "" 
                ]);
            });
        });

        tableRows.push([
            { content: "MONTHLY TOTAL", styles: { fontStyle: 'bold', halign: 'right' } },
            "-", "-", "-", "-",
            { content: grandTotalBoxes.toString(), styles: { fontStyle: 'bold' } },
            { content: `${grandTotalQty.toFixed(3)} kg`, styles: { fontStyle: 'bold', textColor: [15, 118, 110] } } 
        ]);

        return tableRows;
    };

    const uniqueCode = `PS/TC/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <ShoppingCart size={24} /> Tea Center Issue Records
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of daily tea center product issues</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Tea Center Issue Records"
                        subtitle={`Filters -> Month: ${filterMonth || 'All'} | Date: ${startDate || 'All'} to ${endDate || 'All'} | Product: ${productFilter || 'All'}`}
                        headers={["Date", "Product", "Pack Size", "No. of Boxes", "Qty", "Daily Boxes", "Daily Qty"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Tea_Center_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="portrait" 
                        disabled={loading || filteredRecords.length === 0}
                    />
                    <button onClick={fetchRecords} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-[#0d9488] dark:border-teal-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</label>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!startDate} className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors disabled:opacity-50" />
                    </div>
                    
                    {/* CUSTOM SCROLLABLE AUTOCOMPLETE DROPDOWN */}
                    <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Product (Search)</label>
                        <input 
                            type="text" 
                            placeholder="Type to search..." 
                            value={productFilter} 
                            onChange={(e) => {
                                setProductFilter(e.target.value);
                                setIsDropdownOpen(true);
                            }} 
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" 
                        />
                        {isDropdownOpen && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                {TEA_TYPES.filter(t => t.toLowerCase().includes(productFilter.toLowerCase()))
                                    .map((tea, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setProductFilter(tea);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                    >
                                        <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex items-end lg:justify-end">
                        <button onClick={clearFilters} disabled={!filterMonth && !startDate && !endDate && !productFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${filterMonth || startDate || endDate || productFilter ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-not-allowed'}`}>
                            <FilterX size={16} /> Clear
                        </button>
                    </div>
                </div>
            </div>
            
            {/* --- MAIN GRID LAYOUT --- */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* LEFT: MAIN TABLE (Col Span 3) */}
                <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden self-start w-full transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading issue records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                        <th className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-500 align-bottom min-w-[120px]"><Calendar size={14} className="inline mr-1"/> Date</th>
                                        <th className="px-4 py-3 font-bold text-green-600 dark:text-green-500 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 align-bottom min-w-[160px]"><Tag size={14} className="inline mr-1"/> Product</th>
                                        <th className="px-4 py-3 font-bold text-green-700 dark:text-green-500 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 text-center"><Weight size={14} className="inline mr-1"/> (Kg)</th>
                                        <th className="px-4 py-3 font-bold text-green-700 dark:text-green-500 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 text-center"><Package size={14} className="inline mr-1"/> Box/Packs</th>
                                        <th className="px-4 py-3 font-bold text-green-700 dark:text-green-500 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 text-center"><Weight size={14} className="inline mr-1"/> Qty (Kg)</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-zinc-600 text-center bg-gray-100 dark:bg-zinc-800">Daily Boxes</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-zinc-600 text-center bg-gray-100 dark:bg-zinc-800">Daily Qty (Kg)</th>
                                        {!isViewer && <th className="px-4 py-3 font-semibold align-bottom text-center bg-gray-50 dark:bg-zinc-950/50">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => (
                                            <tr key={record._id} className="hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                                
                                                <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toISOString().split('T')[0]}</span>
                                                    {record.isEdited && (
                                                        <div className="mt-1.5 text-[10px] bg-teal-50 dark:bg-teal-900 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 px-2 py-1 rounded font-medium w-max leading-tight">
                                                            <span className="font-bold">Edited by {record.editedBy}</span><br />
                                                            <span className="opacity-100">{record.lastUpdatedDate}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className={`flex-1 flex items-center px-4 py-3 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0 ${getTeaColor(t.product)}`}>
                                                                {t.product}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                {t.packSizeKg}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                {t.numberOfBoxes}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                <span className="text-gray-600 dark:text-green-500">{t.totalQtyKg?.toFixed(3)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-4 text-center border-r border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 align-top">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-lg">{record.totalBoxes}</span>
                                                </td>

                                                <td className="px-3 py-4 text-center border-r border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 align-top">
                                                    <span className="font-bold text-green-700 dark:text-green-400 text-lg">{record.totalQtyKg?.toFixed(3)}</span>
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-4 text-center align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-teal-600 rounded transition-colors"><MdOutlineEdit size={20} /></button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 rounded transition-colors"><MdOutlineDeleteOutline size={20} /></button></AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-white rounded-2xl max-w-md">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-xl font-bold">Delete Record</AlertDialogTitle>
                                                                        <AlertDialogDescription>Are you sure you want to delete this record?</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={isViewer ? "7" : "8"} className="p-16 text-center text-gray-400"><p>No records found</p></td></tr>
                                    )}
                                </tbody>
                                {filteredRecords.length > 0 && (
                                    <tfoot className="bg-gray-100/90 dark:bg-zinc-900/90 border-t-2 border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <td colSpan="5" className="px-4 py-4 text-right font-bold tracking-wider uppercase border-r border-gray-200 dark:border-zinc-800">MONTHLY TOTAL</td>
                                            <td className="px-3 py-4 text-center font-black text-xl border-r border-gray-200 dark:border-zinc-800">{grandTotalBoxes}</td>
                                            <td className="px-3 py-4 text-center font-black text-[#0f766e] dark:text-teal-500 text-xl border-r border-gray-200 dark:border-zinc-800">{grandTotalQty.toFixed(3)} kg</td>
                                            {!isViewer && <td></td>}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>

                {/* RIGHT: SUMMARY TABLE (Col Span 1) */}
                <div className="xl:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Package size={18} className="text-[#0d9488] dark:text-teal-500" /> Summary By Category
                            </h3>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Category</th>
                                        <th className="px-3 py-2 text-center font-bold border-r border-gray-300 dark:border-zinc-500">Packs/Boxes</th>
                                        <th className="px-3 py-2 text-right font-bold">Qty (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([catName, data], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getTeaColor(catName)}`}>
                                                    {catName}
                                                </td>
                                                <td className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-zinc-500">
                                                    {data.boxes}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                                    {data.qty % 1 !== 0 ? data.qty.toFixed(3) : data.qty}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-500">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-500">TOTAL</td>
                                        <td className="px-3 py-2 text-center border-r border-gray-300 dark:border-zinc-500">{grandTotalBoxes}</td>
                                        <td className="px-3 py-2 text-right">{grandTotalQty % 1 !== 0 ? grandTotalQty.toFixed(3) : grandTotalQty}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}