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

const getPdfTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p === 'bopf') return { fillColor: [253, 224, 71], textColor: [113, 63, 18] }; // Yellow
    if (p.includes('bopf sp')) return { fillColor: [190, 242, 100], textColor: [77, 124, 15] }; // Lime
    if (p === 'dust') return { fillColor: [59, 130, 246], textColor: [255, 255, 255] }; // Blue
    if (p === 'dust 1') return { fillColor: [6, 182, 212], textColor: [255, 255, 255] }; // Cyan
    if (p.includes('premium')) return { fillColor: [244, 114, 182], textColor: [255, 255, 255] }; // Pink
    if (p.includes('awuru')) return { fillColor: [192, 132, 252], textColor: [255, 255, 255] }; // Purple
    if (p === 't/b 25') return { fillColor: [239, 68, 68], textColor: [255, 255, 255] }; // Red
    if (p === 't/b 100') return { fillColor: [120, 53, 15], textColor: [255, 255, 255] }; // Brown
    if (p.includes('green')) return { fillColor: [74, 222, 128], textColor: [20, 83, 45] }; // Green
    if (p.includes('labour')) return { fillColor: [229, 231, 235], textColor: [31, 41, 55] }; // Gray
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; // Default Gray
};

// All Tea Types for the filter dropdown
const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags(100)", 
    "Pitigala tea bags(50)", "T/B 25", "T/B 100", "Pitigala tea 400g", 
    "Awuru pack", "Labour drinking tea"
];

export default function ViewLocalSaleRecords() {
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
            const response = await fetch(`${BACKEND_URL}/api/local-sales`, {
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
                const itemsArray = rec.salesItems || [];

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
    // Sort array descending by qty
    const summaryArray = Object.entries(productSummaryMap).sort((a, b) => b[1] - a[1]);

    const handleEditClick = (record) => {
        navigate('/packing/edit-local-sale', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/local-sales/${recordToDelete._id}`, { 
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
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited)` : baseDate;

            record.itemsArray.forEach((item, index) => {
                // Only show Date and Daily Totals on the first item of the day to keep it clean
                const isFirst = index === 0;

                tableRows.push([
                    isFirst ? pdfDateCell : "",
                    { 
                        content: item.product, 
                        styles: { ...getPdfTeaColor(item.product), fontStyle: 'bold', halign: 'center' } 
                    },
                    `${item.packSizeKg} kg`,
                    item.numberOfBoxes.toString(),
                    `${item.totalQtyKg.toFixed(2)} kg`,
                    isFirst ? record.totalBoxes.toString() : "",
                    isFirst ? `${record.totalQtyKg.toFixed(2)} kg` : ""
                ]);
            });
        });

        // Add the Monthly Total Row at the bottom
        tableRows.push([
            { content: "MONTHLY TOTAL", styles: { fontStyle: 'bold', halign: 'right' } },
            "-", "-", "-", "-",
            { content: grandTotalBoxes.toString(), styles: { fontStyle: 'bold' } },
            { content: `${grandTotalQty.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [234, 88, 12] } }
        ]);

        return tableRows;
    };

    const uniqueCode = `PS/LSR/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-green-600 dark:text-green-500 flex items-center gap-2">
                        <ShoppingCart size={24} /> Local Sale Records
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of daily local product issues and sales</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* PDF DOWNLOADER ADDED HERE */}
                    <PDFDownloader 
                        title="Local Sale Records"
                        subtitle={`Filters -> Month: ${filterMonth || 'All'} | Date: ${startDate || 'All'} to ${endDate || 'All'} | Product: ${productFilter || 'All'}`}
                        headers={["Date", "Product", "Pack Size", "No. of Boxes", "Qty", "Daily Boxes", "Daily Qty"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Local_Sale_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="portrait" 
                        disabled={loading || filteredRecords.length === 0}
                    />
                    <button onClick={fetchRecords} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-500 border border-orange-300 dark:border-orange-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</label>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!startDate} className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50" />
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
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-colors" 
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
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
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
                <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden self-start w-full transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading sales records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800">
                                        <th className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-800 align-bottom min-w-[120px]"><Calendar size={14} className="inline mr-1"/> Date</th>
                                        <th className="px-4 py-3 font-bold text-orange-600 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 align-bottom min-w-[160px]"><Tag size={14} className="inline mr-1"/> Product</th>
                                        <th className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center"><Weight size={14} className="inline mr-1"/> (Kg)</th>
                                        <th className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center"><Package size={14} className="inline mr-1"/> Box/Packs</th>
                                        <th className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center"><Weight size={14} className="inline mr-1"/> Qty (Kg)</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-zinc-800 text-center bg-gray-100 dark:bg-zinc-800">Daily Boxes</th>
                                        <th className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-zinc-800 text-center bg-gray-100 dark:bg-zinc-800">Daily Qty (Kg)</th>
                                        {!isViewer && <th className="px-4 py-3 font-semibold align-bottom text-center bg-gray-50 dark:bg-zinc-950/50">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => (
                                            <tr key={record._id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toISOString().split('T')[0]}</span>
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
                                                
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 font-medium align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent">{t.packSizeKg}</span>)}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 font-medium align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent">{t.numberOfBoxes}</span>)}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200 font-bold align-top">
                                                    <div className="flex flex-col gap-2">{record.itemsArray.map((t, i) => <span key={i} className="py-1 border border-transparent text-orange-600 dark:text-orange-500">{t.totalQtyKg?.toFixed(2)}</span>)}</div>
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 align-top pt-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-lg">{record.totalBoxes}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 align-top pt-4">
                                                    <span className="font-bold text-orange-700 dark:text-orange-400 text-lg">{record.totalQtyKg?.toFixed(2)}</span>
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-3 text-center align-top pt-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-orange-600 rounded"><MdOutlineEdit size={20} /></button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 rounded"><MdOutlineDeleteOutline size={20} /></button></AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-white rounded-2xl max-w-md">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-xl font-bold">Delete Record</AlertDialogTitle>
                                                                        <AlertDialogDescription>Are you sure you want to delete this record?</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white">Delete</AlertDialogAction>
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
                                    <tfoot className="bg-gray-100/90 dark:bg-zinc-900/90 border-t-2 border-gray-200">
                                        <tr>
                                            <td colSpan="5" className="px-4 py-4 text-right font-bold tracking-wider uppercase border-r border-gray-200">MONTHLY TOTAL</td>
                                            <td className="px-3 py-4 text-center font-black text-xl border-r border-gray-200">{grandTotalBoxes}</td>
                                            <td className="px-3 py-4 text-center font-black text-orange-600 text-xl border-r border-gray-200">{grandTotalQty.toFixed(2)} kg</td>
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
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Weight size={18} className="text-orange-600" /> Summary By Product
                            </h3>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-700">Product</th>
                                        <th className="px-3 py-2 text-right font-bold">Qty (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([prodName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-700">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-700 ${getTeaColor(prodName)}`}>
                                                    {prodName}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                                    {qty % 1 !== 0 ? qty.toFixed(2) : qty}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-600">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-700">TOTAL</td>
                                        <td className="px-3 py-2 text-right">{grandTotalQty % 1 !== 0 ? grandTotalQty.toFixed(2) : grandTotalQty}</td>
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