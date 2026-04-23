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

// Tea Center specific PDF Colors
const getPdfTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('pink')) return { fillColor: [251, 207, 232], textColor: [131, 24, 67] };
    if (p.includes('purple')) return { fillColor: [233, 213, 255], textColor: [88, 28, 135] };
    if (p.includes('silver')) return { fillColor: [226, 232, 240], textColor: [30, 41, 59] };
    if (p.includes('golden')) return { fillColor: [254, 240, 138], textColor: [113, 63, 18] };
    if (p.includes('orange')) return { fillColor: [254, 215, 170], textColor: [124, 45, 18] };
    if (p.includes('black')) return { fillColor: [55, 65, 81], textColor: [255, 255, 255] };
    if (p.includes('lemangrass') || p.includes('green')) return { fillColor: [187, 247, 208], textColor: [20, 83, 45] };
    if (p.includes('cinnamon')) return { fillColor: [254, 215, 170], textColor: [120, 53, 15] };
    if (p.includes('premium')) return { fillColor: [244, 114, 182], textColor: [255, 255, 255] }; 
    if (p.includes('awrudu')) return { fillColor: [192, 132, 252], textColor: [255, 255, 255] }; 
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; 
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
                
                // Use issueItems instead of salesItems
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

    // --- GENERATE DATA FOR SUMMARY TABLE ---
    const productSummaryMap = {};
    filteredRecords.forEach(record => {
        record.itemsArray.forEach(item => {
            if (!productSummaryMap[item.product]) productSummaryMap[item.product] = 0;
            productSummaryMap[item.product] += Number(item.totalQtyKg) || 0;
        });
    });
    const summaryArray = Object.entries(productSummaryMap).sort((a, b) => b[1] - a[1]);

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
                    `${item.totalQtyKg.toFixed(3)} kg`, // Updated to 3 decimals
                    isFirst ? record.totalBoxes.toString() : "",
                    isFirst ? `${record.totalQtyKg.toFixed(3)} kg` : "" // Updated to 3 decimals
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
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen  transition-colors duration-300">
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
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!startDate} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors disabled:opacity-50" />
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
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" 
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
                        <button onClick={clearFilters} disabled={!filterMonth && !startDate && !endDate && !productFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${filterMonth || startDate || endDate || productFilter ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
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
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-200">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => (
                                            <tr key={record._id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toISOString().split('T')[0]}</span>
                                                    {/* Edited Username Display */}
                                                    {record.isEdited && (
                                                        <div className="mt-1.5 text-[10px] bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 px-2 py-1 rounded font-medium w-max leading-tight">
                                                            <span className="font-bold">Edited by {record.editedBy}</span><br />
                                                            <span className="opacity-80">{record.lastUpdatedDate}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                {/* Products with Colors */}
                                                <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {record.itemsArray.map((t, i) => (
                                                            <span key={i} className={`block font-bold border px-2 py-0.5 rounded shadow-sm w-fit ${getTeaColor(t.product)}`}>
                                                                {t.product}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-600 text-gray-600 dark:text-gray-300 font-medium align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent">{t.packSizeKg}</span>)}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-600 text-gray-600 dark:text-gray-300 font-medium align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent">{t.numberOfBoxes}</span>)}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-600 text-gray-800 dark:text-gray-200 font-bold align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent text-gray-500 dark:text-green-500">{t.totalQtyKg?.toFixed(3)}</span>)}</div>
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-600 bg-gray-50/50 dark:bg-zinc-900/50 align-top pt-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-lg">{record.totalBoxes}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-600 bg-gray-50/50 dark:bg-zinc-900/50 align-top pt-4">
                                                    <span className="font-bold text-green-700 dark:text-green-400 text-lg">{record.totalQtyKg?.toFixed(3)}</span>
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-3 text-center align-top pt-3">
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
                                <Weight size={18} className="text-[#0d9488] dark:text-teal-500" /> Summary By Product
                            </h3>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Product</th>
                                        <th className="px-3 py-2 text-right font-bold">Qty (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([prodName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getTeaColor(prodName)}`}>
                                                    {prodName}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                                    {qty % 1 !== 0 ? qty.toFixed(3) : qty}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-500">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-500">TOTAL</td>
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