import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Search, RefreshCw, Archive, ArrowDownToLine, ArrowUpFromLine, Warehouse, Droplet, Package, Settings2 } from "lucide-react";
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

export default function HistoricalStockView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    // States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('tea'); 
    
    // Updated to hold all three categories
    const [records, setRecords] = useState({ tea: [], flavor: [], packing: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedDate) fetchHistoricalStock(selectedDate);
    }, [selectedDate]);

    const fetchHistoricalStock = async (date) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/packing-stock/history?date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // We expect the backend to return { teaStocks: [], flavorStocks: [], packingStocks: [] }
                setRecords({
                    tea: data.teaStocks || [],
                    flavor: data.flavorStocks || [],
                    packing: data.packingStocks || []
                });
            } else {
                throw new Error("Failed to fetch historical data");
            }
        } catch (error) {
            toast.error("Could not connect to the server.");
            console.error(error);
            // Temporary fallback if backend only returns array (Tea only)
            setRecords({ tea: [], flavor: [], packing: [] });
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const getFilteredRecords = (list) => {
        return list.filter(item => {
            const name = item.productName || item.materialName || '';
            const matchesSearch = !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
            const hasStock = item.currentStock > 0;
            return matchesSearch && hasStock;
        });
    };

    const activeRecords = activeTab === 'tea' ? getFilteredRecords(records.tea) :
                          activeTab === 'flavor' ? getFilteredRecords(records.flavor) :
                          getFilteredRecords(records.packing);

    // PDF Export Logic
    const getPdfData = () => {
        const tableRows = [];
        activeRecords.forEach(item => {
            const name = item.productName || item.materialName || 'Unknown';
            const unit = item.unit || (activeTab === 'tea' ? 'kg' : '');
            
            tableRows.push([
                { content: name, styles: { ...getPdfColor(name, activeTab === 'tea' ? 'tea' : 'raw'), fontStyle: 'bold' } },
                `${item.transInAmount.toFixed(2)} ${unit}`,
                `${item.issueAmount.toFixed(2)} ${unit}`,
                { content: `${item.currentStock.toFixed(2)} ${unit}`, styles: { fontStyle: 'bold' } }
            ]);
        });
        return tableRows;
    };

    const getPdfTitle = () => {
        if (activeTab === 'tea') return `Tea Historical Stock As Of: ${selectedDate}`;
        if (activeTab === 'flavor') return `Spicy Historical Stock As Of: ${selectedDate}`;
        return `Packing Materials Historical Stock As Of: ${selectedDate}`;
    };

    const uniqueCode = `HIST/${activeTab.toUpperCase()}/${new Date(selectedDate).toLocaleString('default', { month: 'short' }).toUpperCase()}/${new Date(selectedDate).getFullYear()}`;

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
                <div>
                    <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <Archive size={32} /> Historical Stock Report
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        View inventory balance as of a specific date in the past.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title={getPdfTitle()}
                        subtitle={`Filtered By Search: ${searchQuery || 'All Items'}`}
                        headers={["Item Name", "Total Trans-In", "Total Issued", "Balance Stock"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`${activeTab}_Stock_Report_${selectedDate}.pdf`}
                        orientation="portrait"
                        disabled={loading || activeRecords.length === 0}
                    />
                </div>
            </div>

            {/* Controls (Date & Search) */}
            <div className="mb-8 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm flex flex-col md:flex-row gap-6">
                <div className="flex-1 max-w-sm">
                    <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 mb-2">
                        <Calendar size={14} /> Select Date
                    </label>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        max={new Date().toISOString().split('T')[0]} 
                        className="w-full border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 dark:text-gray-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold text-gray-700" 
                    />
                </div>

                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2 mb-2">
                        <Search size={14} /> Search
                    </label>
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab === 'tea' ? 'tea grade' : 'material'}...`}
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-gray-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors" 
                    />
                </div>
                
                <div className="flex items-end">
                    <button onClick={() => fetchHistoricalStock(selectedDate)} disabled={loading || !selectedDate} className={`h-[52px] px-6 rounded-lg font-bold flex items-center gap-2 transition-colors ${loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> {loading ? 'Calculating...' : 'Load Stock'}
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-200 dark:border-zinc-800 pb-2">
                <button 
                    onClick={() => setActiveTab('tea')} 
                    className={`px-6 py-2.5 rounded-t-lg font-bold transition-colors ${activeTab === 'tea' ? 'bg-[#0f766e] text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                    Tea Products Stock
                </button>
                <button 
                    onClick={() => setActiveTab('flavor')} 
                    className={`px-6 py-2.5 rounded-t-lg font-bold transition-colors flex items-center gap-2 ${activeTab === 'flavor' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                    <Droplet size={18} /> Spicy Stock
                </button>
                <button 
                    onClick={() => setActiveTab('packing')} 
                    className={`px-6 py-2.5 rounded-t-lg font-bold transition-colors flex items-center gap-2 ${activeTab === 'packing' ? 'bg-orange-600 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                    <Package size={18} /> Packing Materials Stock
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-full">
                        <thead>
                            <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 uppercase text-xs tracking-wider border-b border-indigo-100 dark:border-indigo-900/50">
                                <th className="px-6 py-4 font-bold border-r border-indigo-100 dark:border-indigo-900/50 w-1/3">{activeTab === 'tea' ? 'Product Name' : 'Material Name'}</th>
                                <th className="px-6 py-4 font-bold text-blue-700 dark:text-blue-500 border-r border-indigo-100 dark:border-indigo-900/50 text-center"><ArrowDownToLine size={14} className="inline mr-1"/> Total Trans-In</th>
                                <th className="px-6 py-4 font-bold text-amber-700 dark:text-amber-500 border-r border-indigo-100 dark:border-indigo-900/50 text-center"><ArrowUpFromLine size={14} className="inline mr-1"/> Total Issued</th>
                                <th className="px-6 py-4 font-bold text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30 text-center text-sm"><Warehouse size={14} className="inline mr-1"/> Balance Stock</th>
                                {activeTab !== 'tea' && <th className="px-6 py-4 font-bold text-center">Unit</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={activeTab === 'tea' ? "4" : "5"} className="p-12 text-center text-gray-500 font-medium"><RefreshCw className="animate-spin inline mr-2"/> Calculating history for {selectedDate}...</td></tr>
                            ) : activeRecords.length > 0 ? (
                                activeRecords.map((item, idx) => {
                                    const name = item.productName || item.materialName || 'Unknown';
                                    const unit = item.unit || (activeTab === 'tea' ? 'kg' : '');
                                    const colorClass = activeTab === 'tea' ? getTeaColor(name) : getMaterialColor(name);

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800">
                                                <span className={`block font-bold border px-3 py-1.5 rounded shadow-sm w-fit ${colorClass}`}>
                                                    {name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800 text-center bg-blue-50/10 dark:bg-blue-950/5">
                                                <span className="font-bold text-blue-700 dark:text-blue-500 text-base">{item.transInAmount.toFixed(3)}</span>
                                            </td>
                                            <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800 text-center bg-amber-50/10 dark:bg-amber-950/5">
                                                <span className="font-bold text-amber-700 dark:text-amber-500 text-base">{item.issueAmount.toFixed(3)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center bg-teal-50/20 dark:bg-teal-950/20">
                                                <span className="font-black text-teal-700 dark:text-teal-400 text-lg">{item.currentStock.toFixed(3)}</span>
                                            </td>
                                            {activeTab !== 'tea' && (
                                                <td className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-400 uppercase">
                                                    {unit}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={activeTab === 'tea' ? "4" : "5"} className="p-12 text-center text-gray-400 italic">No stock balance found for the selected date.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}