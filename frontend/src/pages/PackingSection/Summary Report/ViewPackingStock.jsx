import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, PackageSearch, Warehouse, PackageOpen, FilterX, Box, Weight } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

// Comprehensive Color Mapping for EVERY Tea Product
const getTeaColor = (product) => {
    const p = product?.toLowerCase() || '';
    
    if (p.includes('ff ex sp')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50';
    if (p.includes('ff sp')) return 'bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800/50';
    if (p.includes('bopf')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50';
    if (p.includes('fbop')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50';
    if (p.includes('bop')) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800/50';
    if (p.includes('op1')) return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/50';
    if (p.includes('pekoe')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50';
    if (p.includes('dust')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/50';
    
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
    
    return 'bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700'; 
};

// PDF Colors for Inventory
const getPdfTeaColor = (product) => {
    const p = product?.toLowerCase() || '';
    if (p.includes('ff ex sp')) return { fillColor: [254, 226, 226], textColor: [153, 27, 27] };
    if (p.includes('ff sp')) return { fillColor: [254, 215, 170], textColor: [124, 45, 18] };
    if (p.includes('bopf')) return { fillColor: [254, 240, 138], textColor: [113, 63, 18] };
    if (p.includes('fbop')) return { fillColor: [254, 243, 199], textColor: [146, 64, 14] };
    if (p.includes('bop')) return { fillColor: [236, 252, 203], textColor: [63, 98, 18] };
    if (p.includes('op1')) return { fillColor: [224, 242, 254], textColor: [7, 89, 133] };
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
    return { fillColor: [249, 250, 251], textColor: [31, 41, 55] }; 
};

export default function ViewPackingStock() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState(''); 

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/packing-stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if(response.status === 401) throw new Error("Unauthorized. Please log in.");
                throw new Error("Failed to fetch inventory data");
            }

            const data = await response.json();
            // Ensure data is always an array
            setStocks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message);
            setStocks([]); // Fallback to empty array on error
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic safely checks against undefined properties
    const filteredStocks = stocks.filter(stock => {
        const pName = stock.productName || '';
        const matchesSearch = !searchQuery || pName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSource = !sourceFilter || stock.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    // Grand Totals for Top Cards (Safely handles undefined/null values)
    const totalBulkKg = filteredStocks.reduce((sum, stock) => sum + (Number(stock.bulkStockKg) || 0), 0);
    const grandTotalKg = filteredStocks.reduce((sum, stock) => sum + (Number(stock.totalOverallQtyKg) || 0), 0);
    const totalPackedKg = grandTotalKg - totalBulkKg;

    // Calculate Grand Total Boxes for the Summary Footer
    const grandTotalBoxes = filteredStocks.reduce((sum, stock) => {
        const stockBoxes = stock.packedItems?.reduce((bSum, item) => bSum + (Number(item.numberOfBoxes) || 0), 0) || 0;
        return sum + stockBoxes;
    }, 0);

    // Summary Array for the right-side table (Sorted by highest total qty)
    const summaryArray = [...filteredStocks].sort((a, b) => (Number(b.totalOverallQtyKg) || 0) - (Number(a.totalOverallQtyKg) || 0));

    const clearFilters = () => {
        setSearchQuery('');
        setSourceFilter('');
    };

    // PDF GENERATION LOGIC
    const getPdfData = () => {
        const pdfSortedStocks = [...filteredStocks].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        const tableRows = [];

        pdfSortedStocks.forEach(stock => {
            if (stock.packedItems && stock.packedItems.length > 0) {
                stock.packedItems.forEach((item, index) => {
                    const isFirst = index === 0;
                    tableRows.push([
                        isFirst ? { content: stock.productName || 'Unknown', styles: { ...getPdfTeaColor(stock.productName), fontStyle: 'bold', halign: 'center' } } : "",
                        isFirst ? stock.source || '-' : "",
                        isFirst ? `${(Number(stock.bulkStockKg) || 0).toFixed(2)} kg` : "",
                        `${item.packSizeKg || 0} kg`,
                        (item.numberOfBoxes || 0).toString(),
                        `${(Number(item.totalQtyKg) || 0).toFixed(2)} kg`,
                        isFirst ? `${(Number(stock.totalOverallQtyKg) || 0).toFixed(2)} kg` : ""
                    ]);
                });
            } else {
                tableRows.push([
                    { content: stock.productName || 'Unknown', styles: { ...getPdfTeaColor(stock.productName), fontStyle: 'bold', halign: 'center' } },
                    stock.source || '-',
                    `${(Number(stock.bulkStockKg) || 0).toFixed(2)} kg`,
                    "-",
                    "-",
                    "-",
                    `${(Number(stock.totalOverallQtyKg) || 0).toFixed(2)} kg`
                ]);
            }
        });

        tableRows.push([
            { content: "GRAND TOTALS", styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 2 },
            { content: `${totalBulkKg.toFixed(2)} kg`, styles: { fontStyle: 'bold' } },
            "-", "-",
            { content: `${totalPackedKg.toFixed(2)} kg`, styles: { fontStyle: 'bold' } },
            { content: `${grandTotalKg.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [15, 118, 110] } }
        ]);

        return tableRows;
    };

    const uniqueCode = `INV/PACK/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen transition-colors duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackageSearch size={28} /> Available Packing Stock
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time overview of bulk and packed tea stock</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Packing Section Inventory"
                        subtitle={`Filters -> Search: ${searchQuery || 'All'} | Source: ${sourceFilter || 'All'}`}
                        headers={["Product", "Source", "Bulk Stock", "Grand Total"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Packing_Inventory_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="portrait" 
                        disabled={loading || filteredStocks.length === 0}
                    />
                    <button onClick={fetchStocks} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-[#0d9488] dark:border-teal-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh Stock
                    </button>
                </div>
            </div>

            {/* --- SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Warehouse size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Bulk Tea</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">{totalBulkKg.toFixed(2)} <span className="text-sm font-medium text-gray-500">kg</span></h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Box size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Packed Tea</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">{totalPackedKg.toFixed(2)} <span className="text-sm font-medium text-gray-500">kg</span></h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                        <PackageSearch size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Grand Total</p>
                        <h3 className="text-2xl font-black text-[#0f766e] dark:text-teal-400">{grandTotalKg.toFixed(2)} <span className="text-sm font-medium text-gray-500">kg</span></h3>
                    </div>
                </div>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Search Product</label>
                        <input 
                            type="text" 
                            placeholder="e.g. BOPF, Premium..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Filter by Source</label>
                        <select 
                            value={sourceFilter} 
                            onChange={(e) => setSourceFilter(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors"
                        >
                            <option value="">All Sources</option>
                            <option value="Factory">Factory</option>
                            <option value="Handmade">Handmade</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="flex items-end lg:justify-end">
                        <button onClick={clearFilters} disabled={!searchQuery && !sourceFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${searchQuery || sourceFilter ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-not-allowed'}`}>
                            <FilterX size={16} /> Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN GRID LAYOUT --- */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* LEFT: MAIN INVENTORY TABLE (Col Span 3) */}
                <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden w-full transition-colors duration-300 self-start">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading inventory...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                        <th className="px-4 py-4 font-bold border-r border-gray-200 dark:border-zinc-500 min-w-[180px]">Product Name</th>
                                        <th className="px-4 py-4 font-bold border-r border-gray-200 dark:border-zinc-500 text-center">Source</th>
                                        <th className="px-4 py-4 font-bold text-amber-700 dark:text-amber-500 border-r border-gray-200 dark:border-zinc-600 bg-amber-50/50 dark:bg-amber-950/20 text-center"><Warehouse size={14} className="inline mr-1"/> Bulk Stock (Kg)</th>
                                        
                                        {/* Packed Items Breakdown */}
                                        
                                        <th className="px-4 py-4 font-bold text-[#0f766e] dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/20 text-center text-sm">Grand Total (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                    {filteredStocks.length > 0 ? (
                                        filteredStocks.map((stock) => (
                                            <tr key={stock._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                
                                                {/* Product Name */}
                                                <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top">
                                                    <span className={`block font-bold border px-3 py-1 rounded shadow-sm w-fit ${getTeaColor(stock.productName)}`}>
                                                        {stock.productName || 'Unknown'}
                                                    </span>
                                                    <div className="mt-2 text-[10px] text-gray-400 font-medium">
                                                        Updated: {stock.updatedAt ? new Date(stock.updatedAt).toISOString().split('T')[0] : '-'}
                                                    </div>
                                                </td>

                                                {/* Source Badge */}
                                                <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${stock.source === 'Handmade' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {stock.source || '-'}
                                                    </span>
                                                </td>

                                                {/* Bulk Stock */}
                                                <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-700 align-top text-center bg-amber-50/20 dark:bg-amber-950/10">
                                                    <span className="font-black text-amber-700 dark:text-amber-500 text-lg">{(Number(stock.bulkStockKg) || 0).toFixed(2)}</span>
                                                </td>

                                                

                                                

                                                {/* Grand Total */}
                                                <td className="px-4 py-4 text-center align-top bg-teal-50/10 dark:bg-teal-950/10">
                                                    <span className="font-black text-[#0f766e] dark:text-teal-400 text-xl">{(Number(stock.totalOverallQtyKg) || 0).toFixed(2)}</span>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="7" className="p-16 text-center text-gray-400"><p>No inventory records found</p></td></tr>
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
                                <Weight size={18} className="text-[#0d9488] dark:text-teal-500" /> Summary By Product
                            </h3>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                        <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Product</th>
                                        <th className="px-3 py-2 text-center font-bold border-r border-gray-300 dark:border-zinc-500">Total Boxes</th>
                                        <th className="px-3 py-2 text-right font-bold">Total Qty (Kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryArray.length > 0 ? (
                                        summaryArray.map((stock, idx) => {
                                            const totalQty = Number(stock.totalOverallQtyKg) || 0;
                                            const totalBoxes = stock.packedItems?.reduce((sum, item) => sum + (Number(item.numberOfBoxes) || 0), 0) || 0;
                                            
                                            return (
                                                <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                    <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getTeaColor(stock.productName)}`}>
                                                        {stock.productName || 'Unknown'}
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-zinc-500">
                                                        {totalBoxes}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                                        {totalQty % 1 !== 0 ? totalQty.toFixed(2) : totalQty}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-500">
                                        <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-500">TOTAL</td>
                                        <td className="px-3 py-2 text-center border-r border-gray-300 dark:border-zinc-500">{grandTotalBoxes}</td>
                                        <td className="px-3 py-2 text-right">{grandTotalKg % 1 !== 0 ? grandTotalKg.toFixed(2) : grandTotalKg}</td>
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