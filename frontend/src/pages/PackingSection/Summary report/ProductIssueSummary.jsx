import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calendar, Filter, RefreshCw, FileDown, Sun, Moon, FileText } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader'; 

// Comprehensive Color Mapping (Tailored for table cells without border conflicts)
const getTeaColor = (product) => {
    const p = product.toLowerCase();
    
    // 1. Grade/Type strict matching
    if (p.includes('ff ex sp')) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
    if (p.includes('ff sp')) return 'bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200';
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900'; 
    if (p.includes('bopf')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
    if (p.includes('fbop')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
    if (p.includes('bop')) return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200';
    if (p.includes('op1') || p.includes('op 1')) return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200';
    if (p.includes('pekoe')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
    if (p.includes('dust')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200';
    
    // 2. Specialty/Flavor/Color matching
    if (p.includes('pink')) return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200';
    if (p.includes('purple')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
    if (p.includes('silver')) return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    if (p.includes('white')) return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    if (p.includes('golden') || p.includes('turmeric')) return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200';
    if (p.includes('orange') || p.includes('cinnamon')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
    if (p.includes('black') || p.includes('pepar')) return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    if (p.includes('lemangrass') || p.includes('green')) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
    if (p.includes('premium')) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200';
    if (p.includes('awrudu') || p.includes('awuru')) return 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200';
    if (p.includes('slim beauty')) return 'bg-fuchsia-200 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-200';
    if (p.includes('masala')) return 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200';
    if (p.includes('chakra')) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200';
    if (p.includes('flower')) return 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200';
    if (p.includes('labour')) return 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200';
    if (p.includes('other purchasing')) return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200';
    
    // Default fallback
    return 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200'; 
};

// Map individual products to their summary categories (Matching exactly)
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
    
    const standaloneMap = {
        "opa": "OPA", "bop": "BOP", "bop pack": "BOP", "pink tea": "Pink Tea", "pink tea can": "Pink Tea", "pink tea pack": "Pink Tea", "op 1": "OP 1", "op1 pack": "OP 1", "ff ex sp": "FF EX SP", "ff ex sp pack": "FF EX SP", "ff ex sp box": "FF EX SP", "white tea": "White Tea", "white tea can": "White Tea", "purple tea": "Purple Tea", "purple tea can": "Purple Tea", "purple pack": "Purple Tea", "slim beauty": "Slim Beauty", "slim beauty can": "Slim Beauty", "vita glow": "Vita Glow", "silver green": "Silver Green", "premium": "Premium", "ceylon premium": "FF", "black pepper": "Black Pepper", "black pepar": "Black Pepper", "cinnamon stick": "Cinnamon Stick", "turmeric": "Turmeric"
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

    return product.trim(); 
};

export default function ProductIssueSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
    
    const [tableData, setTableData] = useState([]);
    const [grandTotal, setGrandTotal] = useState(0);

    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsDark(!isDark);
    };

    useEffect(() => {
        fetchAndCalculateData(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterMonth]); 

    const fetchAndCalculateData = async (isManualSync = false) => {
        setLoading(true);
        const toastId = isManualSync ? toast.loading("Syncing latest data...") : null;
        
        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const [localRes, teaRes, guideRes] = await Promise.allSettled([
                fetch(`${BACKEND_URL}/api/local-sales`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/tea-center-issues`, { headers: authHeaders }), 
                fetch(`${BACKEND_URL}/api/guide-free`, { headers: authHeaders }) 
            ]);

            const parseRes = async (res) => {
                if (res.status === 'fulfilled' && res.value.ok) return await res.value.json();
                return [];
            };

            const localData = await parseRes(localRes);
            const teaData = await parseRes(teaRes);
            const guideData = await parseRes(guideRes);

            processDataForTable(localData, teaData, guideData, filterMonth);

            if (isManualSync) toast.success("Data synced successfully!", { id: toastId });

        } catch (error) {
            console.error("Aggregation Error:", error);
            if (isManualSync) toast.error("Could not sync data.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const processDataForTable = (localData, teaData, guideData, monthFilter) => {
        const inMonth = (dateString) => dateString && dateString.startsWith(monthFilter);

        const extractItems = (records, sectionName, itemKey) => {
            let sectionMap = {};
            
            records.forEach(rec => {
                const recDate = rec.date || rec.createdAt;
                if (inMonth(recDate)) {
                    const items = rec[itemKey] || [];
                    
                    if (items.length === 0 && (rec.totalQtyKg || rec.qty)) {
                        sectionMap["GUIDE ISSUE"] = (sectionMap["GUIDE ISSUE"] || 0) + Number(rec.totalQtyKg || rec.qty);
                    }

                    items.forEach(item => {
                        let finalProductName = item.product ? item.product.trim().toUpperCase() : "UNKNOWN";
                        
                        if (sectionName === 'TEA CENTER') {
                            finalProductName = getBaseCategory(item.product);
                        }
                        
                        const qty = Number(item.totalQtyKg || item.qty || 0);
                        if (qty > 0) {
                            sectionMap[finalProductName] = (sectionMap[finalProductName] || 0) + qty;
                        }
                    });
                }
            });
            
            const products = Object.keys(sectionMap).map(k => ({
                product: k,
                qty: sectionMap[k]
            })).sort((a, b) => b.qty - a.qty);

            const sectionTotal = products.reduce((sum, p) => sum + p.qty, 0);

            return { section: sectionName, products, sectionTotal };
        };

        const grouped = [
            extractItems(localData, 'LOCAL SALE', 'salesItems'),
            extractItems(teaData, 'TEA CENTER', 'issueItems'),
            extractItems(guideData, 'GUIDE FREE', 'items') 
        ];

        setTableData(grouped);
        setGrandTotal(grouped.reduce((sum, sec) => sum + sec.sectionTotal, 0));
    };

    const getPdfData = () => {
        const rows = [];
        
        tableData.forEach(sec => {
            const rowCount = sec.products.length > 0 ? sec.products.length : 1;
            
            if (sec.products.length > 0) {
                sec.products.forEach((prod, idx) => {
                    const row = [];
                    if (idx === 0) {
                        row.push({ content: sec.section, rowSpan: rowCount, styles: { valign: 'top', fontStyle: 'bold' } });
                    }
                    row.push(prod.product);
                    row.push({ content: prod.qty % 1 !== 0 ? prod.qty.toFixed(2) : prod.qty, styles: { halign: 'right' } });
                    if (idx === 0) {
                        row.push({ content: '', rowSpan: rowCount }); 
                    }
                    rows.push(row);
                });
            } else {
                rows.push([{ content: sec.section, styles: { fontStyle: 'bold' } }, "", "", ""]);
            }
            
            rows.push([
                { content: "SUB TOTAL", colSpan: 2, styles: { fontStyle: 'italic', halign: 'left', fillColor: [245, 245, 245] } },
                { content: sec.sectionTotal % 1 !== 0 ? sec.sectionTotal.toFixed(2) : sec.sectionTotal, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
                { content: sec.sectionTotal % 1 !== 0 ? sec.sectionTotal.toFixed(2) : sec.sectionTotal, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } }
            ]);
        });
        
        rows.push([
            { content: "GRAND TOTAL", colSpan: 3, styles: { fontStyle: 'bold', fontSize: 12, fillColor: [230, 230, 230] } },
            { content: grandTotal % 1 !== 0 ? grandTotal.toFixed(2) : grandTotal, styles: { fontStyle: 'bold', fontSize: 12, halign: 'right', fillColor: [230, 230, 230] } }
        ]);
        
        return rows;
    };

    const pdfHeaders = ["SECTION", "PRODUCT", "QUT(KG)", "TOTAL"];

    const getMonthName = (yyyymm) => {
        const date = new Date(`${yyyymm}-01`);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const uniqueCode = `PIS/${getMonthName(filterMonth)}`;
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="p-8 max-w-[1000px] mx-auto font-sans relative">

                {/* STICKY HEADER */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><FileText size={28} className="text-[#0d9488]" /> Product Issue Summary</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Monthly issue aggregation calculated live</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-end items-center">
                        <button 
                            onClick={toggleTheme}
                            title="Toggle Dark Mode"
                            className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-gray-300"
                        >
                            {isDark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
                        </button>

                        <button onClick={() => fetchAndCalculateData(true)} disabled={loading} className="px-5 py-2.5 bg-white dark:bg-zinc-900 text-[#0d9488] dark:text-teal-400 border border-teal-500 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 hover:bg-teal-50 dark:hover:bg-zinc-800"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Data</button>
                        <PDFDownloader title={`PRODUCT ISSUE SUMMARY MONTH OF ${getMonthName(filterMonth)}`} headers={pdfHeaders} data={getPdfData()} uniqueCode={uniqueCode} fileName={`Product_Issue_Summary_${filterMonth}.pdf`} orientation="portrait" disabled={tableData.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" />
                    </div>
                </div>

                <div className="mb-8">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden transition-colors flex items-center gap-4 max-w-sm">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0d9488]"></div>
                        <Calendar className="text-[#0d9488] w-8 h-8" />
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wider">Select Report Month</label>
                            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-teal-400 bg-gray-50 dark:bg-zinc-950 dark:text-white transition-colors" />
                        </div>
                    </div>
                </div>

                {/* EXACT PHOTO REPLICA TABLE */}
                <div className="bg-white dark:bg-zinc-900 rounded-sm shadow-md overflow-hidden mb-12 min-h-[300px] p-8 border border-gray-300 dark:border-zinc-700 transition-colors">
                    
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <RefreshCw className="animate-spin text-teal-600 w-10 h-10" />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-center font-bold text-xl mb-6 uppercase tracking-wider text-black dark:text-white">
                                PRODUCT ISSUE SUMMARY MONTH OF {getMonthName(filterMonth)}
                            </h2>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border-2 border-black dark:border-gray-400 text-black dark:text-gray-200 bg-white dark:bg-zinc-900 text-sm md:text-base">
                                    <thead>
                                        <tr className="border-b-2 border-black dark:border-gray-400 font-bold bg-gray-100 dark:bg-zinc-800">
                                            <th className="border-r-2 border-black dark:border-gray-400 p-2 text-left w-[20%] uppercase">SECTION</th>
                                            <th className="border-r-2 border-black dark:border-gray-400 p-2 text-left w-[40%] uppercase">PRODUCT</th>
                                            <th className="border-r-2 border-black dark:border-gray-400 p-2 text-right w-[20%] uppercase">QUT(KG)</th>
                                            <th className="p-2 text-right w-[20%] uppercase">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.length > 0 ? (
                                            tableData.map((sectionData, sIdx) => {
                                                const rowCount = sectionData.products.length > 0 ? sectionData.products.length : 1;
                                                return (
                                                    <React.Fragment key={sIdx}>
                                                        {sectionData.products.length > 0 ? (
                                                            sectionData.products.map((prod, pIdx) => (
                                                                <tr key={pIdx} className="border-b border-black dark:border-gray-400">
                                                                    {pIdx === 0 && (
                                                                        <td className="border-r-2 border-black dark:border-gray-400 p-2 font-bold uppercase align-top bg-gray-50 dark:bg-zinc-800/50" rowSpan={rowCount}>
                                                                            {sectionData.section}
                                                                        </td>
                                                                    )}
                                                                    
                                                                    {/* APPLIED COLOR CLASSES HERE */}
                                                                    <td className={`border-r-2 border-black dark:border-gray-400 p-2 font-semibold uppercase ${getTeaColor(prod.product)}`}>
                                                                        {prod.product}
                                                                    </td>
                                                                    <td className={`border-r-2 border-black dark:border-gray-400 p-2 font-semibold text-right ${getTeaColor(prod.product)}`}>
                                                                        {prod.qty % 1 !== 0 ? prod.qty.toFixed(2) : prod.qty}
                                                                    </td>
                                                                    
                                                                    {pIdx === 0 && (
                                                                        <td className="p-2 border-black dark:border-gray-400 align-top text-right font-medium" rowSpan={rowCount}>
                                                                            {/* Empty space for standalone rows to match photo */}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr className="border-b border-black dark:border-gray-400">
                                                                <td className="border-r-2 border-black dark:border-gray-400 p-2 font-bold uppercase align-top bg-gray-50 dark:bg-zinc-800/50">{sectionData.section}</td>
                                                                <td className="border-r-2 border-black dark:border-gray-400 p-2"></td>
                                                                <td className="border-r-2 border-black dark:border-gray-400 p-2 text-right"></td>
                                                                <td className="p-2 border-black dark:border-gray-400"></td>
                                                            </tr>
                                                        )}
                                                        
                                                        {/* SUB TOTAL ROW */}
                                                        <tr className="border-b-2 border-black dark:border-gray-400 font-bold bg-gray-100 dark:bg-zinc-800">
                                                            <td colSpan={2} className="border-r-2 border-black dark:border-gray-400 p-2 italic uppercase">SUB TOTAL</td>
                                                            <td className="border-r-2 border-black dark:border-gray-400 p-2 text-right">{sectionData.sectionTotal % 1 !== 0 ? sectionData.sectionTotal.toFixed(2) : sectionData.sectionTotal}</td>
                                                            <td className="p-2 text-right">{sectionData.sectionTotal % 1 !== 0 ? sectionData.sectionTotal.toFixed(2) : sectionData.sectionTotal}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-10 text-center text-gray-500 italic">No records found for the selected month.</td>
                                            </tr>
                                        )}

                                        {/* GRAND TOTAL ROW */}
                                        {tableData.length > 0 && (
                                            <tr className="border-b-2 border-black dark:border-gray-400 font-bold bg-gray-200 dark:bg-zinc-700 text-lg">
                                                <td colSpan={3} className="border-r-2 border-black dark:border-gray-400 p-3 uppercase">GRAND TOTAL</td>
                                                <td className="p-3 text-right">{grandTotal % 1 !== 0 ? grandTotal.toFixed(2) : grandTotal}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}