import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Share2, RefreshCw, FileText, Box, SearchX } from 'lucide-react';
import PDFDownloader from '@/components/PDFDownloader';

export default function DailyExtendedStockView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    
    const [monthData, setMonthData] = useState({
        currBalances: null,
        ins: null,
        outs: null
    });

    const selectedMonth = selectedDate.substring(0, 7); // YYYY-MM

    useEffect(() => {
        fetchMonthData(selectedMonth);
    }, [selectedMonth]);

    const fetchMonthData = async (monthStr) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [monthlyBalanceRes, dailySummaryRes, issueSummaryRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/monthly-balance?month=${monthStr}`, { headers }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/summary?month=${monthStr}`, { headers }).catch(() => ({ ok: false })),
                fetch(`${BACKEND_URL}/api/issue-summary?month=${monthStr}`, { headers }).catch(() => ({ ok: false }))
            ]);

            const getJsonData = async (res) => {
                if (!res.ok) return null;
                try {
                    return await res.json();
                } catch (e) {
                    return null;
                }
            };

            const currBalances = await getJsonData(monthlyBalanceRes);
            const ins = await getJsonData(dailySummaryRes);
            const outs = await getJsonData(issueSummaryRes);

            setMonthData({ currBalances, ins, outs });
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data from servers.");
        } finally {
            setLoading(false);
        }
    };

    const hasDataForSelectedDate = useMemo(() => {
        const insArray = Array.isArray(monthData.ins) ? monthData.ins : (monthData.ins?.data || monthData.ins?.records || []);
        const outsArray = Array.isArray(monthData.outs) ? monthData.outs : (monthData.outs?.data || monthData.outs?.records || []);
        
        const hasSummary = insArray.some(d => d.date && d.date === selectedDate);
        const hasIssue = outsArray.some(d => d.date && d.date === selectedDate);
        return hasSummary || hasIssue;
    }, [selectedDate, monthData]);

   const tableData = useMemo(() => {
        const dataMap = {};

        // 💡 1. Standard Product Categories (BOPF සහ DUST සඳහා displaySize එකතු කර ඇත)
        const productCategories = [
            { categoryId: 'athukorala', size: '400g', name: 'Athukorala BOPF 400g' },
            { categoryId: 'athukorala', size: '200g', name: 'Athukorala BOPF 200g' },
            { categoryId: 'athukorala', size: '100g', name: 'Athukorala BOPF 100g' },
            { categoryId: 'bopfSp', size: '400g', name: 'Athukorala BOPF SP 400g' },
            { categoryId: 'bopfSp', size: '200g', name: 'Athukorala BOPF SP 200g' },
            { categoryId: 'bopfPremium', size: '400g', name: 'Athukorala BOPF PREMIUM 400g' },
            { categoryId: 'bopfPremium', size: '200g', name: 'Athukorala BOPF PREMIUM 200g' },
            { categoryId: 'pitigala', size: '400g', name: 'Pitigala tea 400g' },
            { categoryId: 'pitigala', size: '200g', name: 'Pitigala tea 200g' },
            { categoryId: 'tb', size: '25', name: 'Pitigala tea 25 bag' },
            { categoryId: 'tb', size: '100', name: 'Pitigala tea 100 bag' },
            { categoryId: 'gt', size: '200g', name: 'Green tea 200g' },
            { categoryId: 'gt', size: 'T/B 25', name: 'Green tea 25 bag' },
            
            // 👇 වෙනස් කළ කොටස: Size එක "BOPF" වුණත් පෙන්වන්නේ "KG" ලෙසයි 👇
            { categoryId: 'others', size: 'BOPF', name: 'BOPF', displaySize: 'KG' },
            { categoryId: 'others', size: 'DUST', name: 'DUST', displaySize: 'KG' },
            { categoryId: 'others', size: 'DUST 1', name: 'DUST 1', displaySize: 'KG' }
        ];

        // 💡 2. Auto-Correction Key Generator
        const generateKey = (catId, catTitle, size) => {
            let cleanId = (catId || '').toLowerCase().trim();
            let cleanTitle = (catTitle || '').toLowerCase().trim();
            let cleanSize = (size || '').toLowerCase().trim();

            if (!cleanId && cleanTitle) {
                cleanId = cleanTitle; 
            }

            // Fix Mismatches: Daily In/Out vs Database
            if (cleanId === 'g/t' || cleanTitle === 'g/t') cleanId = 'gt';
            if (cleanId === 'other grades' || cleanTitle === 'other grades') cleanId = 'others';
            if (cleanSize === 'bopf (kg)' || cleanSize === 'kg') cleanSize = 'bopf';
            if (cleanSize === 'dust (kg)') cleanSize = 'dust';
            if (cleanSize === 'dust 1 (kg)') cleanSize = 'dust 1';

            return `${cleanId}_${cleanSize}`;
        };

        // 💡 3. Pre-fill Map with Standard Categories
        productCategories.forEach(cat => {
            const key = generateKey(cat.categoryId, cat.name, cat.size);
            dataMap[key] = {
                categoryId: cat.categoryId, 
                displayTitle: cat.name, 
                // 👇 වෙනස් කළ කොටස: displaySize එකක් දීලා තියෙනවා නම් ඒක පෙන්වන්න 👇
                size: cat.displaySize || cat.size, 
                openingBalance: 0, 
                inToday: 0, cumulativeIn: 0,   
                outSoldToday: 0, cumulativeOutSold: 0, 
                outIssueToday: 0, cumulativeOutIssue: 0, 
                issueBreakdown: { labour: 0, staff: 0, free: 0 }, 
                balanceToDate: 0   
            };
        });

        // 💡 4. Initialize Function for records mapping
        const initItem = (categoryId, categoryTitle, size) => {
            const key = generateKey(categoryId, categoryTitle, size);
            if (!dataMap[key]) {
                dataMap[key] = {
                    categoryId: categoryId || 'Unknown', 
                    displayTitle: categoryTitle || categoryId || 'Unknown Category', 
                    size: size || '-',
                    openingBalance: 0, 
                    inToday: 0, cumulativeIn: 0,   
                    outSoldToday: 0, cumulativeOutSold: 0, 
                    outIssueToday: 0, cumulativeOutIssue: 0, 
                    issueBreakdown: { labour: 0, staff: 0, free: 0 }, 
                    balanceToDate: 0   
                };
            }
            return key;
        };

        const extractItems = (dbResponse) => {
            if (!dbResponse) return [];
            if (Array.isArray(dbResponse)) {
                if (dbResponse[0]?.items && Array.isArray(dbResponse[0].items)) return dbResponse[0].items;
                return dbResponse;
            }
            if (dbResponse.items && Array.isArray(dbResponse.items)) return dbResponse.items;
            if (dbResponse.data) {
                if (Array.isArray(dbResponse.data)) {
                    if (dbResponse.data[0]?.items) return dbResponse.data[0].items;
                    return dbResponse.data;
                }
                if (dbResponse.data.items && Array.isArray(dbResponse.data.items)) return dbResponse.data.items;
            }
            return [];
        };

        // A. Map Opening Balance (bmStock)
        const currBalanceItems = extractItems(monthData.currBalances);
        currBalanceItems.forEach(b => {
            const key = initItem(b.categoryId, b.categoryTitle, b.size);
            const val = Number(b.bmStock) || 0; 
            if (val > 0) {
                dataMap[key].openingBalance = val;
            }
        });

        const insArray = Array.isArray(monthData.ins) ? monthData.ins : (monthData.ins?.data || monthData.ins?.records || []);
        const outsArray = Array.isArray(monthData.outs) ? monthData.outs : (monthData.outs?.data || monthData.outs?.records || []);

        // B. Map INs and OUTs (Sold)
        insArray.forEach(daily => {
            const recordDate = daily.date || '';
            if (recordDate.startsWith(selectedMonth) && recordDate <= selectedDate) {
                if (Array.isArray(daily.items)) {
                    daily.items.forEach(item => {
                        const key = initItem(item.categoryId, item.categoryTitle, item.size);
                        const inVal = Number(item.in) || 0;
                        const outVal = Number(item.out) || 0; 
                        
                        dataMap[key].cumulativeIn += inVal; 
                        dataMap[key].cumulativeOutSold += outVal;
                        
                        if (recordDate === selectedDate) {
                            dataMap[key].inToday += inVal;  
                            dataMap[key].outSoldToday += outVal;
                        }
                    });
                }
            }
        });

        // C. Map OUTs (Issues)
        outsArray.forEach(issue => {
            const recordDate = issue.date || '';
            if (recordDate.startsWith(selectedMonth) && recordDate <= selectedDate) {
                const issueTypeStr = (issue.issueType || '').toLowerCase();
                const isLabour = issueTypeStr.includes('labour') || issueTypeStr.includes('labor');
                const isStaff = issueTypeStr.includes('staff');

                if (Array.isArray(issue.items)) {
                    issue.items.forEach(item => {
                        const key = initItem(item.categoryId, item.categoryTitle, item.size);
                        const val = Number(item.out) || 0;

                        dataMap[key].cumulativeOutIssue += val; 

                        if (recordDate === selectedDate) {
                            dataMap[key].outIssueToday += val;
                            if (isLabour) dataMap[key].issueBreakdown.labour += val;
                            else if (isStaff) dataMap[key].issueBreakdown.staff += val;
                            else dataMap[key].issueBreakdown.free += val;
                        }
                    });
                }
            }
        });

        // 💡 5. Calculate Final Balances (Filtered & Sorted)
        const finalData = Object.values(dataMap)
            .map(row => {
                row.balanceToDate = row.openingBalance + row.cumulativeIn - row.cumulativeOutSold;
                return row;
            })
            .filter(row => row.inToday > 0 || row.outSoldToday > 0 || row.outIssueToday > 0)
            .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
        
        return finalData;

    }, [selectedDate, monthData]);

    const handleSync = () => {
        fetchMonthData(selectedMonth);
    };

    const getMonthName = () => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (!selectedMonth) return "Month";
        const mIndex = parseInt(selectedMonth.split('-')[1], 10) - 1;
        return months[mIndex] || "Month";
    };

    const getPdfData = () => {
        const rows = [];
        tableData.forEach(row => {
            rows.push([
                { content: row.displayTitle, styles: { fontStyle: 'bold' } },
                row.size,
                row.openingBalance !== 0 ? row.openingBalance.toFixed(2) : '-',
                row.outSoldToday > 0 ? row.outSoldToday.toFixed(2) : '-',
                row.outIssueToday > 0 ? row.outIssueToday.toFixed(2) : '-',
                row.inToday > 0 ? row.inToday.toFixed(2) : '-',
{ 
                    content: row.balanceToDate.toFixed(2), 
                    styles: { 
                        fontStyle: 'bold', 
                        textColor: row.balanceToDate < 0 ? [220, 38, 38] : [67, 56, 202] 
                    } 
                }            
            ]);
        });
        return rows;
    };

    const uniqueCode = `DSL/${selectedDate.replace(/-/g, '')}`;

    const pdfTableConfig = {
        theme: 'grid',
        head: [
            [
                { content: 'CATEGORY / TITLE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', textColor: [107, 114, 128] } },
                { content: 'SIZE / TYPE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', textColor: [107, 114, 128] } },
                { content: `OPENING BALANCE\n(${getMonthName()} 1st)`, rowSpan: 2, styles: { halign: 'center', valign: 'middle', textColor: [107, 114, 128] } },
                { content: 'OUT (TODAY)', colSpan: 2, styles: { halign: 'center', textColor: [239, 68, 68] } },
                { content: 'IN (TODAY)', rowSpan: 2, styles: { halign: 'center', valign: 'middle', textColor: [20, 147, 82] } }, 
                { content: 'BALANCE\nTO DATE', rowSpan: 2, styles: { halign: 'center', valign: 'middle', textColor: [67, 56, 202] } } 
            ],
            [
                { content: 'SOLD', styles: { halign: 'center', textColor: [239, 68, 68] } },
                { content: 'ISSUE', styles: { halign: 'center', textColor: [239, 68, 68] } }
            ]
        ],
        headStyles: { 
            fillColor: [168, 241, 202], 
            lineColor: [106, 222, 154],
            lineWidth: 0.1,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            2: { halign: 'center' }, 
            3: { halign: 'center', textColor: [220, 38, 38] }, 
            4: { halign: 'center', textColor: [234, 88, 12] }, 
            5: { halign: 'center', textColor: [34, 197, 94] }, 
            6: { halign: 'center' }  
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans min-h-screen bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="mb-6 bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Daily IN/OUT & Balance Report</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">View daily product records with accurate closing balances.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title={`Daily IN/OUT & Balance Report - ${selectedDate}`}
                        subtitle={`Opening Balances as of 1st ${getMonthName()}`}
                        headers={["Category / Title", "Size / Type", "Opening Balance", "OUT (Sold)", "OUT (Issue)", "IN", "Balance To Date"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Daily_Stock_${selectedDate}.pdf`}
                        orientation="portrait"
                        disabled={loading || tableData.length === 0 || !hasDataForSelectedDate}
                        autoTableOptions={pdfTableConfig}
                    />
                    <PDFDownloader 
                        isWhatsApp={true}
                        title={`Daily IN/OUT & Balance Report - ${selectedDate}`}
                        subtitle={`Opening Balances as of 1st ${getMonthName()}`}
                        headers={["Category / Title", "Size / Type", "Opening Balance", "OUT (Sold)", "OUT (Issue)", "IN", "Balance To Date"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Daily_Stock_${selectedDate}.pdf`}
                        orientation="portrait"
                        disabled={loading || tableData.length === 0 || !hasDataForSelectedDate}
                        autoTableOptions={pdfTableConfig}
                    />
                    <button onClick={handleSync} className="p-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm inline-flex items-center gap-4">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-green-600" /> Select Date:
                </label>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-md px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all"
                />
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                <div className="bg-[#eaf5ec] dark:bg-green-900/20 px-6 py-4 flex items-center justify-between border-b border-green-200 dark:border-green-900/40">
                    <h3 className="text-sm font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
                        <Box size={18} /> Details for {selectedDate}
                    </h3>
                    {hasDataForSelectedDate && (
                        <span className="text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                            {tableData.length} Items
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-16 text-green-600 dark:text-green-500">
                        <RefreshCw className="animate-spin mb-4" size={40} />
                        <p className="font-bold text-lg">Loading data for {selectedDate}...</p>
                        <p className="text-sm text-gray-500 mt-2">Please wait while we sync the records.</p>
                    </div>
                ) : hasDataForSelectedDate ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 text-[10px] uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                                    <th rowSpan="2" className="px-6 py-4 font-black">Category / Title</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black">Size / Type</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center bg-gray-50 dark:bg-zinc-800/50">
                                        Opening Balance<br/>
                                        <span className="text-[9px] font-medium text-gray-400 capitalize">({getMonthName()} 1st)</span>
                                    </th>
                                    <th colSpan="2" className="px-6 py-2 font-black text-center text-red-500 border-b border-gray-200 dark:border-zinc-800">
                                        OUT (Today)
                                    </th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center text-green-600 bg-green-50/30 dark:bg-green-900/10">IN (Today)</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400">
                                        Balance<br/>To Date
                                    </th>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 text-[10px] uppercase text-red-500 tracking-wider">
                                    <th className="px-4 py-2 font-bold text-center bg-red-50/30 dark:bg-red-900/10">Sold</th>
                                    <th className="px-4 py-2 font-bold text-center bg-red-50/30 dark:bg-red-900/10">Issue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-gray-800 dark:text-gray-200">
                                            {row.displayTitle}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">
                                            {row.size}
                                        </td>
                                        
                                        <td className="px-6 py-4 font-bold text-center bg-gray-50/50 dark:bg-zinc-800/20 text-gray-700 dark:text-gray-300">
                                            {row.openingBalance !== 0 ? row.openingBalance.toFixed(2) : '-'}
                                        </td>
                                        
                                        <td className="px-6 py-4 font-bold text-center text-red-600 bg-red-50/10 dark:bg-red-900/5">
                                            {row.outSoldToday > 0 ? (
                                                <span className="bg-red-100 dark:bg-red-900/40 px-2.5 py-1 rounded-md">{row.outSoldToday.toFixed(2)}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-center text-orange-500 bg-red-50/10 dark:bg-red-900/5">
                                            {row.outIssueToday > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <span>{row.outIssueToday.toFixed(2)}</span>
                                                    {(row.issueBreakdown.labour > 0 || row.issueBreakdown.staff > 0) && (
                                                        <span className="text-[9px] mt-1 text-orange-700/70 font-semibold uppercase">
                                                            {row.issueBreakdown.labour > 0 ? `Lab: ${row.issueBreakdown.labour} ` : ''}
                                                            {row.issueBreakdown.staff > 0 ? `Stf: ${row.issueBreakdown.staff}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>

                                        <td className="px-6 py-4 font-bold text-center text-green-600 bg-green-50/20 dark:bg-green-900/10">
                                            {row.inToday > 0 ? row.inToday.toFixed(2) : '-'}
                                        </td>

                                        <td className={`px-6 py-4 font-black text-center ${
                                            row.balanceToDate < 0 
                                                ? 'text-red-600 bg-red-50/80 dark:text-red-400 dark:bg-red-900/20' 
                                                : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10'
                                            }`}>
                                            {row.balanceToDate.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-16 bg-gray-50/50 dark:bg-zinc-900/30">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <SearchX size={48} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h4 className="text-xl font-black text-gray-700 dark:text-gray-300 mb-2">No Data Available</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                            We couldn't find any stock IN or OUT records for <span className="font-bold text-gray-700 dark:text-gray-300">{selectedDate}</span>. 
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}