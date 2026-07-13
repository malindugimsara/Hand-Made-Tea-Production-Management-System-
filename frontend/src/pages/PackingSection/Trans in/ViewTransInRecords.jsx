import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Calendar, RefreshCw, PackageCheck, Weight, Tag, FilterX, UserCheck } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

// Exact Colors based on your setup
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    if (p.includes('ff ex sp')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50 rounded shadow-sm';
    if (p.includes('ff sp')) return 'bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800/50 rounded shadow-sm';
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500 rounded shadow-sm'; 
    if (p.includes('bopf')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50 rounded shadow-sm';
    if (p.includes('fbop')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50 rounded shadow-sm';
    if (p.includes('bop')) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800/50 rounded shadow-sm';
    if (p.includes('op1') || p.includes('op 1')) return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/50 rounded shadow-sm';
    if (p.includes('pekoe')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50 rounded shadow-sm';
    if (p.includes('dust')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/50 rounded shadow-sm';
    
    if (p.includes('pink')) return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800/50 rounded shadow-sm';
    if (p.includes('purple')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50 rounded shadow-sm';
    if (p.includes('silver')) return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded shadow-sm';
    if (p.includes('white')) return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 rounded shadow-sm';
    if (p.includes('golden') || p.includes('turmeric')) return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800/50 rounded shadow-sm';
    if (p.includes('orange') || p.includes('cinnamon')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800/50 rounded shadow-sm';
    if (p.includes('black') || p.includes('pepar')) return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 rounded shadow-sm';
    if (p.includes('lemangrass') || p.includes('green')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800/50 rounded shadow-sm';
    if (p.includes('premium')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50 rounded shadow-sm';
    if (p.includes('awrudu') || p.includes('awuru')) return 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800/50 rounded shadow-sm';
    if (p.includes('slim beauty')) return 'bg-fuchsia-200 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-800/50 rounded shadow-sm';
    if (p.includes('masala')) return 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/50 rounded shadow-sm';
    if (p.includes('chakra')) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/50 rounded shadow-sm';
    if (p.includes('flower')) return 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800/50 rounded shadow-sm';
    if (p.includes('labour')) return 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 rounded shadow-sm';
    if (p.includes('other purchasing')) return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800/50 rounded shadow-sm';
    
    return ''; 
};

// අලුත් Function එක: මේකෙන් border සහ rounded වගේ class අයින් කරලා bg සහ text class විතරක් ගන්නවා.
// මේක පාවිච්චි කරන්නේ පින්තූරේ විදිහට Summary Table එකේ මුළු කොටුවම (Cell) පාට කරන්නයි.
const getSafeBgColor = (product) => {
    const fullClass = getTeaColor(product) || '';
    return fullClass.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-') || c.startsWith('dark:bg-') || c.startsWith('dark:text-')).join(' ');
};

const getPdfTeaColor = (product) => {
    // ... (Keep your exact PDF color logic here, no changes needed)
    return { fillColor: [249, 250, 251], textColor: [31, 41, 55] }; 
};

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

  const filteredRecords = records.reduce((acc, record) => {
    // Date එක අරගෙන මාසය සහ දිනය ගැලපෙනවද කියලා බලනවා
    const rDate = new Date(record.dateReceived || record.date).toISOString().split('T')[0];
    const monthMatch = !filterMonth || rDate.startsWith(filterMonth);
    const dateMatch = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
    
    // මාසය හෝ දිනය ගැලපෙන්නේ නැත්නම් මේ record එක අතහරින්න
    if (!monthMatch || !dateMatch) return acc;

    // record එක ඇතුලේ තියෙන items ටික ගන්න. (undefined ආවොත් crash නොවෙන්න || [] දාලා තියෙනවා)
    let matchedItems = record.items || []; 
    
    if (productFilter) {
        // exact match (===) භාවිතා කර ෆිල්ටර් කරයි. (උදා: BOPF සෙවූ විට BOPF SP අහුවෙන්නේ නැත)
        matchedItems = matchedItems.filter(
            item => item.product?.toLowerCase() === productFilter.toLowerCase()
        );
    }

    // ගැලපෙන items එකක් හෝ තියෙනවා නම් පමණක් එය පෙන්නන්න
    if (matchedItems.length > 0) {
        acc.push({
            ...record,
            items: matchedItems // මුළු දවසේම දත්ත වෙනුවට, සෙවුමට ගැලපෙන items පමණක් replace කරයි
        });
    }

    return acc;
}, []);

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
                        <PackageCheck size={28} /> Trans In H/T Records
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
                                        <div className={`w-3 h-3 ${getTeaColor(tea)} border border-white/20`}></div> {tea}
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
                
                {/* LEFT: MAIN TABLE (Col Span 3) - Rowspan එක පාවිච්චි කරලා "එක පෙළියට" හදලා තියෙනවා */}
                <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden self-start w-full transition-colors duration-300">
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
                                
                                <tbody className="divide-y divide-gray-200/40 dark:divide-zinc-700/40 border-b border-gray-200 dark:border-zinc-600">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => (
                                            <React.Fragment key={record._id}>
                                                {record.items.map((t, i) => {
                                                    const diff = Number(t.receivedQtyKg) - Number(t.issuedQtyKg);
                                                    const isFirst = i === 0;
                                                    const rowCount = record.items.length;
                                                    
                                                    return (
                                                        <tr key={`${record._id}-${i}`} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                                            
                                                            {/* 1. Record Details (Spans across all items for this record) */}
                                                            {isFirst && (
                                                                <td rowSpan={rowCount} className="px-4 py-3 border-r border-gray-200 dark:border-zinc-700 align-top bg-white dark:bg-zinc-900">
                                                                    <p className="font-black text-gray-900 dark:text-gray-100 text-md">{record.transferId}</p>
                                                                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                                                                        <Calendar size={12} /> Received: {new Date(record.dateReceived).toISOString().split('T')[0]}
                                                                    </div>
                                                                    
                                                                    {/* --- Added Remarks Section --- */}
                                                                    {record.remarks && (
                                                                        <div className="mt-2.5 text-[11px] text-gray-600 dark:text-gray-400 whitespace-normal break-words max-w-[180px] leading-relaxed bg-amber-50/50 dark:bg-amber-900/10 p-1.5 rounded-md border border-amber-100 dark:border-amber-900/30">
                                                                            <span className="font-bold text-amber-700 dark:text-amber-500 block mb-0.5">Remark:</span>
                                                                            <span className="italic">{record.remarks}</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                            
                                                            {/* 2. Products Included (එක අයිටම් එකක් එක පේළියකට එනවා) */}
                                                            <td className="px-4 py-3 border-r border-gray-200/50 dark:border-zinc-700/50 align-middle">
                                                                <span className={`inline-block font-bold border px-2 py-0.5 rounded shadow-sm w-fit text-[11px] ${getTeaColor(t.product)}`}>
                                                                    {t.product}
                                                                </span>
                                                            </td>
                                                            
                                                            {/* 3. Issued (Kg) */}
                                                            <td className="px-3 py-3 text-center border-r border-gray-200/50 dark:border-zinc-700/50 text-gray-600 dark:text-gray-300 font-medium align-middle">
                                                                {Number(t.issuedQtyKg).toFixed(2)}
                                                            </td>

                                                            {/* 4. Received (Kg) */}
                                                            <td className="px-3 py-3 text-center border-r border-gray-200/50 dark:border-zinc-700/50 font-bold bg-[#f0fdfa]/40 dark:bg-teal-900/10 align-middle">
                                                                <span className="text-[#0d9488] dark:text-teal-400">{Number(t.receivedQtyKg).toFixed(2)}</span>
                                                            </td>

                                                            {/* 5. Variance */}
                                                            <td className="px-3 py-3 text-center border-r border-gray-200 dark:border-zinc-700 align-middle">
                                                                <span className={`font-bold text-[11px] ${diff === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-orange-500 dark:text-orange-400'}`}>
                                                                    {diff === 0 ? 'Match' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`}
                                                                </span>
                                                            </td>

                                                            {/* 6. Involved Staff (Spans across all items) */}
                                                            {isFirst && (
                                                                <td rowSpan={rowCount} className="px-3 py-3 text-left align-top text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900">
                                                                    <div className="flex flex-col gap-1 mt-1">
                                                                        <div className="flex items-center gap-1.5"><Tag size={12} className="opacity-50"/> <span className="font-semibold text-gray-800 dark:text-gray-200">{record.issuedBy}</span> (Out)</div>
                                                                        <div className="flex items-center gap-1.5"><UserCheck size={12} className="opacity-50"/> <span className="font-semibold text-[#0d9488] dark:text-teal-400">{record.receivedBy}</span> (In)</div>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="p-16 text-center text-gray-400 dark:text-gray-500"><p>No received records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RIGHT: SUMMARY TABLE (Col Span 1) - ඔයා දුන්න පින්තූරේ විදිහට හරියටම Design කරලා තියෙන්නේ */}
                <div className="xl:col-span-1">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden sticky top-8">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Weight size={18} className="text-[#0d9488]" /> Total Received Summary
                            </h3>
                        </div>
                        {/* padding අයින් කරලා තියෙන්නේ කොටුව සම්පූර්ණයෙන්ම පාට වෙන්න */}
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map(([prodName, qty], idx) => (
                                            // Zebra striping එකත් දාලා තියෙනවා (even:bg-[#f8fafc])
                                            <tr key={idx} className="bg-white even:bg-[#f8fafc] dark:bg-zinc-900 dark:even:bg-zinc-800/80 transition-colors">
                                                
                                                {/* Cell එක සම්පූර්ණයෙන්ම පාට කරන්න getSafeBgColor පාවිච්චි කලා */}
                                                <td className={`px-4 py-3 font-bold border-r border-gray-100 dark:border-zinc-800 w-2/3 ${getSafeBgColor(prodName)}`}>
                                                    {prodName}
                                                </td>
                                                
                                                {/* අංක ටික මැදට (text-center) එන්න හදලා තියෙනවා */}
                                                <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-gray-200 w-1/3">
                                                    {qty % 1 !== 0 ? qty.toFixed(2) : qty}
                                                </td>
                                                
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="2" className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#f0fdfa] dark:bg-teal-950/30 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-[#0f766e] dark:border-teal-600">
                                        <td className="px-4 py-3 uppercase border-r border-gray-200 dark:border-teal-800 text-[#0f766e] dark:text-teal-400 text-right">TOTAL</td>
                                        <td className="px-4 py-3 text-center text-[#0f766e] dark:text-teal-400">{grandTotalReceivedQty % 1 !== 0 ? grandTotalReceivedQty.toFixed(2) : grandTotalReceivedQty}</td>
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