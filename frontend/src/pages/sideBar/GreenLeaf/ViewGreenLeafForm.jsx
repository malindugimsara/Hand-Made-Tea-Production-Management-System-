import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Leaf, Factory, Users, Zap, AlertCircle, RefreshCw, Sun, Moon, ChevronRight, MoreVertical } from "lucide-react";
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

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import { useNavigate } from 'react-router-dom';

export default function ViewGreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teaType, setTeaType] = useState('All');
    const [dryerType, setDryerType] = useState('All');

    const navigate = useNavigate(); 

    // --- THEME STATE LOGIC ---
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

    // --- CUSTOM ANIMATED DROPDOWN STATE ---
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    
    useEffect(() => {
        fetchMergedRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMergedRecords = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders })
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) {
                throw new Error("Failed to fetch data. Check your login token.");
            }

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const glUsage = {};
            const labUsage = {};

            const mergedData = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                
                const glsForDate = greenLeafData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const labsForDate = labourData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                const gl = glsForDate[glUsage[dateStr]] || null;
                const lab = labsForDate[labUsage[dateStr]] || null;

                glUsage[dateStr]++;
                labUsage[dateStr]++;

                // --- Edited Logic Fix ---
                const getSafeTime = (item, field) => item && item[field] ? new Date(item[field]).getTime() : 0;
                const glCreated = getSafeTime(gl, 'createdAt');
                const glUpdated = getSafeTime(gl, 'updatedAt');
                const labCreated = getSafeTime(lab, 'createdAt');
                const labUpdated = getSafeTime(lab, 'updatedAt');

                const isGlEdited = glUpdated > 0 && glCreated > 0 && (glUpdated - glCreated > 5000);
                const isLabEdited = labUpdated > 0 && labCreated > 0 && (labUpdated - labCreated > 5000);
                const isEdited = isGlEdited || isLabEdited;

                let lastUpdatedDate = '';
                if (isEdited) {
                    const dates = [];
                    if (isGlEdited) dates.push(glUpdated);
                    if (isLabEdited) dates.push(labUpdated);
                    lastUpdatedDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
                }

                // --- Format Rolling Type ---
                let rType = 'M/R';
                if (lab && lab.rollingType) {
                    if (lab.rollingType === 'Machine Rolling') rType = 'M/R';
                    else if (lab.rollingType === 'Hand Rolling') rType = 'H/R';
                    else rType = lab.rollingType;
                }
                
                return {
                    date: dateStr,
                    isEdited,
                    lastUpdatedDate,
                    greenLeafId: gl ? gl._id : null,
                    productionId: prod._id, 
                    labourId: lab ? lab._id : null,
                    totalWeight: gl ? gl.totalWeight : 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    returnedWeight: gl ? gl.returnedWeight : 0,
                    teaType: prod.teaType || '-',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    dryerName: prod?.dryerDetails?.dryerName || '-',
                    meterStart: prod?.dryerDetails?.meterStart ?? '-',
                    meterEnd: prod?.dryerDetails?.meterEnd ?? '-',
                    units: prod?.dryerDetails?.units ?? 0,
                    dryerUpdatedDate: (prod?.dryerDetails?.dryerName && prod.updatedAt) 
                        ? new Date(prod.updatedAt).toISOString().split('T')[0] 
                        : '-',
                    workerCount: lab ? lab.workerCount : 0,
                    rollingType: rType,
                    rollingWorkerCount: (lab && lab.rollingType === 'Hand Rolling') ? lab.rollingWorkerCount : 0
                };
            });

            mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(mergedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const typeMatch = teaType === 'All' || record.teaType === teaType;
        const dryerMatch = dryerType === 'All' || record.dryerName === dryerType;
        return dateMatch && typeMatch && dryerMatch;
    });

    // Grouping Overlapped Dryer Records
    const groupMap = {};
    filteredRecords.forEach(r => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            if (!groupMap[key]) {
                groupMap[key] = { count: 0, uiColor: '', pdfColor: [] };
            }
            groupMap[key].count += 1;
        }
    });

    // Hex codes for jsPDF support, Tailwind classes for UI
    const highlightColors = [
        { ui: 'bg-green-200/80 dark:bg-green-900/40', pdf: '#bbf7d0' },
        { ui: 'bg-yellow-200/80 dark:bg-yellow-900/40', pdf: '#fef08a' },
        { ui: 'bg-purple-200/80 dark:bg-purple-900/40', pdf: '#e9d5ff' },
        { ui: 'bg-blue-200/80 dark:bg-blue-900/40', pdf: '#bfdbfe' },
        { ui: 'bg-pink-200/80 dark:bg-pink-900/40', pdf: '#fbcfe8' },
        { ui: 'bg-orange-200/80 dark:bg-orange-900/40', pdf: '#fed7aa' }
    ];
    let colorIndex = 0;

    Object.keys(groupMap).forEach(key => {
        if (groupMap[key].count > 1) {
            const colorObj = highlightColors[colorIndex % highlightColors.length];
            groupMap[key].uiColor = colorObj.ui;
            groupMap[key].pdfColor = colorObj.pdf;
            colorIndex++;
        }
    });

    // ACCURATE TOTAL CALCULATION
    const totalGL = filteredRecords.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
    const totalSelectedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.selectedWeight) || 0), 0);
    const totalReturnedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.returnedWeight) || 0), 0);
    const totalMadeTea = filteredRecords.reduce((sum, r) => sum + (Number(r.madeTeaWeight) || 0), 0);
    const totalSelectionLabour = filteredRecords.reduce((sum, r) => sum + (Number(r.workerCount) || 0), 0);
    const totalHandRollingLabour = filteredRecords.reduce((sum, r) => sum + (Number(r.rollingWorkerCount) || 0), 0);

    const totalUnits = filteredRecords.reduce((sum, r) => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            const count = groupMap[key]?.count || 1;
            return sum + ((Number(r.units) || 0) / count);
        }
        return sum + (Number(r.units) || 0);
    }, 0);

    const handleEditClick = (record) => {
        navigate('/edit-record', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const { greenLeafId, productionId, labourId } = recordToDelete;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const promises = [];
            if (greenLeafId) promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${greenLeafId}`, { method: 'DELETE', headers: authHeaders }));
            if (productionId) promises.push(fetch(`${BACKEND_URL}/api/production/${productionId}`, { method: 'DELETE', headers: authHeaders }));
            if (labourId) promises.push(fetch(`${BACKEND_URL}/api/labour/${labourId}`, { method: 'DELETE', headers: authHeaders }));

            await Promise.all(promises);
            toast.success("Record deleted successfully!", { id: toastId });
            fetchMergedRecords(); 
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // -------------------------------------------------------------
    // PREPARE PDF DATA
    // -------------------------------------------------------------
    const getPdfData = () => {
        const tableRows = filteredRecords.map(record => {
            let displayUnits = record.units;
            let rowColor = null;

            if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                const key = `${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                const groupInfo = groupMap[key];
                if (groupInfo && groupInfo.count > 1) {
                    const adjustedUnits = Number(record.units) / groupInfo.count;
                    displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                    rowColor = groupInfo.pdfColor; 
                }
            }

            const pdfDryerName = record.dryerName !== '-' 
                ? `${record.dryerName}\n(${record.dryerUpdatedDate})` 
                : '-';

            const pdfDateCell = record.isEdited ? `${record.date}\n(Edited: ${record.lastUpdatedDate})` : record.date;
            
            const rollingText = record.rollingType === 'H/R' 
                ? `H/R\n(${record.rollingWorkerCount} wkrs)` 
                : record.rollingType;

            return {
                data: [
                    pdfDateCell,
                    record.totalWeight,
                    record.selectedWeight,
                    record.returnedWeight > 0 ? record.returnedWeight : '-',
                    record.teaType,
                    record.madeTeaWeight,
                    pdfDryerName,
                    record.meterStart,
                    record.meterEnd,
                    displayUnits !== '-' ? displayUnits : '-',
                    record.workerCount !== '-' ? record.workerCount : '-',
                    rollingText
                ],
                fillColor: rowColor 
            };
        });

        tableRows.push({
            data: [
                "GRAND TOTAL",
                totalGL.toFixed(2),
                totalSelectedGL.toFixed(2),
                totalReturnedGL.toFixed(2),
                "-",
                totalMadeTea.toFixed(3),
                "-",
                "-",
                "-",
                Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2),
                totalSelectionLabour,
                totalHandRollingLabour > 0 ? `${totalHandRollingLabour} (H/R)` : '-'
            ],
            isFooter: true
        });

        return tableRows;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="p-8 max-w-[1500px] mx-auto font-sans relative">
                
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2"> <Leaf size={28} /> Daily Production Log</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Master overview of Green Leaf, Production, & Labour</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <PDFDownloader 
                            title="Daily Production Log"
                            subtitle={`Filters Applied -> Date: ${startDate || 'All'} to ${endDate || 'All'} | Tea: ${teaType} | Dryer: ${dryerType}`}
                            headers={["Date", "Received GL", "Selected GL", "Return GL", "Tea Type", "Made Tea", "Dryer", "Start Meter", "End Meter", "Units", "Sel. Lab", "Rolling"]}
                            data={getPdfData()} 
                            fileName={`Production_Log_${new Date().toISOString().split('T')[0]}.pdf`}
                            orientation="landscape"
                            disabled={loading || filteredRecords.length === 0}
                        />

                        <button 
                            onClick={fetchMergedRecords}
                            disabled={loading}
                            className={`px-4 py-2.5 bg-white dark:bg-zinc-800 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-700'}`}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Sync Data
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">FROM DATE</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">TO DATE</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">TEA TYPE</label>
                        <select value={teaType} onChange={(e) => setTeaType(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors">
                            <option value="All">All Types</option>
                            <option value="Purple Tea">Purple Tea</option>
                            <option value="Pink Tea">Pink Tea</option>
                            <option value="White Tea">White Tea</option>
                            <option value="Silver Tips">Silver Tips</option>
                            <option value="Silver Green">Silver Green</option>
                            <option value="VitaGlow Tea">VitaGlow Tea</option>
                            <option value="Slim Beauty">Slim Beauty</option>
                            <option value="Golden Tips">Golden Tips</option>
                            <option value="Flower">Flower</option>
                            <option value="Chakra">Chakra</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">DRYER</label>
                        <select value={dryerType} onChange={(e) => setDryerType(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors">
                            <option value="All">All Dryers</option>
                            <option value="Dryer 1">Dryer 1</option>
                            <option value="Dryer 2">Dryer 2</option>
                        </select>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-300 dark:border-zinc-800 overflow-hidden self-start w-full max-w-full transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-[#8CC63F] dark:border-green-700 border-t-[#1B6A31] dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading production records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-300 dark:border-zinc-800 transition-colors">
                                        <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-300 dark:border-zinc-800 align-bottom w-24">Date</th>
                                        <th colSpan="3" className="px-4 py-2 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-300 dark:border-zinc-800 bg-[#8CC63F]/10 dark:bg-green-900/20 text-center">
                                            <div className="flex items-center justify-center gap-1"><Leaf size={14}/> Raw Material (kg)</div>
                                        </th>
                                        <th colSpan="2" className="px-4 py-2 font-bold text-purple-700 dark:text-purple-400 border-r border-gray-300 dark:border-zinc-800 bg-purple-50 dark:bg-purple-900/20 text-center">
                                            <div className="flex items-center justify-center gap-1"><Factory size={14}/> Output</div>
                                        </th>
                                        <th colSpan="4" className="px-4 py-2 font-bold text-orange-700 dark:text-orange-400 border-r border-gray-300 dark:border-zinc-800 bg-orange-50 dark:bg-orange-900/20 text-center">
                                            <div className="flex items-center justify-center gap-1"><Zap size={14}/> Machine Usage</div>
                                        </th>
                                        
                                        <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-300 dark:border-zinc-800 bg-blue-50 dark:bg-blue-900/30 text-center">
                                            <div className="flex items-center justify-center gap-1"><Users size={14}/> Labour Info</div>
                                        </th>
                                        
                                        {!isViewer && (
                                            <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50 dark:bg-zinc-950/50">Action</th>
                                        )}
                                    </tr>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-xs border-b border-gray-300 dark:border-zinc-800">
                                        <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 dark:bg-green-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Received</th>
                                        <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 dark:bg-green-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Selected</th>
                                        <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 dark:bg-green-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Return</th>
                                        
                                        <th className="px-3 py-2 font-medium bg-purple-50/50 dark:bg-purple-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Type</th>
                                        <th className="px-3 py-2 font-medium bg-purple-50/50 dark:bg-purple-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Made (kg)</th>
                                        
                                        <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Dryer</th>
                                        <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Start</th>
                                        <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-900/10 text-center border-r border-gray-300 dark:border-zinc-800">End</th>
                                        <th className="px-3 py-2 font-medium bg-orange-50/50 dark:bg-orange-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Units</th>

                                        <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Selection</th>
                                        <th className="px-3 py-2 font-medium bg-blue-50/50 dark:bg-blue-900/10 text-center border-r border-gray-300 dark:border-zinc-800">Rolling</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-300 dark:divide-zinc-800">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => {
                                            let isShared = false;
                                            let highlightClass = '';
                                            let displayUnits = record.units;

                                            if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                                                const key = `${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                                                const groupInfo = groupMap[key];
                                                
                                                if (groupInfo && groupInfo.count > 1) {
                                                    isShared = true;
                                                    highlightClass = groupInfo.uiColor;
                                                    const adjustedUnits = Number(record.units) / groupInfo.count;
                                                    displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                                                }
                                            }

                                            return (
                                                <tr key={record.productionId} className={`transition-colors group ${isShared ? highlightClass : 'hover:bg-gray-50/80 dark:hover:bg-zinc-800/50'}`}>
                                                    <td className="px-4 py-3 border-r border-gray-300 dark:border-zinc-800 align-top">
                                                        <div className="flex flex-col items-start gap-1 mt-1">
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{record.date}</span>
                                                            {record.isEdited && (
                                                                <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 px-1.5 py-0.5 rounded font-bold w-max">
                                                                    Edited: {record.lastUpdatedDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-300 border-r border-gray-300 dark:border-zinc-800 align-top">
                                                        <div className="mt-1">{record.totalWeight}</div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 align-top">
                                                        <div className="mt-1"><span className="px-2 py-1 rounded-full bg-[#8CC63F]/20 dark:bg-[#8CC63F]/30 text-[#1B6A31] dark:text-[#8CC63F] font-bold text-xs">{record.selectedWeight}</span></div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 text-gray-500 dark:text-gray-400 align-top">
                                                        <div className="mt-1">{record.returnedWeight > 0 ? record.returnedWeight : '-'}</div>
                                                    </td>
                                                    
                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 align-top">
                                                        <div className="mt-1">{record.teaType !== '-' ? <span className="text-purple-700 dark:text-purple-300 font-medium text-xs bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-200 dark:border-purple-800/50">{record.teaType}</span> : '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 align-top">
                                                        <div className="mt-1"><span className="font-bold text-gray-800 dark:text-gray-200">{record.madeTeaWeight}</span></div>
                                                    </td>
                                                    
                                                    <td className="px-3 py-2 text-center border-r border-gray-300 dark:border-zinc-800">
                                                        {record.dryerName !== '-' ? (
                                                            <div className="flex flex-col items-center mt-1">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300 leading-tight">{record.dryerName}</span>
                                                                <span className="text-[9px] text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded mt-0.5 shadow-sm font-bold whitespace-nowrap">
                                                                    {record.dryerUpdatedDate}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-600 mt-1 block">-</span>
                                                        )}
                                                    </td>

                                                    <td className={`px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 text-xs align-top ${isShared ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        <div className="mt-1">{record.meterStart}</div>
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 text-xs align-top ${isShared ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        <div className="mt-1">{record.meterEnd}</div>
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 align-top ${isShared ? '' : ''}`}>
                                                        <div className="mt-1">{record.units !== '-' ? <span className={`font-bold ${isShared ? 'text-gray-900 dark:text-white' : 'text-orange-600 dark:text-orange-400'}`}>{displayUnits}</span> : '-'}</div>
                                                    </td>

                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 bg-blue-50/10 dark:bg-blue-900/10 align-top">
                                                        <div className="mt-1 font-bold text-blue-700 dark:text-blue-400">{record.workerCount !== '-' ? record.workerCount : '-'}</div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-300 dark:border-zinc-800 bg-blue-50/10 dark:bg-blue-900/10 align-top">
                                                        <div className="flex flex-col items-center gap-0.5 mt-1">
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                                {record.rollingType === 'Hand Rolling' 
                                                                    ? 'H/R' 
                                                                    : (record.rollingType === 'Machine Rolling' ? 'M/R' : record.rollingType)
                                                                }
                                                            </span>
                                                            {record.rollingWorkerCount > 0 && (
                                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">
                                                                    {record.rollingWorkerCount} wkrs
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    
                                                    {!isViewer && (
                                                        <td className={`px-3 py-3 text-center align-top ${isShared ? '' : 'bg-white dark:bg-zinc-900'}`}>
                                                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                                                <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-zinc-800 rounded transition-all">
                                                                    <MdOutlineEdit size={20} />
                                                                </button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all">
                                                                            <MdOutlineDeleteOutline size={20} />
                                                                        </button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md">
                                                                        <AlertDialogHeader>
                                                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                                                                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                                            </div>
                                                                            <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Production Record</AlertDialogTitle>
                                                                            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                                                                Are you sure you want to permanently delete data for <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">{record.date}</span>?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter className="mt-6">
                                                                            <AlertDialogCancel onClick={() => setRecordToDelete(null)} className="border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-6 font-semibold">Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors">Delete Record</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={isViewer ? "12" : "13"} className="p-16 text-center text-gray-400 dark:text-gray-500">
                                                <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-lg font-medium">No records found matching filters</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                                {/* --- TOTAL ROW --- */}
                                {filteredRecords.length > 0 && (
                                    <tfoot className="bg-gray-100/90 dark:bg-zinc-900/90 border-t-[3px] border-gray-400 dark:border-zinc-700 font-black text-gray-900 dark:text-white text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                                        <tr>
                                            <td className="px-4 py-4 border-r border-gray-300 dark:border-zinc-800 text-right uppercase tracking-wider text-sm">Total</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-[#1B6A31] dark:text-green-500 text-base">{totalGL.toFixed(2)}</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-[#1B6A31] dark:text-green-500 text-base">{totalSelectedGL.toFixed(2)}</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-gray-600 dark:text-gray-400 text-base">{totalReturnedGL.toFixed(2)}</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800">-</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-purple-700 dark:text-purple-400 text-base">{totalMadeTea.toFixed(3)}</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800">-</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800">-</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800">-</td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-orange-600 dark:text-orange-500 text-base">
                                                {Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2)}
                                            </td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-blue-700 dark:text-blue-500 text-base">{totalSelectionLabour}</td>
                                            <td className="px-3 py-4 border-r border-gray-300 dark:border-zinc-800 text-blue-700 dark:text-blue-500 text-base">{totalHandRollingLabour > 0 ? `${totalHandRollingLabour} (H/R)` : '-'}</td>
                                            
                                            {!isViewer && (
                                                <td className="px-3 py-4"></td>
                                            )}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}