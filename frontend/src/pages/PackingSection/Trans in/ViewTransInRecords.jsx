import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Calendar, RefreshCw, PackageCheck, Weight, Tag, FilterX, UserCheck } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

// Exact Colors based on your setup
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p === 'bopf') return 'bg-[#fde047] text-yellow-900 border-yellow-500'; 
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p === 'dust') return 'bg-[#3b82f6] text-white border-blue-600'; 
    if (p === 'dust 1') return 'bg-[#06b6d4] text-white border-cyan-500'; 
    if (p.includes('premium')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awuru')) return 'bg-[#c084fc] text-white border-purple-500'; 
    if (p === 't/b 25') return 'bg-[#ef4444] text-white border-red-600'; // Brand specific
    if (p === 't/b 100') return 'bg-[#78350f] text-white border-amber-900'; 
    if (p.includes('green')) return 'bg-[#4ade80] text-green-900 border-green-600'; 
    if (p.includes('labour')) return 'bg-gray-200 text-gray-800 border-gray-400'; 
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-600'; 
};

// Exact RGB Colors for PDF Generation
const getPdfTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p === 'bopf') return { fillColor: [253, 224, 71], textColor: [113, 63, 18] }; 
    if (p.includes('bopf sp')) return { fillColor: [190, 242, 100], textColor: [77, 124, 15] }; 
    if (p === 'dust') return { fillColor: [59, 130, 246], textColor: [255, 255, 255] }; 
    if (p === 'dust 1') return { fillColor: [6, 182, 212], textColor: [255, 255, 255] }; 
    if (p.includes('premium')) return { fillColor: [244, 114, 182], textColor: [255, 255, 255] }; 
    if (p.includes('awuru')) return { fillColor: [192, 132, 252], textColor: [255, 255, 255] }; 
    if (p === 't/b 25') return { fillColor: [239, 68, 68], textColor: [255, 255, 255] }; 
    if (p === 't/b 100') return { fillColor: [120, 53, 15], textColor: [255, 255, 255] }; 
    if (p.includes('green')) return { fillColor: [74, 222, 128], textColor: [20, 83, 45] }; 
    if (p.includes('labour')) return { fillColor: [229, 231, 235], textColor: [31, 41, 55] }; 
    return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; 
};

const TEA_TYPES = [
    "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Green tea (25)", "New edition", "Pitigala tea bags", 
    "Pitigala tea 400g", "Awurudu Special", "Labour drinking tea,green tea bags"
];

