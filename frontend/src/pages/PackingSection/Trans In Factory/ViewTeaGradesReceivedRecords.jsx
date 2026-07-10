import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Calendar, RefreshCw, FileText, Weight, Tag, FilterX, XCircle, CheckCircle2, User, UserCheck, Truck, PackagePlus } from "lucide-react";
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

// Colors for Tea Grades
const getTeaColor = (grade) => {
    const p = grade?.toLowerCase() || '';
    if (p === 'bopf') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50'; 
    if (p.includes('bopf sp')) return 'bg-lime-200 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800/50'; 
    if (p === 'dust') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50'; 
    if (p === 'dust 1') return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/50'; 
    if (p.includes('premium')) return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800/50'; 
    if (p.includes('awuru') || p.includes('awrudu')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50'; 
    if (p === 't/b 25') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50'; 
    if (p === 't/b 100') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800/50'; 
    if (p.includes('green') || p.includes('silver green')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800/50'; 
    if (p.includes('labour')) return 'bg-gray-100 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700'; 
    if (p.includes('golden') || p.includes('tips')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50'; 
    return 'bg-gray-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700'; 
};

const getPdfTeaColor = (grade) => {
    const p = grade?.toLowerCase() || '';
    if (p === 'bopf') return { fillColor: [253, 224, 71], textColor: [113, 63, 18] }; 
    if (p.includes('bopf sp')) return { fillColor: [190, 242, 100], textColor: [77, 124, 15] }; 
    if (p === 'dust') return { fillColor: [59, 130, 246], textColor: [255, 255, 255] }; 
    if (p === 'dust 1') return { fillColor: [6, 182, 212], textColor: [255, 255, 255] }; 
    if (p.includes('premium')) return { fillColor: [244, 114, 182], textColor: [255, 255, 255] }; 
    if (p.includes('awrudu')) return { fillColor: [192, 132, 252], textColor: [255, 255, 255] }; 
    if (p.includes('green')) return { fillColor: [74, 222, 128], textColor: [20, 83, 45] }; 
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; 
};

const TEA_TYPES = [
    "BOPF SP", "BOPF", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Awurudu Special", "White Tea", "Pink Tea", "Purple Tea", "Golden Tips"
];

export default function ViewTeaGradesReceivedRecords() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    // States
    const [activeTab, setActiveTab] = useState('auto'); // 'auto', 'manual', 'rejected'
    const [records, setRecords] = useState([]);
    const [rejectedRecords, setRejectedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer';
    const isAdmin = userRole.toLowerCase() === 'admin';

    // Filters
    const [filterMonth, setFilterMonth] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate(); 
    
    useEffect(() => {
        fetchRecords();
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchRecords = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [acceptedRes, rejectedRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/tea-received`, { headers }),
                fetch(`${BACKEND_URL}/api/tea-received/rejected-transfers`, { headers })
            ]);

            if (!acceptedRes.ok) {
                if(acceptedRes.status === 401) throw new Error("Unauthorized. Please log in.");
                throw new Error("Failed to fetch accepted data");
            }

            const data = await acceptedRes.json();
            
            const processedData = data.map(rec => {
                const createdTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const updatedTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
                const isEdited = createdTime > 0 && updatedTime > 0 && (updatedTime - createdTime) > 5000;
                const lastUpdatedDate = isEdited ? new Date(rec.updatedAt).toISOString().split('T')[0] : '';
                
                const itemsArray = rec.receivedItems || [];
                const searchString = itemsArray.map(item => item.grade).join(' ') + ' ' + (rec.transactionNo || '');

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

            if (rejectedRes.ok) {
                const rejectedData = await rejectedRes.json();
                setRejectedRecords(rejectedData);
            }
        } catch (error) {
            toast.error(error.message || "Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    // Global Filter Logic
    const filteredRecords = records.reduce((acc, record) => {
        const rDate = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
        const monthMatch = !filterMonth || rDate.startsWith(filterMonth);
        const dateMatch = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
        
        if (!monthMatch || !dateMatch) return acc;

        let matchedItems = record.itemsArray || []; 
        if (gradeFilter) {
            const searchVal = gradeFilter.toLowerCase();
            const isTransMatch = record.transactionNo?.toLowerCase().includes(searchVal);
            if (!isTransMatch) {
                matchedItems = matchedItems.filter(item => item.grade?.toLowerCase() === searchVal);
            }
        }

        if (matchedItems.length > 0) {
            const filteredTotalQty = matchedItems.reduce((sum, item) => sum + (Number(item.qtyKg) || 0), 0);
            acc.push({ ...record, itemsArray: matchedItems, totalQtyKg: filteredTotalQty });
        }
        return acc;
    }, []);

    // 🌟 FIXED: Split records by type using Transaction No for old records 🌟
    const checkIsManual = (r) => r.isManual === true || (r.transactionNo && r.transactionNo.includes('HO/TO'));

    const autoRecords = filteredRecords.filter(r => !checkIsManual(r));
    const manualRecords = filteredRecords.filter(r => checkIsManual(r));

    // Row Span Logic specifically for Manual Records
    const manualRecordsWithSpan = manualRecords.map((record, index, arr) => {
        const currentDate = new Date(record.date).toISOString().split('T')[0];
        const prevDate = index > 0 ? new Date(arr[index - 1].date).toISOString().split('T')[0] : null;
        
        const isFirstOfDate = currentDate !== prevDate;
        let rowSpan = 1;
        
        if (isFirstOfDate) {
            for (let i = index + 1; i < arr.length; i++) {
                if (new Date(arr[i].date).toISOString().split('T')[0] === currentDate) rowSpan++;
                else break;
            }
        }
        return { ...record, isFirstOfDate, dateRowSpan: rowSpan };
    });

    const grandTotalQty = filteredRecords.reduce((sum, record) => sum + (Number(record.totalQtyKg) || 0), 0);

    const gradeSummaryMap = {};
    filteredRecords.forEach(record => {
        record.itemsArray.forEach(item => {
            if (!gradeSummaryMap[item.grade]) gradeSummaryMap[item.grade] = 0;
            gradeSummaryMap[item.grade] += Number(item.qtyKg) || 0;
        });
    });
    const summaryArray = Object.entries(gradeSummaryMap).sort((a, b) => b[1] - a[1]);

    const handleEditClick = (record) => navigate('/packing/edit-received-record', { state: { recordData: record } });

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/tea-received/${recordToDelete._id}`, { 
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
        setFilterMonth(''); setStartDate(''); setEndDate(''); setGradeFilter('');
    };

    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        if (endDate && e.target.value > endDate) setEndDate(''); 
    };

    // PDF GENERATION
    const getPdfData = () => {
        const pdfSortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        const tableRows = [];

        pdfSortedRecords.forEach(record => {
            const baseDate = new Date(record.date).toISOString().split('T')[0];
            const pdfDateCell = record.isEdited ? `${baseDate}\n(Edited)` : baseDate;
            const itemsCount = record.itemsArray.length;
            
            const isManualRec = checkIsManual(record);
            const typeStr = isManualRec ? 'Manual' : 'Factory (Auto)';
            const dispByStr = record.factoryUsername || (isManualRec ? 'Manual Entry' : '-');
            const accByStr = record.acceptedBy || record.editedBy || '-';

            record.itemsArray.forEach((item, index) => {
                const isFirst = index === 0;
                const qtyStr = parseFloat(Number(item.qtyKg).toFixed(3)).toString();
                const gradeCell = { content: item.grade, styles: { ...getPdfTeaColor(item.grade), fontStyle: 'bold', halign: 'center', valign: 'top' } };
                const qtyCell = { content: `${qtyStr} kg`, styles: { halign: 'right', valign: 'top' } };

                if (isFirst) {
                    tableRows.push([
                        { content: pdfDateCell, rowSpan: itemsCount, styles: { valign: 'top', halign: 'center' } },
                        { content: record.transactionNo || "-", rowSpan: itemsCount, styles: { valign: 'top', halign: 'center' } },
                        { content: typeStr, rowSpan: itemsCount, styles: { valign: 'top', halign: 'center', textColor: isManualRec ? [107, 114, 128] : [37, 99, 235] } },
                        { content: dispByStr, rowSpan: itemsCount, styles: { valign: 'top', halign: 'center' } },
                        { content: accByStr, rowSpan: itemsCount, styles: { valign: 'top', halign: 'center' } },
                        gradeCell,
                        qtyCell
                    ]);
                } else {
                    tableRows.push([gradeCell, qtyCell]);
                }
            });
        });

        tableRows.push([
            { content: "MONTHLY TOTAL", styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 6 },
            { content: `${parseFloat(Number(grandTotalQty).toFixed(3)).toString()} kg`, styles: { fontStyle: 'bold', textColor: [15, 118, 110], halign: 'right' } } 
        ]);
        return tableRows;
    };
    
    const uniqueCode = `TR/REC/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:w-auto">
                    <h2 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <FileText size={24} /> Trans In Records
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of tea grades received in Packing</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="w-full sm:w-auto">
                        <PDFDownloader 
                            title="Tea Grades Received Log"
                            subtitle={`Filters -> Month: ${filterMonth || 'All'} | Date: ${startDate || 'All'} to ${endDate || 'All'} | Grade: ${gradeFilter || 'All'}`}
                            headers={["Date", "Transaction No", "Type", "Dispatched By", "Accepted By", "Grade", "Qty (KG)"]}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Received_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                            orientation="portrait" 
                            disabled={loading || filteredRecords.length === 0}
                        />
                    </div>
                    <button onClick={fetchRecords} disabled={loading} className={`w-full sm:w-auto justify-center px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-[#0d9488] dark:border-teal-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                </div>
            </div>

            {/* --- TAB MENU --- */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-6 w-full overflow-x-auto">
                <button
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'auto' ? 'border-[#0d9488] text-[#0f766e] dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    onClick={() => setActiveTab('auto')}
                >
                    <CheckCircle2 size={16} /> Auto Transfers (Factory)
                </button>
                <button
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'manual' ? 'border-[#0d9488] text-[#0f766e] dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    onClick={() => setActiveTab('manual')}
                >
                    <PackagePlus size={16} /> Manual Transfers
                </button>
                <button
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'rejected' ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    onClick={() => setActiveTab('rejected')}
                >
                    <XCircle size={16} /> Rejected
                    {rejectedRecords.length > 0 && <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px]">{rejectedRecords.length}</span>}
                </button>
            </div>

            {/* --- FILTER SECTION (For Auto & Manual) --- */}
            {(activeTab === 'auto' || activeTab === 'manual') && (
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
                        
                        <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Search Grade/Trans No</label>
                            <input 
                                type="text" 
                                placeholder="Type to search..." 
                                value={gradeFilter} 
                                onChange={(e) => {
                                    setGradeFilter(e.target.value);
                                    setIsDropdownOpen(true);
                                }} 
                                onFocus={() => setIsDropdownOpen(true)}
                                className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" 
                            />
                            {isDropdownOpen && (
                                <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                    {TEA_TYPES.filter(t => t.toLowerCase().includes(gradeFilter.toLowerCase()))
                                        .map((grade, idx) => (
                                        <li 
                                            key={idx} 
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setGradeFilter(grade);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                        >
                                            <div className={`w-3 h-3 rounded-full ${getTeaColor(grade)} border border-white/20`}></div> {grade}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-end lg:justify-end">
                            <button onClick={clearFilters} disabled={!filterMonth && !startDate && !endDate && !gradeFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${filterMonth || startDate || endDate || gradeFilter ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-transparent'}`}>
                                <FilterX size={16} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- MAIN CONTENT AREA --- */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* LEFT: TABLE AREA (Col Span 3) */}
                <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden self-start w-full transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300">
                            
                            {/* --- 1. AUTO TRANSFERS TAB (REPORT STYLE) --- */}
                            {activeTab === 'auto' && (
                                <table className="w-full text-sm text-left border-collapse min-w-full">
                                    <thead className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                        <tr>
                                            <th className="px-5 py-4 border-r border-gray-200 dark:border-zinc-600">RECORD DETAILS</th>
                                            <th className="px-5 py-4 border-r border-gray-200 dark:border-zinc-600"><Tag size={12} className="inline mr-1"/> PRODUCTS INCLUDED</th>
                                            <th className="px-5 py-4 text-center border-r border-gray-200 dark:border-zinc-600"><Weight size={12} className="inline mr-1"/> ISSUED (KG)</th>
                                            <th className="px-5 py-4 text-center border-r border-gray-200 dark:border-zinc-600 text-[#0d9488] dark:text-teal-500"><Weight size={12} className="inline mr-1"/> RECEIVED (KG)</th>
                                            <th className="px-5 py-4 text-center border-r border-gray-200 dark:border-zinc-600">VARIANCE</th>
                                            <th className="px-5 py-4 text-center">INVOLVED STAFF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {autoRecords.length > 0 ? (
                                            autoRecords.map((record) => {
                                                const issued = Number(record.sentQtyKg) || 0;
                                                const received = Number(record.totalQtyKg) || 0;
                                                const variance = received - issued;
                                                const formattedVariance = variance === 0 ? 'Match' : (variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2));

                                                return (
                                                    <tr key={record._id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-5 py-5 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{record.transactionNo}</div>
                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                <Calendar size={12}/> Received: {new Date(record.date).toISOString().split('T')[0]}
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                            <div className="flex flex-col h-full">
                                                                {record.itemsArray.map((t, i) => (
                                                                    <div key={i} className="flex items-center px-5 py-3 border-b border-gray-100 dark:border-zinc-800 last:border-0 h-12">
                                                                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-sm border ${getTeaColor(t.grade)}`}>
                                                                            {t.grade}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                            <div className="flex flex-col h-full text-center text-gray-600 dark:text-gray-300 font-medium">
                                                                <div className="flex items-center justify-center px-5 py-3 h-full min-h-[48px]">
                                                                    {issued > 0 ? issued.toFixed(2) : '-'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                            <div className="flex flex-col h-full text-center">
                                                                {record.itemsArray.map((t, i) => (
                                                                    <div key={i} className="flex items-center justify-center px-5 py-3 border-b border-gray-100 dark:border-zinc-800 last:border-0 h-12 font-bold text-[#0d9488] dark:text-teal-400">
                                                                        {Number(t.qtyKg).toFixed(2)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="p-0 border-r border-gray-100 dark:border-zinc-800 align-top">
                                                            <div className="flex flex-col h-full items-center justify-center min-h-[48px]">
                                                                <span className={`text-xs font-bold ${variance === 0 ? 'text-gray-400' : (variance > 0 ? 'text-green-600' : 'text-red-600')}`}>
                                                                    {formattedVariance}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-5 align-top text-xs text-gray-500 dark:text-gray-400">
                                                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                                                <div className="flex items-center gap-1.5"><Truck size={12}/> <span className="font-medium text-gray-700 dark:text-gray-300">{record.factoryUsername || 'Factory'}</span> (Out)</div>
                                                                <div className="flex items-center gap-1.5"><UserCheck size={12}/> <span className="font-medium text-gray-700 dark:text-gray-300">{record.acceptedBy || 'System'}</span> (In)</div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan="6" className="p-16 text-center text-gray-400">No auto transfers found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* --- 2. MANUAL TRANSFERS TAB (LOGBOOK STYLE) --- */}
                            {activeTab === 'manual' && (
                                <table className="w-full text-sm text-left border-collapse min-w-full">
                                    <thead className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                        <tr>
                                            <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-500"><Calendar size={14} className="inline mr-1"/> Date</th>
                                            <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-500"><FileText size={14} className="inline mr-1"/> Trans No</th>
                                            <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 text-green-700 dark:text-green-500"><Tag size={14} className="inline mr-1"/> Grade</th>
                                            <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-600 bg-orange-50 dark:bg-orange-950/30 text-center text-green-700 dark:text-green-500"><Weight size={14} className="inline mr-1"/> Qty (Kg)</th>
                                            <th className="px-4 py-3 border-r border-gray-200 dark:border-zinc-600 text-center bg-gray-100 dark:bg-zinc-800">Daily Total (Kg)</th>
                                            {!isViewer && <th className="px-4 py-3 text-center">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                        {manualRecordsWithSpan.length > 0 ? (
                                            manualRecordsWithSpan.map((record) => (
                                                <tr key={record._id} className="hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group">
                                                    {record.isFirstOfDate && (
                                                        <td rowSpan={record.dateRowSpan} className="px-4 py-4 border-r border-b border-gray-200 dark:border-zinc-700 align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toISOString().split('T')[0]}</span>
                                                            {record.isEdited && (
                                                                <div className="mt-1.5 text-[10px] bg-teal-50 dark:bg-teal-900 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 px-2 py-1 rounded font-medium w-max leading-tight">
                                                                    <span className="font-bold">Edited by {record.editedBy}</span><br />
                                                                    <span className="opacity-100">{record.lastUpdatedDate}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                    
                                                    <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                        <span className="font-semibold text-[#0d9488] dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded">{record.transactionNo}</span>
                                                    </td>
                                                    
                                                    <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px">
                                                        <div className="flex flex-col w-full h-full">
                                                            {record.itemsArray.map((t, i) => (
                                                                <div key={i} className={`flex-1 flex items-center px-4 py-3 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0 ${getTeaColor(t.grade)}`}>
                                                                    {t.grade}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="p-0 border-r border-gray-200 dark:border-zinc-700 align-top h-px bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                        <div className="flex flex-col w-full h-full">
                                                            {record.itemsArray.map((t, i) => (
                                                                <div key={i} className="flex-1 flex items-center justify-center px-3 py-3 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-zinc-700 last:border-b-0">
                                                                    <span className="text-gray-600 dark:text-green-500 text-base">{Number(t.qtyKg).toFixed(4)}</span>                                                                
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="px-3 py-4 text-center border-r border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 align-top">
                                                        <span className="font-bold text-green-700 dark:text-green-400 text-lg">{Number(record.totalQtyKg).toFixed(4)}</span>
                                                    </td>
                                                    
                                                    {!isViewer && (
                                                        <td className="px-3 py-4 text-center align-top bg-white dark:bg-zinc-900 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800">
                                                            <div className="flex flex-wrap items-center justify-center gap-1">
                                                                <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-teal-600 rounded transition-colors"><MdOutlineEdit size={20} /></button>
                                                                {isAdmin && (
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild><button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 rounded transition-colors"><MdOutlineDeleteOutline size={20} /></button></AlertDialogTrigger>
                                                                        <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-[90vw]">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="text-xl font-bold dark:text-gray-100">Delete Record</AlertDialogTitle>
                                                                                <AlertDialogDescription className="dark:text-gray-400">Are you sure you want to delete this record?</AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel onClick={() => setRecordToDelete(null)} className="dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700 rounded-xl">Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700 rounded-xl">Delete</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={isViewer ? "5" : "6"} className="p-16 text-center text-gray-400">No manual records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* --- 3. REJECTED TRANSFERS TAB --- */}
                            {activeTab === 'rejected' && (
                                <table className="w-full text-sm text-left border-collapse min-w-full">
                                    <thead className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 uppercase text-[11px] font-bold tracking-wider border-b border-red-100 dark:border-red-900/50">
                                        <tr>
                                            <th className="px-6 py-4 border-r border-red-100 dark:border-red-900/50"><Calendar size={14} className="inline mr-1"/> Rejected Date</th>
                                            <th className="px-6 py-4 border-r border-red-100 dark:border-red-900/50"><FileText size={14} className="inline mr-1"/> Factory Ref No</th>
                                            <th className="px-6 py-4 text-center border-r border-red-100 dark:border-red-900/50"><Truck size={14} className="inline mr-1"/> Sent By</th>
                                            <th className="px-6 py-4 text-center border-r border-red-100 dark:border-red-900/50"><UserCheck size={14} className="inline mr-1"/> Rejected By</th>
                                            <th className="px-6 py-4 border-r border-red-100 dark:border-red-900/50"><Tag size={14} className="inline mr-1"/> Grade / Type</th>
                                            <th className="px-6 py-4 text-center"><Weight size={14} className="inline mr-1"/> Sent Qty (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {rejectedRecords.length > 0 ? (
                                            rejectedRecords.map((record) => (
                                                <tr key={record._id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-zinc-800">
                                                        {new Date(record.updatedAt).toISOString().split('T')[0]}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800">
                                                        <span className="font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">{record.transferNo}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-zinc-800 font-medium">
                                                        {record.factoryUsername || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center border-r border-gray-100 dark:border-zinc-800">
                                                        <span className="font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded text-[11px] uppercase tracking-wider">
                                                            {record.acceptedBy || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800">
                                                        <span className={`font-bold border px-2.5 py-1 rounded shadow-sm text-xs ${getTeaColor(record.grade)}`}>
                                                            {record.teaType && record.teaType.trim() !== "" ? record.teaType : record.grade}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-black text-gray-700 dark:text-gray-300 text-base">
                                                        {Number(record.sentQtyKg).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="p-16 text-center text-gray-400">No rejected transfers found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                        </div>
                    )}
                </div>

                {/* RIGHT: SUMMARY TABLE (Col Span 1) */}
                <div className="xl:col-span-1 w-full">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Weight size={18} className="text-[#0d9488] dark:text-teal-500" /> Summary By Grade
                            </h3>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Grade</th>
                                        <th className="px-3 py-2 text-right font-bold">Total (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([gradeName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getTeaColor(gradeName)}`}>
                                                    {gradeName}
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
                                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-500">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-500">TOTAL</td>
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