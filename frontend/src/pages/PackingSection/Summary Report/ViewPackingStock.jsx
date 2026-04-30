import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, PackageSearch, Warehouse, FilterX, Box, Weight, Layers, PackagePlus, ArrowDownToLine, ArrowUpFromLine, Leaf } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

// --- COLOR MAPPINGS ---
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
    if (p.includes('masala')) return 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/50';
    return 'bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700'; 
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

const getPdfColor = (name, type) => {
    if (type === 'raw') return { fillColor: [244, 244, 245], textColor: [31, 41, 55] }; 
    const p = name?.toLowerCase() || '';
    if (p.includes('ff ex sp')) return { fillColor: [254, 226, 226], textColor: [153, 27, 27] };
    if (p.includes('bopf')) return { fillColor: [254, 240, 138], textColor: [113, 63, 18] };
    if (p.includes('pekoe')) return { fillColor: [209, 250, 229], textColor: [6, 78, 59] };
    if (p.includes('green')) return { fillColor: [220, 252, 231], textColor: [22, 101, 52] };
    return { fillColor: [249, 250, 251], textColor: [31, 41, 55] }; 
};

export default function ViewPackingStock() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [activeTab, setActiveTab] = useState('tea'); 
    
    // --- TEA STOCK STATES ---
    const [rawStocks, setRawStocks] = useState([]);
    const [flattenedStocks, setFlattenedStocks] = useState([]);
    
    // --- RAW MATERIAL STOCK STATES ---
    const [rawMatStocks, setRawMatStocks] = useState([]);

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
            
            const [teaRes, rawMatRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/packing-stock`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${BACKEND_URL}/api/raw-materials-in/stock`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ ok: false })) 
            ]);

            // --- 1. PROCESS TEA STOCK ---
            if (teaRes.ok) {
                const teaData = await teaRes.json();
                const stockData = Array.isArray(teaData) ? teaData : [];
                setRawStocks(stockData);
                
                const flatData = [];
                stockData.forEach(product => {
                    const updatedAtDate = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : '';
                    
                    if (product.stockBySource && product.stockBySource.length > 0) {
                        product.stockBySource.forEach(src => {
                            if (src.quantityKg > 0 || (src.quantityKg === 0 && product.stockBySource.length === 1)) {
                                flatData.push({
                                    id: `${product._id}-${src.sourceName}`,
                                    productName: product.productName,
                                    source: src.sourceName,
                                    transInAmount: src.transInAmount || 0,
                                    issueAmount: src.issueAmount || 0,
                                    currentStock: src.quantityKg || 0,
                                    totalOverallQtyKg: product.totalBulkStockKg || 0,
                                    updatedAtDate: updatedAtDate
                                });
                            }
                        });
                    } else {
                        flatData.push({
                            id: product._id,
                            productName: product.productName,
                            source: '-',
                            transInAmount: 0,
                            issueAmount: 0,
                            currentStock: product.totalBulkStockKg || 0,
                            totalOverallQtyKg: product.totalBulkStockKg || 0,
                            updatedAtDate: updatedAtDate
                        });
                    }
                });
                
                flatData.sort((a, b) => {
                    const nameCompare = (a.productName || '').localeCompare(b.productName || '');
                    if(nameCompare !== 0) return nameCompare;
                    return (a.source || '').localeCompare(b.source || '');
                });
                setFlattenedStocks(flatData);
            }

            // --- 2. PROCESS RAW MATERIAL STOCK ---
            if (rawMatRes.ok) {
                const rmData = await rawMatRes.json();
                setRawMatStocks(Array.isArray(rmData.data || rmData) ? (rmData.data || rmData) : []);
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error connecting to server to fetch stock.");
        } finally {
            setLoading(false);
        }
    };

    // --- TEA FILTERING ---
    const filteredTeaStocks = flattenedStocks.filter(stock => {
        const pName = stock.productName || '';
        const matchesSearch = !searchQuery || pName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSource = !sourceFilter || stock.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    const filteredRawTeaStocks = rawStocks.filter(product => {
        const pName = product.productName || '';
        const matchesSearch = !searchQuery || pName.toLowerCase().includes(searchQuery.toLowerCase());
        if (sourceFilter) {
            if (product.stockBySource) return matchesSearch && product.stockBySource.some(s => s.sourceName === sourceFilter);
            else return matchesSearch && product.source === sourceFilter;
        }
        return matchesSearch;
    });

    // --- RAW MATERIAL FILTERING ---
    const filteredRawMatStocks = rawMatStocks.filter(rm => {
        const rmName = rm.materialName || '';
        return !searchQuery || rmName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // --- NEW TOTALS CALCULATION ---
    const totalTransIn = filteredTeaStocks.reduce((sum, stock) => sum + (Number(stock.transInAmount) || 0), 0);
    const totalIssue = filteredTeaStocks.reduce((sum, stock) => sum + (Number(stock.issueAmount) || 0), 0);
    const totalCurrentStock = filteredTeaStocks.reduce((sum, stock) => sum + (Number(stock.currentStock) || 0), 0);
    
    // Raw Material Totals
    const grandTotalRawTransIn = filteredRawMatStocks.reduce((sum, rm) => sum + (Number(rm.transInAmount) || 0), 0);
    const grandTotalRawIssue = filteredRawMatStocks.reduce((sum, rm) => sum + (Number(rm.issueAmount) || 0), 0);
    const grandTotalRawStock = filteredRawMatStocks.reduce((sum, rm) => sum + (Number(rm.totalQuantity) || 0), 0);

    const summaryArray = [...filteredRawTeaStocks].sort((a, b) => {
        const qtyA = Number(a.totalBulkStockKg) || 0;
        const qtyB = Number(b.totalBulkStockKg) || 0;
        return qtyB - qtyA;
    });

    const clearFilters = () => {
        setSearchQuery('');
        setSourceFilter('');
    };

    const getSourceBadgeClass = (source) => {
        if (!source) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        const s = source.toLowerCase();
        if (s === 'handmade') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        if (s === 'factory') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (s === 'other') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300';
    };

    // --- PDF GENERATION LOGIC ---
    const getPdfData = () => {
        const tableRows = [];
        
        if (activeTab === 'tea') {
            let currentProduct = null;
            filteredTeaStocks.forEach(stock => {
                const isNewProduct = currentProduct !== stock.productName;
                currentProduct = stock.productName;

                tableRows.push([
                    isNewProduct ? { content: stock.productName || 'Unknown', styles: { ...getPdfColor(stock.productName, 'tea'), fontStyle: 'bold', halign: 'center' } } : "",
                    stock.source || '-',
                    `${(Number(stock.transInAmount) || 0).toFixed(2)} kg`,
                    `${(Number(stock.issueAmount) || 0).toFixed(2)} kg`,
                    { content: `${(Number(stock.currentStock) || 0).toFixed(2)} kg`, styles: { fontStyle: 'bold' } }
                ]);
            });
            tableRows.push([
                { content: "GRAND TOTALS", styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 2 },
                { content: `${totalTransIn.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [29, 78, 216] } },
                { content: `${totalIssue.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
                { content: `${totalCurrentStock.toFixed(2)} kg`, styles: { fontStyle: 'bold', textColor: [15, 118, 110] } }
            ]);
        } else {
            filteredRawMatStocks.forEach(rm => {
                tableRows.push([
                    { content: rm.materialName || 'Unknown', styles: { ...getPdfColor(rm.materialName, 'raw'), fontStyle: 'bold' } },
                    (rm.category || 'other').toUpperCase(),
                    `${(Number(rm.transInAmount) || 0).toFixed(2)}`,
                    `${(Number(rm.issueAmount) || 0).toFixed(2)}`,
                    { content: `${(Number(rm.totalQuantity) || 0).toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    rm.unit || '-'
                ]);
            });
            tableRows.push([
                { content: "GRAND TOTALS", styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 2 },
                { content: `${grandTotalRawTransIn.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [29, 78, 216] } },
                { content: `${grandTotalRawIssue.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } },
                { content: `${grandTotalRawStock.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [15, 118, 110] } },
                ""
            ]);
        }
        return tableRows;
    };

    const uniqueCode = `INV/STK/${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()}.${new Date().getFullYear()}`;
    let previousProductName = null;

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen transition-colors duration-300  dark:bg-zinc-950">
            
            {/* --- HEADER --- */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-2">
                        <PackageSearch size={32} /> Central Inventory Stock
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Real-time overview of Bulk Tea and Raw Materials. <br/><span className="text-[#0d9488] font-bold">* Stock automatically updates during transactions.</span></p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title={activeTab === 'tea' ? "Tea Inventory Stock" : "Raw Materials Inventory Stock"}
                        subtitle={`Filters -> Search: ${searchQuery || 'All'}`}
                        headers={activeTab === 'tea' ? ["Product Name", "Source", "Trans-In Amount", "Issue Amount", "Current Stock"] : ["Material Name", "Category", "Trans-In Qty", "Issue Qty", "Current Stock", "Unit"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`${activeTab}_Inventory_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation={activeTab === 'tea' ? "portrait" : "landscape"}
                        disabled={loading || (activeTab === 'tea' ? filteredTeaStocks.length === 0 : filteredRawMatStocks.length === 0)}
                    />
                    <button onClick={fetchStocks} disabled={loading} className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-[#0d9488] dark:border-teal-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync Current Stock
                    </button>
                </div>
            </div>

            {/* --- SUMMARY CARDS (Dynamic based on Tab) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Trans-In Amount */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-blue-200 dark:border-blue-900/50 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ArrowDownToLine size={32} />
                    </div>
                    <div>
                        <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trans-In Total</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">
                            {activeTab === 'tea' ? totalTransIn.toFixed(2) : grandTotalRawTransIn.toFixed(2)} 
                            <span className="text-base font-semibold text-gray-500"> {activeTab === 'tea' ? 'kg' : 'Items'}</span>
                        </h3>
                    </div>
                </div>

                {/* 2. Issue Amount */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                        <ArrowUpFromLine size={32} />
                    </div>
                    <div>
                        <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Issued Total</p>
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">
                            {activeTab === 'tea' ? totalIssue.toFixed(2) : grandTotalRawIssue.toFixed(2)} 
                            <span className="text-base font-semibold text-gray-500"> {activeTab === 'tea' ? 'kg' : 'Items'}</span>
                        </h3>
                    </div>
                </div>

                {/* 3. Current Stock */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-[#99f6e4] dark:border-teal-800 shadow-sm flex items-center gap-5 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-teal-50 dark:bg-teal-900/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="p-4 bg-teal-50 dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 rounded-xl z-10">
                        <Warehouse size={32} />
                    </div>
                    <div className="z-10">
                        <p className="text-[12px] font-bold text-[#0f766e] dark:text-teal-500 uppercase tracking-wide">Current Stock Available</p>
                        <h3 className="text-3xl font-black text-[#0f766e] dark:text-teal-400 mt-1">
                            {activeTab === 'tea' ? totalCurrentStock.toFixed(2) : grandTotalRawStock.toFixed(2)} 
                            <span className="text-base font-semibold opacity-70"> {activeTab === 'tea' ? 'kg' : 'Items'}</span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-zinc-800 pb-2">
                <button 
                    onClick={() => setActiveTab('tea')} 
                    className={`px-6 py-2.5 rounded-t-lg font-bold transition-colors ${activeTab === 'tea' ? 'bg-[#0f766e] text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                    Tea Products Stock
                </button>
                <button 
                    onClick={() => setActiveTab('raw')} 
                    className={`px-6 py-2.5 rounded-t-lg font-bold transition-colors flex items-center gap-2 ${activeTab === 'raw' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                    Raw Materials Stock
                </button>
            </div>

            {/* --- FILTER SECTION --- */}
            <div className="mb-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className={`grid grid-cols-1 ${activeTab === 'tea' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Search {activeTab === 'tea' ? 'Product' : 'Material'}</label>
                        <input 
                            type="text" 
                            placeholder={activeTab === 'tea' ? "e.g. BOPF, Premium..." : "e.g. Pouch, Box..."}
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-200 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2dd4bf] transition-colors" 
                        />
                    </div>
                    {activeTab === 'tea' && (
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
                    )}
                    <div className={`flex items-end ${activeTab === 'raw' ? 'justify-start' : 'lg:justify-end'}`}>
                        <button onClick={clearFilters} disabled={!searchQuery && !sourceFilter} className={`w-full lg:w-auto px-4 py-2.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${searchQuery || sourceFilter ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-transparent cursor-not-allowed'}`}>
                            <FilterX size={16} /> Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TAB CONTENT: TEA STOCK --- */}
            {activeTab === 'tea' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <div className="xl:col-span-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden w-full transition-colors duration-300 self-start">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                                <p className="font-medium">Loading tea inventory...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                                <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-500">
                                            <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-500 min-w-[200px]">Product Name</th>
                                            <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-500 text-center">Source</th>
                                            <th className="px-6 py-4 font-bold text-blue-700 dark:text-blue-500 border-r border-gray-200 dark:border-zinc-600 bg-blue-50/50 dark:bg-blue-950/20 text-center"><ArrowDownToLine size={14} className="inline mr-1"/> Trans-In Amount (Kg)</th>
                                            <th className="px-6 py-4 font-bold text-amber-700 dark:text-amber-500 border-r border-gray-200 dark:border-zinc-600 bg-amber-50/50 dark:bg-amber-950/20 text-center"><ArrowUpFromLine size={14} className="inline mr-1"/> Issue Amount (Kg)</th>
                                            <th className="px-6 py-4 font-bold text-[#0f766e] dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/20 text-center text-sm"><Warehouse size={14} className="inline mr-1"/> Current Stock (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                        {filteredTeaStocks.length > 0 ? (
                                            filteredTeaStocks.map((stock) => {
                                                const isNewProduct = stock.productName !== previousProductName;
                                                previousProductName = stock.productName;

                                                return (
                                                    <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                        <td className={`px-6 py-4 align-top border-r border-gray-200 dark:border-zinc-700 ${!isNewProduct ? 'border-t-0 text-transparent select-none' : ''}`}>
                                                            {isNewProduct && (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className={`block font-bold border px-3 py-1.5 rounded shadow-sm w-fit ${getTeaColor(stock.productName)}`}>
                                                                        {stock.productName || 'Unknown'}
                                                                    </span>
                                                                    <div className="text-[10px] text-gray-400 font-medium">Updated: {stock.updatedAtDate || '-'}</div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 align-middle text-center">
                                                            <span className={`px-3 py-1.5 rounded-md text-xs font-bold shadow-sm border border-black/5 dark:border-white/5 ${getSourceBadgeClass(stock.source)}`}>
                                                                {stock.source || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 align-middle text-center bg-blue-50/10 dark:bg-blue-950/5">
                                                            <span className="font-bold text-blue-700 dark:text-blue-500 text-base">{(Number(stock.transInAmount) || 0).toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 align-middle text-center bg-amber-50/10 dark:bg-amber-950/5">
                                                            <span className="font-bold text-amber-700 dark:text-amber-500 text-base">{(Number(stock.issueAmount) || 0).toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center align-middle bg-teal-50/10 dark:bg-teal-950/10">
                                                            <span className="font-black text-[#0f766e] dark:text-teal-400 text-lg">{(Number(stock.currentStock) || 0).toFixed(2)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan="5" className="p-16 text-center text-gray-400">No tea records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-1 w-full">
                        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 overflow-hidden sticky top-8">
                            <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-600">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Weight size={18} className="text-[#0d9488] dark:text-teal-500" /> Summary By Product
                                </h3>
                            </div>
                            <div className="p-4 overflow-x-auto max-h-[70vh]">
                                <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse min-w-full">
                                    <thead>
                                        <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-500">
                                            <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-500">Product</th>
                                            <th className="px-3 py-2 text-right font-bold">Current Stock (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryArray.length > 0 ? summaryArray.map((product, idx) => {
                                            const totalQty = Number(product.totalOverallQtyKg) || Number(product.totalBulkStockKg) || 0;
                                            return (
                                                <tr key={idx} className="border-b border-gray-300 dark:border-zinc-500">
                                                    <td className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-500 ${getTeaColor(product.productName)}`}>{product.productName || 'Unknown'}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">{totalQty % 1 !== 0 ? totalQty.toFixed(2) : totalQty}</td>
                                                </tr>
                                            );
                                        }) : <tr><td colSpan="2" className="px-3 py-6 text-center text-gray-400">No data</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: RAW MATERIALS STOCK --- */}
            {activeTab === 'raw' && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900/50 overflow-hidden w-full transition-colors duration-300 self-start">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading raw materials...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-full">
                                <thead>
                                    <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 uppercase text-xs tracking-wider border-b border-indigo-200 dark:border-indigo-800">
                                        <th className="px-6 py-4 font-bold border-r border-indigo-100 dark:border-indigo-800 min-w-[250px]">Material Name</th>
                                        <th className="px-6 py-4 font-bold border-r border-indigo-100 dark:border-indigo-800 text-center">Category</th>
                                        <th className="px-6 py-4 font-bold text-blue-700 dark:text-blue-500 border-r border-indigo-100 dark:border-indigo-800 text-center bg-blue-50/50 dark:bg-blue-950/20"><ArrowDownToLine size={14} className="inline mr-1"/> Trans-In Amount</th>
                                        <th className="px-6 py-4 font-bold text-amber-700 dark:text-amber-500 border-r border-indigo-100 dark:border-indigo-800 text-center bg-amber-50/50 dark:bg-amber-950/20"><ArrowUpFromLine size={14} className="inline mr-1"/> Issue Amount</th>
                                        <th className="px-6 py-4 font-bold text-indigo-700 dark:text-indigo-400 text-center border-r border-indigo-100 dark:border-indigo-800 bg-indigo-100/30 dark:bg-indigo-950/30"><Warehouse size={14} className="inline mr-1"/> Current Stock</th>
                                        <th className="px-6 py-4 font-bold text-center">Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                    {filteredRawMatStocks.length > 0 ? (
                                        filteredRawMatStocks.map((rm, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors group">
                                                <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700">
                                                    <span className={`px-3 py-1.5 rounded-md text-sm font-bold shadow-sm border border-black/5 dark:border-white/5 ${getMaterialColor(rm.materialName)}`}>
                                                        {rm.materialName || 'Unknown Material'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 text-center">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded tracking-wider ${(rm.category || 'other') === 'flavor' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                                        {rm.category || 'other'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 text-center bg-blue-50/10 dark:bg-blue-950/5">
                                                    <span className="font-bold text-blue-700 dark:text-blue-500 text-base">{(Number(rm.transInAmount) || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 text-center bg-amber-50/10 dark:bg-amber-950/5">
                                                    <span className="font-bold text-amber-700 dark:text-amber-500 text-base">{(Number(rm.issueAmount) || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 border-r border-gray-200 dark:border-zinc-700 text-center bg-indigo-50/10 dark:bg-indigo-950/10">
                                                    <span className="font-black text-indigo-700 dark:text-indigo-400 text-lg">{(Number(rm.totalQuantity) || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-400 uppercase">
                                                    {rm.unit || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="p-16 text-center text-gray-400"><p>No raw material records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
        </div>
    );
}