export default function ViewTransInRecords() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- FILTER STATES ---
    const [filterMonth, setFilterMonth] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchHistory();
        
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchHistory = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/packing/transfers/completed`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch transfer history");

            const data = await response.json();
            
            // Process data for easy searching and PDF rendering
            const processedData = data.map(rec => {
                const searchString = rec.items.map(item => item.product).join(' ');
                return { ...rec, searchString };
            });

            setRecords(processedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not load transfer history.");
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const rDate = new Date(record.dateReceived).toISOString().split('T')[0];
        const monthMatch = !filterMonth || rDate.startsWith(filterMonth);
        const dateMatch = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
        const productMatch = !productFilter || record.searchString.toLowerCase().includes(productFilter.toLowerCase());
        return monthMatch && dateMatch && productMatch;
    });

    const grandTotalReceivedQty = filteredRecords.reduce((sum, record) => {
        const recTotal = record.items.reduce((itemSum, item) => itemSum + (Number(item.receivedQtyKg) || 0), 0);
        return sum + recTotal;
    }, 0);

    // --- GENERATE DATA FOR SUMMARY TABLE ---
    const productSummaryMap = {};
    filteredRecords.forEach(record => {
        record.items.forEach(item => {
            if (!productSummaryMap[item.product]) productSummaryMap[item.product] = 0;
            productSummaryMap[item.product] += Number(item.receivedQtyKg) || 0;
        });
    });
    const summaryArray = Object.entries(productSummaryMap).sort((a, b) => b[1] - a[1]);

    const clearFilters = () => {
        setFilterMonth('');
        setStartDate('');
        setEndDate('');
        setProductFilter('');
    };

    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        if (endDate && e.target.value > endDate) setEndDate(''); 
    };

    // --- PDF GENERATION LOGIC ---
    const getPdfData = () => {
        const pdfSortedRecords = [...filteredRecords].sort((a, b) => new Date(a.dateReceived) - new Date(b.dateReceived));
        const tableRows = [];

        pdfSortedRecords.forEach(record => {
            const baseDate = new Date(record.dateReceived).toISOString().split('T')[0];

            record.items.forEach((item, index) => {
                const isFirst = index === 0;
                
                tableRows.push([
                    isFirst ? record.transferId : "",
                    isFirst ? baseDate : "",
                    { 
                        content: item.product, 
                        styles: { ...getPdfTeaColor(item.product), fontStyle: 'bold', halign: 'center' } 
                    },
                    `${Number(item.issuedQtyKg).toFixed(2)} kg`,
                    `${Number(item.receivedQtyKg).toFixed(2)} kg`,
                    isFirst ? record.issuedBy : "",
                    isFirst ? record.receivedBy : ""
                ]);
            });
        });

        tableRows.push([
            { content: "GRAND TOTAL RECEIVED", colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `${grandTotalReceivedQty.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [13, 148, 136] } },
            "-", "-"
        ]);

        return tableRows;
    };

    const uniqueCode = `PS/TRANS-IN/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackageCheck size={28} /> Trans In Records
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">History of bulk stock received from Handmade section</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Trans In (Received) Records"
                        subtitle={`Filters -> Month: ${filterMonth || 'All'} | Date: ${startDate || 'All'} to ${endDate || 'All'} | Product: ${productFilter || 'All'}`}
                        headers={["Transfer ID", "Date Received", "Product", "Issued Qty", "Received Qty", "Issued By", "Received By"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Trans_In_Records_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="portrait" 
                        disabled={loading || filteredRecords.length === 0}
                    />
                    <button onClick={fetchHistory} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-teal-200 dark:border-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh History
                    </button>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm transition-colors duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month Received</label>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-600 bg-transparent dark:text-gray-100 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={handleStartDateChange} className="w-full border border-gray-300 dark:border-zinc-600 bg-transparent dark:text-gray-100 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">To Date</label>
                        <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!startDate} className="w-full border border-gray-300 dark:border-zinc-600 bg-transparent dark:text-gray-100 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors disabled:opacity-50" />
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
                            className="w-full border border-gray-300 dark:border-zinc-600 bg-transparent dark:text-gray-100 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf]/50 transition-colors" 
                        />
                        {isDropdownOpen && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                {TEA_TYPES.filter(t => t.toLowerCase().includes(productFilter.toLowerCase()))
                                    .map((tea, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setProductFilter(tea);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-zinc-700 cursor-pointer border-b border-gray-100 dark:border-zinc-700 last:border-0 flex items-center gap-2"
                                    >
                                        <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex items-end lg:justify-end">
                        <button onClick={clearFilters} disabled={!filterMonth && !startDate && !endDate && !productFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${filterMonth || startDate || endDate || productFilter ? 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-600 border border-gray-300 dark:border-zinc-600' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 border border-gray-200 dark:border-zinc-800 cursor-not-allowed'}`}>
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
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-teal-200 dark:border-zinc-700 border-t-[#0f766e] dark:border-t-teal-400 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading history...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-600">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wider border-b border-gray-300 dark:border-zinc-600">
                                        <th className="px-4 py-3 font-bold border-r border-gray-300 dark:border-zinc-600 align-bottom">Record Details</th>
                                        <th className="px-4 py-3 font-bold border-r border-gray-300 dark:border-zinc-600 align-bottom"><Tag size={14} className="inline mr-1 text-[#0d9488]"/> Products Included</th>
                                        <th className="px-4 py-3 font-bold border-r border-gray-300 dark:border-zinc-600 text-center"><Weight size={14} className="inline mr-1"/> Issued (Kg)</th>
                                        <th className="px-4 py-3 font-bold border-r border-gray-300 dark:border-zinc-600 text-center text-[#0f766e] dark:text-teal-400"><Weight size={14} className="inline mr-1"/> Received (Kg)</th>
                                        <th className="px-4 py-3 font-bold border-r border-gray-300 dark:border-zinc-600 text-center">Variance</th>
                                        <th className="px-4 py-3 font-bold text-center">Involved Staff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => (
                                            <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                                                
                                                <td className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 align-top">
                                                    <p className="font-black text-gray-900 dark:text-gray-100 text-md">{record.transferId}</p>
                                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                                                        <Calendar size={12} /> Received: {new Date(record.dateReceived).toISOString().split('T')[0]}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {record.items.map((t, i) => (
                                                            <span key={i} className={`block font-bold border px-2 py-0.5 rounded shadow-sm w-fit text-[11px] ${getTeaColor(t.product)}`}>
                                                                {t.product}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                <td className="px-3 py-3 text-center border-r border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 font-medium align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {record.items.map((t, i) => <span key={i} className="py-1">{Number(t.issuedQtyKg).toFixed(2)}</span>)}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-200 dark:border-zinc-700 font-bold bg-[#f0fdfa]/50 dark:bg-teal-900/10 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {record.items.map((t, i) => <span key={i} className="py-1 text-[#0d9488] dark:text-teal-400">{Number(t.receivedQtyKg).toFixed(2)}</span>)}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-200 dark:border-zinc-700 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        {record.items.map((t, i) => {
                                                            const diff = Number(t.receivedQtyKg) - Number(t.issuedQtyKg);
                                                            return (
                                                                <span key={i} className={`py-1 font-bold text-[11px] ${diff === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-orange-500 dark:text-orange-400'}`}>
                                                                    {diff === 0 ? 'Match' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 text-left align-top text-xs text-gray-600 dark:text-gray-400">
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <div className="flex items-center gap-1.5"><Tag size={12} className="opacity-50"/> <span className="font-semibold text-gray-800 dark:text-gray-200">{record.issuedBy}</span> (Out)</div>
                                                        <div className="flex items-center gap-1.5"><UserCheck size={12} className="opacity-50"/> <span className="font-semibold text-[#0d9488] dark:text-teal-400">{record.receivedBy}</span> (In)</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="p-16 text-center text-gray-400 dark:text-gray-500"><p>No received records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RIGHT: SUMMARY TABLE (Col Span 1) */}
                <div className="xl:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Weight size={18} className="text-[#0d9488]" /> Total Received Summary
                            </h3>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-700 dark:text-gray-200">Product</th>
                                        <th className="px-3 py-2 text-right font-bold dark:text-gray-200">Qty (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([prodName, qty], idx) => (
                                            <tr key={idx} className="border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                <td className={`px-3 py-2 font-semibold border-r border-gray-200 dark:border-zinc-700 ${getTeaColor(prodName)}`}>
                                                    {prodName}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">
                                                    {qty % 1 !== 0 ? qty.toFixed(2) : qty}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#f0fdfa]/50 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-[#0f766e] dark:border-teal-600">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-700 text-[#0f766e] dark:text-teal-400">TOTAL</td>
                                        <td className="px-3 py-2 text-right text-[#0f766e] dark:text-teal-400">{grandTotalReceivedQty % 1 !== 0 ? grandTotalReceivedQty.toFixed(2) : grandTotalReceivedQty}</td>
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