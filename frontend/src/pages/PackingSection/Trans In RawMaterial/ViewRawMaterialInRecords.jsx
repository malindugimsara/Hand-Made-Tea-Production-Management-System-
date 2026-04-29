import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Calendar, RefreshCw, FileText, FilterX, Truck, Box, PackagePlus, Hash, Layers, Leaf } from "lucide-react";
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

const getMaterialColor = (material) => {
    const m = material?.toLowerCase() || '';
    
    if (m.includes('pouch')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50';
    if (m.includes('box') || m.includes('carton')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50';
    if (m.includes('label') || m.includes('tape')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50';
    if (m.includes('paper') || m.includes('polybag')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50';
    if (m.includes('thread') || m.includes('glue')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50';
    
    return 'bg-gray-100 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700';
};

const getPdfMaterialColor = (material) => {
    const m = material?.toLowerCase() || '';
    
    if (m.includes('pouch')) return { fillColor: [254, 243, 199], textColor: [146, 64, 14] };
    if (m.includes('box') || m.includes('carton')) return { fillColor: [219, 234, 254], textColor: [30, 64, 175] };
    if (m.includes('label') || m.includes('tape')) return { fillColor: [209, 250, 229], textColor: [6, 95, 70] };
    if (m.includes('paper') || m.includes('polybag')) return { fillColor: [243, 232, 255], textColor: [107, 33, 168] };
    if (m.includes('thread') || m.includes('glue')) return { fillColor: [255, 228, 230], textColor: [159, 18, 57] };
    
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] };
};

const RAW_MATERIALS = [
    "50g Silver Pouch", "100g Gold Pouch", "200g Printed Box", "500g Printed Box",
    "Master Carton (Large)", "Master Carton (Small)", "Barcode Labels", 
    "Packing Tape (Brown)", "Packing Tape (Clear)", "Glue Bottle", 
    "Tea Bags Filter Paper", "Cotton Thread", "Inner Polybag"
];

// List of Flavors to determine category on the fly
const FLAVOR_NAMES = [
    "Cinnamon", "Chakra", "Ginger", "Masala", "Vanilla", "Mint", 
    "Moringa", "Curry Leaves", "Gotukola", "Heen Bovitiya", "Cardamom", 
    "Rose", "Strawberry", "Peach", "Mix Fruit", "Pineapple", "Mango", 
    "Honey", "Earl Grey", "Lime", "Soursop", "Jasmine", "Flower", "Turmeric", "Black Pepper"
];

// Helper function to check if a material is a flavor
const getCategory = (materialName) => {
    const isFlavor = FLAVOR_NAMES.some(flavor => 
        (materialName || "").toLowerCase().includes(flavor.toLowerCase())
    );
    return isFlavor ? 'flavor' : 'other';
};

export default function ViewRawMaterialInRecords() {
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
    const [searchFilter, setSearchFilter] = useState('');
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    const navigate = useNavigate(); 
    
    useEffect(() => {
        fetchRecords();
        
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
            const response = await fetch(`${BACKEND_URL}/api/raw-materials-in`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401) throw new Error("Unauthorized. Please log in.");
                throw new Error("Failed to fetch data");
            }

            const data = await response.json();
            const recordsData = data.data ? data.data : data;

            const processedData = recordsData.map(rec => {
                const createdTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const updatedTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
                const isEdited = createdTime > 0 && updatedTime > 0 && (updatedTime - createdTime) > 5000;
                const lastUpdatedDate = isEdited ? new Date(rec.updatedAt).toISOString().split('T')[0] : '';
                
                const itemsArray = (rec.items || []).map(item => ({
                    ...item,
                    // Dynamically calculate category here
                    category: getCategory(item.materialName)
                }));
                
                const searchString = `${rec.invoiceNo || ''} ${rec.supplierName || ''} ${itemsArray.map(item => item.materialName).join(' ')}`;

                return {
                    ...rec, itemsArray, searchString, isEdited, lastUpdatedDate,
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
        const searchMatch = !searchFilter || record.searchString.toLowerCase().includes(searchFilter.toLowerCase());
        return monthMatch && dateMatch && searchMatch;
    });

    // --- GENERATE DATA FOR SUMMARY TABLE ---
    const summaryMap = {};

    filteredRecords.forEach(record => {
        record.itemsArray.forEach(item => {
            const key = `${item.materialName}_|_${item.unit}`;
            if (!summaryMap[key]) {
                summaryMap[key] = { 
                    materialName: item.materialName, 
                    unit: item.unit, 
                    category: item.category, // Uses the dynamically calculated category
                    qty: 0 
                };
            }
            summaryMap[key].qty += Number(item.quantity) || 0;
        });
    });
    
    const summaryArray = Object.values(summaryMap).sort((a, b) => b.qty - a.qty);

    const handleEditClick = (record) => {
        navigate('/packing/edit-raw-material-in', { state: { recordData: record } }); 
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/raw-materials-in/delete/${recordToDelete._id}`, { 
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
        setSearchFilter('');
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
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited by ${record.editedBy})` : baseDate;

            record.itemsArray.forEach((item, index) => {
                const isFirst = index === 0;

                tableRows.push([
                    isFirst ? pdfDateCell : "",
                    isFirst ? (record.invoiceNo || "-") : "",
                    isFirst ? (record.supplierName || "-") : "",
                    { 
                        content: `${item.materialName}\n(${item.category})`, 
                        styles: { ...getPdfMaterialColor(item.materialName), fontStyle: 'bold', halign: 'center' } 
                    },
                    `${Number(item.quantity).toFixed(2)}`,
                    item.unit
                ]);
            });
        });

        return tableRows;
    };

    const uniqueCode = `INV/RMI/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    const ALL_SEARCH_ITEMS = [...RAW_MATERIALS, ...FLAVOR_NAMES];

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen transition-colors duration-300  dark:bg-zinc-950">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:w-auto">
                    <h2 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackagePlus size={24} /> Raw Material Inward Records
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of received packaging and raw materials</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="w-full sm:w-auto">
                        <PDFDownloader 
                            title="Raw Material Inward Records"
                            subtitle={`Filters -> Month: ${filterMonth || 'All'} | Search: ${searchFilter || 'All'}`}
                            headers={["Date", "Invoice No", "Supplier", "Material Name", "Quantity", "Unit"]}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Raw_Material_Inward_${new Date().toISOString().split('T')[0]}.pdf`}
                            orientation="landscape" 
                            disabled={loading || filteredRecords.length === 0}
                        />
                    </div>
                    <button onClick={fetchRecords} disabled={loading} className={`w-full sm:w-auto justify-center px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-[#0d9488] dark:border-teal-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#f0fdfa] dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</label>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!startDate} className="w-full border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors disabled:opacity-50" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Search Invoice/Supplier/Mat</label>
                        <input 
                            type="text" 
                            placeholder="Type to search..." 
                            value={searchFilter} 
                            onChange={(e) => {
                                setSearchFilter(e.target.value);
                                setIsDropdownOpen(true);
                            }} 
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" 
                        />
                        {isDropdownOpen && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                {ALL_SEARCH_ITEMS.filter(t => t.toLowerCase().includes(searchFilter.toLowerCase()))
                                    .map((mat, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setSearchFilter(mat);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                    >
                                        <div className={`w-3 h-3 rounded-full ${getMaterialColor(mat)} border border-white/20`}></div> {mat}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex items-end lg:justify-end">
                        <button onClick={clearFilters} disabled={!filterMonth && !startDate && !endDate && !searchFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${filterMonth || startDate || endDate || searchFilter ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-transparent'}`}>
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
                            <div className="w-8 h-8 border-4 border-[#99f6e4] border-t-[#0f766e] rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                        <th className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-500 align-bottom min-w-[120px]"><Calendar size={14} className="inline mr-1"/> Date</th>
                                        <th className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-500 align-bottom"><FileText size={14} className="inline mr-1"/> Invoice Info</th>
                                        <th className="px-4 py-3 font-bold text-[#0f766e] dark:text-teal-400 border-r border-gray-200 dark:border-zinc-600 bg-[#f0fdfa] dark:bg-teal-950/30 align-bottom min-w-[160px]"><Box size={14} className="inline mr-1"/> Material Name</th>
                                        <th className="px-4 py-3 font-bold text-[#0f766e] dark:text-teal-400 border-r border-gray-200 dark:border-zinc-600 bg-[#f0fdfa] dark:bg-teal-950/30 text-center"><Layers size={14} className="inline mr-1"/> Category</th>
                                        <th className="px-4 py-3 font-bold text-[#0f766e] dark:text-teal-400 border-r border-gray-200 dark:border-zinc-600 bg-[#f0fdfa] dark:bg-teal-950/30 text-center"><Hash size={14} className="inline mr-1"/> Quantity</th>
                                        <th className="px-4 py-3 font-bold text-[#0f766e] dark:text-teal-400 border-r border-gray-200 dark:border-zinc-600 bg-[#f0fdfa] dark:bg-teal-950/30 text-center">Unit</th>
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
                                                        <div className="mt-1.5 text-[10px] bg-[#f0fdfa] dark:bg-teal-900 text-[#0f766e] dark:text-teal-400 border border-[#99f6e4] dark:border-teal-700 px-2 py-1 rounded font-medium w-max leading-tight">
                                                            <span className="font-bold">Edited by {record.editedBy}</span><br />
                                                            <span className="opacity-100">{record.lastUpdatedDate}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="font-black text-gray-800 dark:text-gray-200 text-base">{record.invoiceNo}</span>
                                                        {record.supplierName && (
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium mt-0.5">
                                                                <Truck size={12} className="text-[#0d9488] dark:text-teal-400"/> {record.supplierName}
                                                            </div>
                                                        )}
                                                        {record.remarks && (
                                                            <div className="text-[10px] text-gray-500 italic mt-1 max-w-[180px] truncate" title={record.remarks}>
                                                                * {record.remarks}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className={`flex-1 flex items-center px-4 py-3 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0 ${getMaterialColor(t.materialName)}`}>
                                                                {t.materialName}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* Category Column in Main Table */}
                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 font-medium border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wider ${t.category === 'flavor' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                                                    {t.category}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                <span className="text-[#0f766e] dark:text-teal-400">{Number(t.quantity).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                    <div className="flex flex-col w-full h-full">
                                                        {record.itemsArray.map((t, i) => (
                                                            <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                {t.unit}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-4 text-center align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                        <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                                                            <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-[#0f766e] rounded transition-colors"><MdOutlineEdit size={20} /></button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 rounded transition-colors"><MdOutlineDeleteOutline size={20} /></button></AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-white rounded-2xl max-w-md w-[90vw] max-w-[425px]">
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
                                        <tr><td colSpan={isViewer ? "6" : "7"} className="p-16 text-center text-gray-400"><p>No records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RIGHT: SUMMARY TABLE (Col Span 1) */}
                <div className="xl:col-span-1 w-full">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Layers size={18} className="text-[#0d9488] dark:text-teal-400" /> Filtered Summary
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">Totals by Material & Category</p>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Material/Category</th>
                                        <th className="px-3 py-2 text-right font-bold text-[#0f766e] dark:text-teal-400">Total Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getMaterialColor(item.materialName)}`}>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1.5">
                                                            {item.category === 'flavor' ? <Leaf size={12} className="text-emerald-600"/> : <Box size={12} className="text-blue-600"/>}
                                                            {item.materialName}
                                                        </span>
                                                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded w-max ${item.category === 'flavor' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa]/50 dark:bg-teal-900/10 align-top">
                                                    {item.qty > 0 ? (item.qty % 1 !== 0 ? item.qty.toFixed(2) : item.qty) : '-'} <span className="text-[10px] text-gray-500 ml-0.5">{item.unit}</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
