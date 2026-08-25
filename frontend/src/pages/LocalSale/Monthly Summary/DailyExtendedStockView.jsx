import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Share2, RefreshCw, FileText, Box, SearchX, Image, FileDown } from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";
import PDFDownloader from '@/components/PDFDownloader';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function DailyExtendedStockView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const [monthData, setMonthData] = useState({
        currBalances: null,
        ins: null,
        outs: null
    });

    // 💡 WhatsApp Dropdown State & Ref
    const [isWaMenuOpen, setIsWaMenuOpen] = useState(false);
    const waMenuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (waMenuRef.current && !waMenuRef.current.contains(event.target)) {
                setIsWaMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

        // 💡 1. Exact list with custom 'sortOrder' and new Pitigala order/display sizes
        const productCategories = [
            // --- Typical Tea ---
            { categoryId: 'athukorala', size: '400g', name: 'Athukorala BOPF 400g', group: 'Main', sortOrder: 1 },
            { categoryId: 'athukorala', size: '200g', name: 'Athukorala BOPF 200g', group: 'Main', sortOrder: 2 },
            { categoryId: 'athukorala', size: '100g', name: 'Athukorala BOPF 100g', group: 'Main', sortOrder: 3 },

            { categoryId: 'bopfSp', size: '400g', name: 'Athukorala BOPF SP 400g', group: 'Main', sortOrder: 4 },
            { categoryId: 'bopfSp', size: '200g', name: 'Athukorala BOPF SP 200g', group: 'Main', sortOrder: 5 },

            { categoryId: 'bopfPremium', size: '400g', name: 'Athukorala BOPF PREMIUM 400g', group: 'Main', sortOrder: 6 },
            { categoryId: 'bopfPremium', size: '200g', name: 'Athukorala BOPF PREMIUM 200g', group: 'Main', sortOrder: 7 },

            // --- Requested Pitigala Order & Gram Sizes ---
            { categoryId: 'pitigala', size: '200g', name: 'Pitigala tea 200g', group: 'Main', sortOrder: 8 },
            { categoryId: 'pitigala', size: '400g', name: 'Pitigala tea 400g', group: 'Main', sortOrder: 9 },
            { categoryId: 'tb', size: '25', name: 'Pitigala tea 25 bag', displaySize: '50g', group: 'Main', sortOrder: 10 },
            { categoryId: 'tb', size: '50', name: 'Pitigala tea 50 bag', displaySize: '100g', group: 'Main', sortOrder: 11 },
            { categoryId: 'tb', size: '100', name: 'Pitigala tea 100 bag', displaySize: '200g', group: 'Main', sortOrder: 12 },

            { categoryId: 'gt', size: '200g', name: 'Green tea 200g', group: 'Main', sortOrder: 13 },
            { categoryId: 'gt', size: 'T/B 25', name: 'Green tea 25 bag', displaySize: '50g', group: 'Main', sortOrder: 14 },

            // --- Other Tea Types & Grades ---
            { categoryId: 'others', size: 'BOPF', name: 'BOPF', displaySize: 'KG', group: 'Other', sortOrder: 99 },
            { categoryId: 'others', size: 'DUST', name: 'DUST', displaySize: 'KG', group: 'Other', sortOrder: 99 },
            { categoryId: 'others', size: 'DUST 1', name: 'DUST 1', displaySize: 'KG', group: 'Other', sortOrder: 99 }
        ];

        // 💡 2. Auto-Correction Key Generator
        const generateKey = (catId, catTitle, size) => {
            let cleanId = (catId || '').toLowerCase().trim();
            let cleanTitle = (catTitle || '').toLowerCase().trim();
            let cleanSize = (size || '').toLowerCase().trim();

            if (!cleanId && cleanTitle) {
                cleanId = cleanTitle;
            }

            // Standardize IDs
            if (cleanId === 'g/t' || cleanTitle === 'g/t' || cleanId.includes('green')) cleanId = 'gt';
            if (cleanId === 'bopf premium' || cleanId === 'bopfpremium') cleanId = 'bopfPremium';
            if (cleanId === 'bopf sp' || cleanId === 'bopfsp' || cleanId === 'bopf sp.') cleanId = 'bopfSp';
            if (cleanId === 'pitigala tea' || cleanId === 'pitigala') cleanId = 'pitigala';
            if (cleanId === 't/b' || cleanId === 'tb') cleanId = 'tb';
            if (cleanId === 'other grades' || cleanTitle === 'other grades') cleanId = 'others';

            // Standardize Sizes
            if (cleanSize === 'bopf (kg)' || cleanSize === 'kg') cleanSize = 'bopf';
            if (cleanSize === 'dust (kg)') cleanSize = 'dust';
            if (cleanSize === 'dust 1 (kg)') cleanSize = 'dust 1';

            // Match DB tea bags to the base sizes
            if (cleanId === 'tb') {
                if (cleanSize.includes('25')) cleanSize = '25';
                if (cleanSize.includes('50')) cleanSize = '50';
                if (cleanSize.includes('100')) cleanSize = '100';
            }

            return `${cleanId}_${cleanSize}`;
        };

        // 💡 3. Pre-fill Map with Standard Categories
        productCategories.forEach(cat => {
            const key = generateKey(cat.categoryId, cat.name, cat.size);
            dataMap[key] = {
                categoryId: cat.categoryId,
                displayTitle: cat.name,
                size: cat.displaySize || cat.size,
                group: cat.group,
                sortOrder: cat.sortOrder, // Add sort order to map
                openingBalance: 0,
                inToday: 0,
                cumulativeIn: 0,
                outSoldToday: 0,
                cumulativeOutSold: 0,
                outIssueToday: 0,
                cumulativeOutIssue: 0,
                issueBreakdown: { labour: 0, staff: 0, free: 0 },
                balanceToDate: 0
            };
        });

        // 💡 4. Initialize Function for Dynamic Database Items
        const initItem = (categoryId, categoryTitle, size) => {
            const key = generateKey(categoryId, categoryTitle, size);

            // If an unknown item comes from the database, push it to 'Other' group
            if (!dataMap[key]) {
                dataMap[key] = {
                    categoryId: categoryId || 'Unknown',
                    displayTitle: categoryTitle || categoryId || 'Unknown Product',
                    size: size || '-',
                    group: 'Other', // Always classify extra DB items as "Other"
                    sortOrder: 100, // Put unknown items at the very bottom
                    openingBalance: 0,
                    inToday: 0,
                    cumulativeIn: 0,
                    outSoldToday: 0,
                    cumulativeOutSold: 0,
                    outIssueToday: 0,
                    cumulativeOutIssue: 0,
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

        // A. Map Opening Balance
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

        // 💡 5. Calculate Final Balances, Filter, and Sort
        return Object.values(dataMap)
            .map(row => {
                row.balanceToDate = row.openingBalance + row.cumulativeIn - row.cumulativeOutSold;
                return row;
            })
            .filter(row => {
                // 1. Always show Typical Teas
                if (row.group === 'Main') return true;

                // 2. For Other Tea Types, only show if they have available stock OR had activity today
                const hasStock = row.balanceToDate !== 0 || row.openingBalance !== 0;
                const hasActivity = row.inToday > 0 || row.outSoldToday > 0 || row.outIssueToday > 0;

                return hasStock || hasActivity;
            })
            .sort((a, b) => {
                // Group sorting (Main first, then Other)
                if (a.group !== b.group) {
                    return a.group === 'Main' ? -1 : 1;
                }
                // Use custom sortOrder to bypass alphabetical sorting
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }
                // Fallback for dynamically generated "Other" items
                return a.displayTitle.localeCompare(b.displayTitle);
            });

    }, [selectedDate, monthData]);

    const handleSync = () => {
        fetchMonthData(selectedMonth);
    };

    // 💡 --- DIRECT SHARE ON WHATSAPP (ONLY IMAGE NOW) ---
    // මෙහි PDF share කිරීමේ කොටස ඉවත් කර ඇත. PDF share කිරීම සඳහා PDFDownloader භාවිතා වේ.
    const shareImageOnWhatsApp = async () => {
        setIsWaMenuOpen(false);
        if (tableData.length === 0) {
            toast.error("No records available to share.");
            return;
        }

        const toastId = toast.loading(`Preparing IMAGE for WhatsApp...`);

        try {
            const printElement = document.getElementById('stock-print-area');
            const imgFooter = document.getElementById('sys-image-footer');
            if (imgFooter) imgFooter.style.display = 'block';

            printElement.style.display = "block";
            printElement.style.position = "absolute";
            printElement.style.top = "-9999px";

            const canvas = await html2canvas(printElement, { 
                scale: 3, 
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false
            });

            printElement.style.display = "none"; 
            if (imgFooter) imgFooter.style.display = 'none'; // ආපසු සැඟවීම

            let file;
            let fileName = `Daily_Stock_${selectedDate}`;

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Daily Stock Report',
                    text: `Daily IN/OUT & Balance Report - ${selectedDate}`,
                    files: [file]
                });
                toast.success("Shared successfully!", { id: toastId });
            } else {
                const fileUrl = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(fileUrl);
                
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Here is the Daily Stock Report for ${selectedDate}. Please attach the downloaded file.`)}`;
                window.open(whatsappUrl, '_blank');
                toast.success("File downloaded. Please attach it in WhatsApp.", { id: toastId });
            }
        } catch (error) {
            console.error("WhatsApp Share Error: ", error);
            toast.error("Failed to share file.", { id: toastId });
        }
    };

    const getMonthName = () => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (!selectedMonth) return "Month";
        const mIndex = parseInt(selectedMonth.split('-')[1], 10) - 1;
        return months[mIndex] || "Month";
    };

    // Modified PDF Export to include separators
    const getPdfData = () => {
        const rows = [];
        let currentGroup = null;

        tableData.forEach(row => {
            // Add Separator Row in PDF
            if (currentGroup !== row.group) {
                currentGroup = row.group;
                rows.push([
                    {
                        content: currentGroup === 'Main' ? 'TEA PACKS' : 'Other Tea Types & Grades',
                        colSpan: 7,
                        styles: { fillColor: [243, 244, 246], fontStyle: 'bold', textColor: [75, 85, 99], halign: 'left' }
                    }
                ]);
            }

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
                { content: 'FREE ISSUE', styles: { halign: 'center', textColor: [102, 163, 191] } }
            ]
        ],
        headStyles: {
            fillColor: [217, 239, 189],
            lineColor: [191, 201, 209],
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
            4: { halign: 'center', textColor: [102, 163, 191] },
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
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">View daily product records with accurate closing balance.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <PDFDownloader
                        title={`Daily IN/OUT & Balance Report - ${selectedDate}`}
                        subtitle={`Opening Balance as of 1st ${getMonthName()}`}
                        headers={["Category / Title", "Size / Type", "Opening Balance", "OUT (Sold)", "OUT (Free Issue)", "IN", "Balance To Date"]}
                        data={getPdfData()}
                        uniqueCode={uniqueCode}
                        fileName={`Daily_Stock_${selectedDate}.pdf`}
                        orientation="portrait"
                        disabled={loading || tableData.length === 0}
                        autoTableOptions={pdfTableConfig}
                    />
                    
                    {/* 💡 WhatsApp Share Dropdown Button */}
                    {/* 💡 WhatsApp Share Dropdown Button */}
                    <div className="relative flex-1 sm:flex-none" ref={waMenuRef}>
                        <button
                            onClick={() => setIsWaMenuOpen(!isWaMenuOpen)}
                            disabled={loading || tableData.length === 0}
                            className="w-full h-full p-2.5 px-3 sm:px-4 justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <FaWhatsapp size={18} /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">Share WhatsApp</span>
                        </button>
                        
                        {isWaMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 overflow-hidden z-50 animate-in slide-in-from-top-2">
                            <button onClick={shareImageOnWhatsApp} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3">
                                <Image size={18} className="text-[#25D366]" /> Share Image
                            </button>
                            
                            {/* 💡 අලුත් Share PDF ක්‍රමය (PDFDownloader භාවිතා කර ඇත) */}
                            <PDFDownloader
                                title={`Daily IN/OUT & Balance Report - ${selectedDate}`}
                                subtitle={`Opening Balance as of 1st ${getMonthName()}`}
                                headers={["Category / Title", "Size / Type", "Opening Balance", "OUT (Sold)", "OUT (Free Issue)", "IN", "Balance To Date"]}
                                data={getPdfData()}
                                uniqueCode={uniqueCode}
                                fileName={`Daily_Stock_${selectedDate}.pdf`}
                                orientation="portrait"
                                disabled={loading || tableData.length === 0}
                                autoTableOptions={pdfTableConfig}
                                isWhatsApp={true} // <-- WhatsApp වලට යැවීමට
                                onActionStart={() => setIsWaMenuOpen(false)} // <-- Menu එක Close කිරීමට
                                customButton={ // <-- Dropdown style Button එකක් ලබා දීමට
                                    <button className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3 border-t border-gray-100 dark:border-zinc-700">
                                        <FileText size={18} className="text-red-500" /> Share PDF
                                    </button>
                                }
                            />
                            </div>
                        )}
                    </div>

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
                    <span className="text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                        {tableData.length} Items
                    </span>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-16 text-green-600 dark:text-green-500">
                        <RefreshCw className="animate-spin mb-4" size={40} />
                        <p className="font-bold text-lg">Loading data for {selectedDate}...</p>
                        <p className="text-sm text-gray-500 mt-2">Please wait while we sync the records.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 text-[10px] uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                                    <th rowSpan="2" className="px-6 py-4 font-black">Category / Title</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black">Size / Type</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center bg-gray-50 dark:bg-zinc-800/50">
                                        Opening Balance<br />
                                        <span className="text-[9px] font-medium text-gray-400 capitalize">({getMonthName()} 1st)</span>
                                    </th>
                                    <th colSpan="2" className="px-6 py-2 font-black text-center text-red-500 border-b border-gray-200 dark:border-zinc-800">
                                        OUT (Today)
                                    </th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center text-green-600 bg-green-50/30 dark:bg-green-900/10">IN (Today)</th>
                                    <th rowSpan="2" className="px-6 py-4 font-black text-center bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400">
                                        Balance<br />To Date
                                    </th>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 text-[10px] uppercase text-red-500 tracking-wider">
                                    <th className="px-4 py-2 font-bold text-center bg-red-50/30 dark:bg-red-900/10">Sold</th>
                                    <th className="px-4 py-2 font-bold text-center bg-red-50/30 dark:bg-red-900/10">Free Issue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {tableData.map((row, idx) => {
                                    const isNewGroup = idx === 0 || tableData[idx - 1].group !== row.group;

                                    return (
                                        <React.Fragment key={idx}>
                                            {isNewGroup && (
                                                <tr className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                                                    <td colSpan="7" className="px-6 py-2.5 text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                                        {row.group === 'Main' ? 'TEA PACKS' : 'Other Tea Types & Grades'}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
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

                                                <td className={`px-6 py-4 font-black text-center ${row.balanceToDate < 0
                                                        ? 'text-red-600 bg-red-50/80 dark:text-red-400 dark:bg-red-900/20'
                                                        : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10'
                                                    }`}>
                                                    {row.balanceToDate.toFixed(2)}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 💡 HIDDEN PRINT AREA (100% MATCHED TO PDF DESIGN) */}
            <div id="stock-print-area" className="bg-[#ffffff] p-10 font-sans text-[#000000]" style={{ width: '1000px', display: 'none' }}>
                
                {/* --- PDF Header Section Match --- */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start gap-4">
                        {/* Logo */}
                        <img src="/logo.png" alt="Logo" className="w-[85px] h-[85px] object-contain mt-1" onError={(e) => e.target.style.display = 'none'} />
                        <div className="mt-2">
                            {/* PDF Titles */}
                            <h1 className="text-[22px] text-[#1B6A31]">Daily IN/OUT & Balance Report - {selectedDate}</h1>
                            <h2 className="text-[14px] text-[#646464] mt-1">Opening Balance as of 1st {getMonthName()}</h2>
                        </div>
                    </div>
                    {/* PDF Document Ref Details */}
                    <div className="text-right text-[12px] text-[#969696] mt-2 font-semibold">
                        <p>Doc Ref: {uniqueCode}</p>
                        <p>Generated: {new Date().toLocaleString()}</p>
                    </div>
                </div>

                {/* --- PDF Table Match --- */}
                <table className="w-full border-collapse border border-[#BFC9D1] text-[12px]">
                    <thead className="bg-[#D9EFBD]">
                        {/* Top Header Row matched to autoTable options */}
                        <tr className="text-[#6B7280]">
                            <th rowSpan={2} className="border border-[#BFC9D1] p-2 text-center align-middle font-bold uppercase">Category / Title</th>
                            <th rowSpan={2} className="border border-[#BFC9D1] p-2 text-center align-middle font-bold uppercase">Size / Type</th>
                            <th rowSpan={2} className="border border-[#BFC9D1] p-2 text-center align-middle font-bold uppercase">Opening Balance<br/>({getMonthName()} 1st)</th>
                            <th colSpan={2} className="border border-[#BFC9D1] p-2 text-center font-bold text-[#EF4444] uppercase">OUT (Today)</th>
                            <th rowSpan={2} className="border border-[#BFC9D1] p-2 text-center align-middle font-bold text-[#149352] uppercase">IN (Today)</th>
                            <th rowSpan={2} className="border border-[#BFC9D1] p-2 text-center align-middle font-bold text-[#4338CA] uppercase">Balance<br/>To Date</th>
                        </tr>
                        <tr>
                            <th className="border border-[#BFC9D1] p-2 text-center font-bold text-[#EF4444] uppercase">Sold</th>
                            <th className="border border-[#BFC9D1] p-2 text-center font-bold text-[#66A3BF] uppercase">Free Issue</th>
                        </tr>
                    </thead>
                    <tbody className="text-center">
                        {tableData.map((row, idx) => {
                            const isNewGroup = idx === 0 || tableData[idx - 1].group !== row.group;
                            return (
                                <React.Fragment key={idx}>
                                    {/* Separator Row inside PDF */}
                                    {isNewGroup && (
                                        <tr className="bg-[#F3F4F6]">
                                            <td colSpan="7" className="border border-[#BFC9D1] p-2 text-left font-bold text-[#4B5563] uppercase">
                                                {row.group === 'Main' ? 'TEA PACKS' : 'Other Tea Types & Grades'}
                                            </td>
                                        </tr>
                                    )}
                                    {/* Data Row */}
                                    <tr>
                                        <td className="border border-[#BFC9D1] p-2 text-left font-bold text-[#000000]">{row.displayTitle}</td>
                                        <td className="border border-[#BFC9D1] p-2 text-[#000000]">{row.size}</td>
                                        <td className="border border-[#BFC9D1] p-2 text-[#000000]">{row.openingBalance !== 0 ? row.openingBalance.toFixed(2) : '-'}</td>
                                        
                                        <td className="border border-[#BFC9D1] p-2 text-[#DC2626]">
                                            {row.outSoldToday > 0 ? row.outSoldToday.toFixed(2) : '-'}
                                        </td>
                                        
                                        <td className="border border-[#BFC9D1] p-2 text-[#66A3BF]">
                                            {row.outIssueToday > 0 ? row.outIssueToday.toFixed(2) : '-'}
                                        </td>
                                        
                                        <td className="border border-[#BFC9D1] p-2 text-[#22C55E]">
                                            {row.inToday > 0 ? row.inToday.toFixed(2) : '-'}
                                        </td>
                                        
                                        <td className={`border border-[#BFC9D1] p-2 font-bold ${row.balanceToDate < 0 ? 'text-[#DC2626]' : 'text-[#4338CA]'}`}>
                                            {row.balanceToDate.toFixed(2)}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {/* --- PDF Signature Section Match --- */}
                <div className="mt-14 flex justify-between items-end text-[13px]">
                    <div>
                        <p className="text-[#646464]">Generated By:</p>
                        <p className="font-bold text-[#1E1E1E] mt-1">
                            {localStorage.getItem('username') || localStorage.getItem('userName') || 'System User'} ({localStorage.getItem('userRole') || localStorage.getItem('role') || 'Authorized User'})
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[#646464]">.................................................................</p>
                        <p className="text-[#1E1E1E] mt-1 pr-6 font-semibold">Checked By / Signature</p>
                    </div>
                </div>
                
                {/* PDF Footer Match */}
                <div id="sys-image-footer" className="mt-10 text-center text-[10px] text-[#808080] font-sans" style={{ display: 'none' }}>
                    Page 1 of 1 - Generated by Unified Management System
                </div>
            </div>

        </div>
    );
}